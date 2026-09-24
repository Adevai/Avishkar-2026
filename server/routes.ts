import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { query, pool } from './db';
import { ASSESSMENT_QUESTIONS, COLLEGE_DEPARTMENT_STATS, GOVT_REGIONAL_STATS, EMERGING_SKILL_TRENDS } from '../src/data/mockData';
import { calculateJobMatch } from '../src/utils/matchCalculator';
import { askCopilot } from '../src/utils/geminiService';
import { extractSkillsFromText } from './nlpEngine';
import { sendOtpEmail, sendRegistrationOtpEmail, sendPasswordResetSuccessEmail, sendSecurityAlertEmail } from './emailService';
import { hashPassword, comparePassword, signToken, requireAuth } from './auth';
import { verifyInstitutionServer } from './institutionVerify';
import { aggregateJobs } from './jobAggregator';
import { addClient, removeClient, emitEvent, connectedClients } from './events';
import { createWorker } from 'tesseract.js';
import { VERIFIED_INSTITUTIONS } from '../src/data/institutions';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

export const router = Router();

// ==========================================
// 0. SERVER-SENT EVENTS (REAL-TIME PUSH)
// ==========================================
router.get('/events', (req: Request, res: Response) => {
  // SSE headers — no buffering, keep the connection open
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

  const clientId = addClient(res, (req.query.userId as string) || null);
  req.on('close', () => removeClient(clientId));
});

// ==========================================
// 0b. INSTITUTION / COLLEGE VERIFICATION
// ==========================================
// Server-side proxy for open institution-registry APIs. The upstreams send no
// Access-Control-Allow-Origin header, so browser fetches fail CORS — the client
// now calls this endpoint instead. Failures degrade gracefully (empty results).
router.get('/institutions/external', async (req: Request, res: Response) => {
  const source = String(req.query.source || 'hipolabs');
  const name = String(req.query.name || req.query.q || '').trim();
  if (name.length < 2) {
    return res.json({ results: [] });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    let upstream: string;
    if (source === 'aicte') {
      upstream = `https://indian-colleges-list.vercel.app/api/institutions/search?state=Maharashtra&q=${encodeURIComponent(name)}`;
    } else {
      upstream = `http://universities.hipolabs.com/search?country=India&name=${encodeURIComponent(name)}`;
    }
    const upstreamRes = await fetch(upstream, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!upstreamRes.ok) {
      return res.json({ results: [] });
    }
    const data: any = await upstreamRes.json();
    // Normalize both upstream shapes to { results: [...] } for the client
    const results: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];
    return res.json({ results: results.slice(0, 15) });
  } catch {
    // Upstream down/timed out — empty result set, the local registry still works
    return res.json({ results: [] });
  }
});

router.post('/verify/institution', async (req: Request, res: Response) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Institution name is required.' });
  }

  const result = verifyInstitutionServer(name);

  await query(
    `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
    ['registration-flow', 'INSTITUTION_VERIFIED', JSON.stringify({ query: name, level: result.level, confidence: result.confidence })]
  ).catch(() => {});

  // Non-verified results enter the manual review queue for govt officers
  if (result.level !== 'verified') {
    await query(
      `INSERT INTO verification_reviews (
        id, kind, submitted_value, level, confidence, matched_name, accreditation, details
      ) VALUES ($1, 'institution', $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING`,
      [
        `vr-inst-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
        name,
        result.level,
        result.confidence,
        result.matchedName || null,
        result.accreditation || null,
        JSON.stringify({ note: result.note, at: new Date() }),
      ]
    ).catch(() => {});
  }

  res.json({ success: true, verification: result });
});

// ==========================================
// 0c. MANUAL VERIFICATION REVIEW QUEUE (GOVT DASHBOARD)
// ==========================================
router.get('/verification-queue', requireAuth, async (req: Request, res: Response) => {
  const { status, kind } = req.query;
  try {
    const params: any[] = [];
    const conditions: string[] = [];
    if (status && status !== 'all') { params.push(status); conditions.push(`status = $${params.length}`); }
    if (kind && kind !== 'all') { params.push(kind); conditions.push(`kind = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT * FROM verification_reviews ${where} ORDER BY created_at DESC LIMIT 200`,
      params
    );

    const counts = await query(
      `SELECT status, count(*) FROM verification_reviews GROUP BY status`
    );
    const byStatus: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    counts.rows.forEach(r => { byStatus[r.status] = parseInt(r.count, 10); });

    res.json({ success: true, reviews: result.rows, counts: byStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/verification-queue/:id', requireAuth, async (req: Request, res: Response) => {
  const { status, reviewNote } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved, rejected, or pending.' });
  }

  try {
    const reviewer = (req as any).user?.name || 'government-reviewer';
    const result = await query(
      `UPDATE verification_reviews
       SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, reviewNote || null, reviewer, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review item not found.' });
    }

    const review = result.rows[0];

    // Approving an institution verification also flips the student's profile flag
    if (status === 'approved' && review.kind === 'institution' && review.student_id) {
      await query(
        `UPDATE students SET institution_verified = TRUE, id_card_verified = TRUE WHERE id = $1`,
        [review.student_id]
      ).catch(() => {});
    }

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [reviewer, 'VERIFICATION_REVIEWED', JSON.stringify({ reviewId: review.id, status, kind: review.kind })]
    );

    res.json({ success: true, review: review });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 1. HEALTH & TELEMETRY
// ==========================================
router.get('/health', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const dbRes = await query('SELECT NOW() as current_time, version() as pg_version');
    const latencyMs = Date.now() - start;

    const countRes = await query(`
      SELECT 
        (SELECT count(*) FROM students) as students_count,
        (SELECT count(*) FROM jobs) as jobs_count,
        (SELECT count(*) FROM applications) as apps_count,
        (SELECT count(*) FROM mous) as mous_count,
        (SELECT count(*) FROM problem_statements) as problems_count
    `);

    res.json({
      status: 'healthy',
      database: 'PostgreSQL 18 (avishkar_db)',
      latencyMs,
      timestamp: dbRes.rows[0].current_time,
      pgVersion: dbRes.rows[0].pg_version,
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
      counts: countRes.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ==========================================
// 2. STUDENTS & PROFILES
// ==========================================
router.get('/students', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM students ORDER BY readiness_score DESC');
    const formatted = result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      avatar: r.avatar,
      college: r.college,
      degree: r.degree,
      branch: r.branch,
      semester: r.semester,
      cgpa: parseFloat(r.cgpa),
      graduationYear: r.graduation_year,
      targetRole: r.target_role,
      bio: r.bio,
      resumeUploaded: r.resume_uploaded,
      resumeName: r.resume_name,
      githubUrl: r.github_url,
      linkedinUrl: r.linkedin_url,
      declaredSkills: r.declared_skills || [],
      verifiedSkills: r.verified_skills || [],
      assessmentCompleted: r.assessment_completed,
      readinessScore: r.readiness_score,
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// One-page identity bootstrap for the signed-in user (JWT) → student profile.
// Lets the frontend sync its demo profile with the real account after login.
// NOTE: must be registered BEFORE '/students/:id' so 'me' isn't eaten as an id.
router.get('/students/me', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const r = await query(
      'SELECT * FROM students WHERE user_id = $1 OR LOWER(email) = $2 ORDER BY (user_id = $1) DESC LIMIT 1',
      [user.sub, user.email]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'No student profile linked to this account.' });
    }
    const s = r.rows[0];
    res.json({
      id: s.id,
      userId: s.user_id,
      name: s.name,
      email: s.email,
      avatar: s.avatar,
      college: s.college,
      degree: s.degree,
      branch: s.branch,
      semester: s.semester,
      cgpa: parseFloat(s.cgpa),
      graduationYear: s.graduation_year,
      targetRole: s.target_role,
      bio: s.bio,
      resumeUploaded: s.resume_uploaded,
      resumeName: s.resume_name,
      githubUrl: s.github_url,
      linkedinUrl: s.linkedin_url,
      declaredSkills: s.declared_skills || [],
      verifiedSkills: s.verified_skills || [],
      assessmentCompleted: s.assessment_completed,
      readinessScore: s.readiness_score,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/students/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      avatar: r.avatar,
      college: r.college,
      degree: r.degree,
      branch: r.branch,
      semester: r.semester,
      cgpa: parseFloat(r.cgpa),
      graduationYear: r.graduation_year,
      targetRole: r.target_role,
      bio: r.bio,
      resumeUploaded: r.resume_uploaded,
      resumeName: r.resume_name,
      githubUrl: r.github_url,
      linkedinUrl: r.linkedin_url,
      declaredSkills: r.declared_skills || [],
      verifiedSkills: r.verified_skills || [],
      assessmentCompleted: r.assessment_completed,
      readinessScore: r.readiness_score,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/students/:id', async (req: Request, res: Response) => {
  const { 
    name,
    email,
    avatar,
    college,
    degree,
    branch,
    semester,
    cgpa,
    graduationYear,
    targetRole, 
    bio, 
    declaredSkills, 
    readinessScore, 
    resumeUploaded, 
    resumeName,
    idCardVerified,
    idCardDetails,
    leetcodeUrl,
    codingTelemetry
  } = req.body;

  try {
    const result = await query(
      `UPDATE students SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        avatar = COALESCE($3, avatar),
        college = COALESCE($4, college),
        degree = COALESCE($5, degree),
        branch = COALESCE($6, branch),
        semester = COALESCE($7, semester),
        cgpa = COALESCE($8, cgpa),
        graduation_year = COALESCE($9, graduation_year),
        target_role = COALESCE($10, target_role),
        bio = COALESCE($11, bio),
        declared_skills = COALESCE($12, declared_skills),
        readiness_score = COALESCE($13, readiness_score),
        resume_uploaded = COALESCE($14, resume_uploaded),
        resume_name = COALESCE($15, resume_name),
        id_card_verified = COALESCE($16, id_card_verified),
        id_card_details = COALESCE($17, id_card_details),
        leetcode_url = COALESCE($18, leetcode_url),
        coding_telemetry = COALESCE($19, coding_telemetry),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $20
       RETURNING *`,
      [
        name || null,
        email || null,
        avatar || null,
        college || null,
        degree || null,
        branch || null,
        semester !== undefined ? semester : null,
        cgpa !== undefined ? cgpa : null,
        graduationYear !== undefined ? graduationYear : null,
        targetRole || null,
        bio || null,
        declaredSkills ? JSON.stringify(declaredSkills) : null,
        readinessScore !== undefined ? readinessScore : null,
        resumeUploaded !== undefined ? resumeUploaded : null,
        resumeName || null,
        idCardVerified !== undefined ? idCardVerified : null,
        idCardDetails ? JSON.stringify(idCardDetails) : null,
        leetcodeUrl || null,
        codingTelemetry ? JSON.stringify(codingTelemetry) : null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ success: true, student: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Real-Life Resume File Upload & Intelligent NLP Engine
router.post('/students/:id/upload-resume', upload.single('resume'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No resume file provided' });
  }

  try {
    const studentRes = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    const student = studentRes.rows[0];

    let extractedText = '';
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const parser = new PDFParse({ data: file.buffer });
        const textResult = await parser.getText();
        extractedText = textResult.text || '';
        await parser.destroy();
      } catch (pdfErr) {
        console.warn('PDFParse raw stream fallback:', pdfErr);
        extractedText = file.buffer.toString('utf-8').replace(/[^\x20-\x7E\t\n\r]/g, ' ');
      }
    } else {
      extractedText = file.buffer.toString('utf-8');
    }

    // Run NLP Extraction Engine
    const nlpResult = extractSkillsFromText(extractedText, student?.target_role);

    const currentSkills: string[] = student ? (student.declared_skills || []) : [];
    const extractedNames = nlpResult.skills.map(s => s.skill);
    const merged = Array.from(new Set([...currentSkills, ...extractedNames]));

    // Compute updated readiness score based on competency depth
    const newReadiness = Math.min(95, Math.max(30, Math.round(35 + merged.length * 4.5)));

    if (student) {
      await query(
        `UPDATE students SET
          resume_uploaded = TRUE,
          resume_name = $1,
          declared_skills = $2,
          readiness_score = $3,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [file.originalname, JSON.stringify(merged), newReadiness, req.params.id]
      );

      await query(
        `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
        [req.params.id, 'REAL_RESUME_UPLOADED_AND_PARSED', JSON.stringify({
          fileName: file.originalname,
          sizeBytes: file.size,
          skillsCount: nlpResult.skills.length,
          detectedSections: nlpResult.detectedSections,
        })]
      );
    }

    res.json({
      success: true,
      fileName: file.originalname,
      fileSizeBytes: file.size,
      extracted: nlpResult.skills,
      detectedSections: nlpResult.detectedSections,
      educationInfo: nlpResult.educationInfo,
      summaryText: nlpResult.summaryText,
      allDeclaredSkills: merged,
      readinessScore: newReadiness,
      message: `Resume parsed successfully: extracted ${nlpResult.skills.length} technical competencies.`,
    });
  } catch (error: any) {
    console.error('Upload resume error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse resume' });
  }
});

// Resume NLP Scan Simulator / Direct Text Parser Fallback
router.post('/students/:id/parse-resume', async (req: Request, res: Response) => {
  const { filename, resumeText } = req.body;
  try {
    const studentRes = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    const student = studentRes.rows[0];
    const currentDeclared: string[] = student.declared_skills || [];

    let extracted: { skill: string; confidence: number; category?: string }[] = [];
    let detectedSections: string[] = [];
    let educationInfo: any = {};

    if (resumeText && resumeText.length > 20) {
      const nlp = extractSkillsFromText(resumeText, student.target_role);
      extracted = nlp.skills;
      detectedSections = nlp.detectedSections;
      educationInfo = nlp.educationInfo;
    } else {
      extracted = [
        { skill: 'Docker Containerization', confidence: 96, category: 'DevOps & Cloud' },
        { skill: 'PostgreSQL Database', confidence: 99, category: 'Database Systems' },
        { skill: 'Redis Caching', confidence: 92, category: 'Database Systems' },
        { skill: 'Kubernetes Pods', confidence: 88, category: 'DevOps & Cloud' },
        { skill: 'Microservices & REST', confidence: 95, category: 'Backend Systems' },
        { skill: 'FastAPI Python', confidence: 90, category: 'Backend Systems' },
      ];
      detectedSections = ['SKILLS & COMPETENCIES', 'PROJECTS & WORK'];
    }

    const merged = Array.from(new Set([...currentDeclared, ...extracted.map(e => e.skill)]));
    const newReadiness = Math.min(95, Math.max(30, Math.round(35 + merged.length * 4.5)));

    await query(
      `UPDATE students SET
        resume_uploaded = TRUE,
        resume_name = $1,
        declared_skills = $2,
        readiness_score = $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [filename || 'Uploaded_Resume.pdf', JSON.stringify(merged), newReadiness, req.params.id]
    );

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [req.params.id, 'RESUME_NLP_PARSED', JSON.stringify({ extractedCount: extracted.length, filename })]
    );

    res.json({
      success: true,
      fileName: filename || 'Uploaded_Resume.pdf',
      extracted,
      detectedSections,
      educationInfo,
      allDeclaredSkills: merged,
      readinessScore: newReadiness,
      message: 'Resume successfully parsed by AI NLP engine.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. ASSESSMENTS & GRADING
// ==========================================
router.get('/assessments/questions', (req: Request, res: Response) => {
  res.json(ASSESSMENT_QUESTIONS);
});

router.post('/assessments/submit', async (req: Request, res: Response) => {
  const { studentId, answers, timeSpentSeconds } = req.body;
  try {
    let correct = 0;
    const catTotal: Record<string, number> = {};
    const catCorrect: Record<string, number> = {};

    ASSESSMENT_QUESTIONS.forEach(q => {
      catTotal[q.category] = (catTotal[q.category] || 0) + 1;
      if (answers && answers[q.id] === q.correctAnswer) {
        correct++;
        catCorrect[q.category] = (catCorrect[q.category] || 0) + 1;
      }
    });

    const categoryScores: Record<string, number> = {};
    Object.keys(catTotal).forEach(cat => {
      const c = catCorrect[cat] || 0;
      const t = catTotal[cat] || 1;
      categoryScores[cat] = Math.round((c / t) * 100);
    });

    const totalQuestions = ASSESSMENT_QUESTIONS.length;
    const percentage = Math.round((correct / totalQuestions) * 100);

    let performanceGrade = 'Foundational';
    if (percentage >= 85) performanceGrade = 'Elite (Ready for Top Tier)';
    else if (percentage >= 70) performanceGrade = 'Proficient';
    else if (percentage >= 50) performanceGrade = 'Needs Bridging';

    const assessmentId = `asm-${Date.now().toString().slice(-6)}`;

    await query(
      `INSERT INTO assessments (
        id, student_id, total_score, max_score, percentage, category_scores,
        time_spent_seconds, performance_grade
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        assessmentId,
        studentId,
        correct,
        totalQuestions,
        percentage,
        JSON.stringify(categoryScores),
        timeSpentSeconds || 300,
        performanceGrade,
      ]
    );

    // Update student's readiness score and verified skills in DB
    const studentRes = await query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length > 0) {
      const currentStudent = studentRes.rows[0];
      const newReadiness = Math.round(((currentStudent.readiness_score || 70) + percentage) / 2);

      await query(
        `UPDATE students SET
          assessment_completed = TRUE,
          readiness_score = $1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newReadiness, studentId]
      );
    }

    // Guarantee a roadmap exists so the Learning Roadmap tab is never empty.
    const rmCheck = await query('SELECT id FROM roadmaps WHERE student_id = $1', [studentId]);
    if (rmCheck.rows.length === 0) {
      const milestones = await generateDefaultRoadmap(studentId);
      await query(
        'INSERT INTO roadmaps (id, student_id, milestones) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [`rdm-${studentId}`, studentId, JSON.stringify(milestones)]
      );
    }

    res.json({
      success: true,
      assessmentId,
      totalScore: correct,
      maxScore: totalQuestions,
      percentage,
      categoryScores,
      performanceGrade,
      timeSpentSeconds,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4b. ASSESSMENT HISTORY (ANALYTICS)
// ==========================================
router.get('/assessments/student/:studentId', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, student_id, completed_at, total_score, max_score, percentage,
              category_scores, time_spent_seconds, performance_grade
       FROM assessments
       WHERE student_id = $1
       ORDER BY completed_at ASC`,
      [req.params.studentId]
    );

    const history = result.rows.map(r => ({
      id: r.id,
      completedAt: r.completed_at,
      totalScore: r.total_score,
      maxScore: r.max_score,
      percentage: r.percentage,
      categoryScores: r.category_scores || {},
      timeSpentSeconds: r.time_spent_seconds,
      performanceGrade: r.performance_grade,
    }));

    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. LEARNING ROADMAPS
// ==========================================
router.get('/roadmaps/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.studentId);
    let result = await query('SELECT * FROM roadmaps WHERE student_id = $1', [studentId]);
    // Auto-generate a baseline roadmap the first time a student opens the tab.
    if (result.rows.length === 0) {
      const milestones = await generateDefaultRoadmap(studentId);
      await query(
        'INSERT INTO roadmaps (id, student_id, milestones) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [`rdm-${studentId}`, studentId, JSON.stringify(milestones)]
      );
      return res.json(milestones);
    }
    res.json(result.rows[0].milestones);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Shared baseline roadmap generator — used on first GET and after assessments.
async function generateDefaultRoadmap(studentId: string) {
  const idSuffix = studentId.replace(/[^a-z0-9]/gi, '').slice(-8) || 'x';

  // Fetch student's target role and recent assessment to customize the roadmap
  const studentRes = await query('SELECT target_role FROM students WHERE id = $1', [studentId]);
  const targetRole = studentRes.rows[0]?.target_role || 'Software Engineer';
  
  const assessRes = await query('SELECT category_scores FROM assessments WHERE student_id = $1 ORDER BY completed_at DESC LIMIT 1', [studentId]);
  const weaknesses = assessRes.rows[0]?.category_scores 
    ? JSON.stringify(assessRes.rows[0].category_scores) 
    : 'Unknown (assume beginner level)';

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.length > 10) {
    try {
      console.log('🤖 Asking S.P.A.R.K AI to generate a personalized roadmap for:', targetRole);
      const prompt = `
You are an expert AI Career Coach. 
Create a highly personalized 3-milestone learning roadmap for a student aiming to become a "${targetRole}". 
Their current assessment scores by category are: ${weaknesses}. Focus on improving their lowest scores.
Output EXACTLY valid JSON in this exact structure, with NO markdown formatting, NO backticks, NO extra text:
[
  {
    "id": "rm-ai-1",
    "title": "Milestone Title",
    "description": "Why this helps.",
    "estimatedHours": 20,
    "completed": false,
    "modules": [
      { "id": "mo-ai-1", "title": "Course Name", "provider": "Coursera/NPTEL", "durationWeeks": 2, "completed": false }
    ]
  }
]
Must have exactly 3 milestones. Each milestone must have 1-2 modules.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (response.ok) {
        const data: any = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          text = text.replace(/\x60\x60\x60json/g, '').replace(/\x60\x60\x60/g, '').trim();
          const parsed = JSON.parse(text);
          // Inject dynamic IDs
          parsed.forEach((m: any, i: number) => {
            m.id = `rm-ai-${idSuffix}-${i}`;
            m.modules.forEach((mod: any, j: number) => {
              mod.id = `mo-ai-${idSuffix}-${i}-${j}`;
            });
          });
          console.log('✅ Gemini successfully generated a custom roadmap!');
          return parsed;
        }
      }
    } catch (e) {
      console.warn('❌ Gemini API failed, falling back to hardcoded roadmaps:', e);
    }
  }

  // Fallback AI/ML
  if (targetRole === 'AI/ML Specialist') {
    return [
      {
        id: `rm-mlcore-${idSuffix}`,
        title: 'Machine Learning Core & Math',
        description: 'Solidify understanding of gradient descent, backprop, and loss functions.',
        estimatedHours: 24,
        completed: false,
        modules: [
          { id: `mo-math-${idSuffix}`, title: 'Mathematics for Machine Learning', provider: 'Coursera', durationWeeks: 3, completed: false }
        ],
      }
    ];
  }

  // Fallback Cloud/DevOps Roadmap
  return [
    {
      id: `rm-cloud-${idSuffix}`,
      title: 'Cloud Infrastructure Bridge',
      description: 'Bridge critical deficits in Docker and Kubernetes.',
      estimatedHours: 24,
      completed: false,
      modules: [
        { id: `mo-cc-${idSuffix}`, title: 'Cloud Computing (NPTEL)', provider: 'NPTEL', durationWeeks: 4, completed: false }
      ],
    }
  ];
}

router.patch('/roadmaps/:studentId/toggle-module', async (req: Request, res: Response) => {
  const { milestoneId, moduleId } = req.body;
  try {
    const result = await query('SELECT * FROM roadmaps WHERE student_id = $1', [req.params.studentId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Roadmap not found' });

    const milestones = result.rows[0].milestones;
    let toggledState = false;

    const updated = milestones.map((m: any) => {
      if (m.id !== milestoneId) return m;
      const updatedMods = m.modules.map((mod: any) => {
        if (mod.id !== moduleId) return mod;
        toggledState = !mod.completed;
        return { ...mod, completed: toggledState };
      });
      const allDone = updatedMods.every((mod: any) => mod.completed);
      return { ...m, modules: updatedMods, completed: allDone };
    });

    await query(
      'UPDATE roadmaps SET milestones = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2',
      [JSON.stringify(updated), req.params.studentId]
    );

    // Boost student readiness score by +3% if marked completed
    if (toggledState) {
      await query(
        'UPDATE students SET readiness_score = LEAST(99, readiness_score + 3) WHERE id = $1',
        [req.params.studentId]
      );
    }

    res.json({ success: true, milestones: updated, toggledState });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. JOBS & OPPORTUNITIES
// ==========================================
function mapJobRow(r: any) {
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    companyLogo: r.company_logo,
    location: r.location,
    type: r.type,
    stipendOrSalary: r.stipend_or_salary,
    duration: r.duration,
    openings: r.openings,
    postedDate: r.posted_date,
    deadline: r.deadline,
    description: r.description,
    requiredSkills: r.required_skills || [],
    minCgpa: parseFloat(r.min_cgpa),
    eligibleBranches: r.eligible_branches || [],
    sourcePlatform: r.source_platform || 'Campus Direct',
    externalUrl: r.external_url || undefined,
    fetchedAt: r.fetched_at,
    postedBy: r.posted_by || undefined,
    postedByName: r.posted_by_name || r.company,
    status: r.status || 'open',
    updatedAt: r.updated_at,
  };
}

// Public board: search + filter + pagination (?q&type&location&status&page&limit).
// Recruiters: ?mine=1 (Bearer auth) returns ONLY their own postings, all statuses.
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const mine = String(req.query.mine || '') === '1';
    const search = String(req.query.q || '').trim();
    const typeFilter = String(req.query.type || '').trim();
    const locationFilter = String(req.query.location || '').trim();
    const statusFilter = String(req.query.status || '').trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limitRaw = parseInt(String(req.query.limit || ''), 10);
    const limit = Math.min(100, Math.max(1, limitRaw || 20));

    const where: string[] = [];
    const params: any[] = [];
    let auth: { sub: string; email: string; role: string; name?: string } | null = null;

    if (mine) {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      const { verifyToken } = await import('./auth');
      auth = token ? verifyToken(token) : null;
      if (!auth) {
        return res.status(401).json({ error: 'Authentication required for ?mine=1.' });
      }
      params.push(auth.sub);
      where.push(`posted_by = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const n = params.length;
      where.push(`(LOWER(title) LIKE $${n} OR LOWER(company) LIKE $${n} OR LOWER(location) LIKE $${n} OR LOWER(description) LIKE $${n})`);
    }
    if (typeFilter) {
      params.push(typeFilter);
      where.push(`type = $${params.length}`);
    }
    if (locationFilter) {
      params.push(`%${locationFilter.toLowerCase()}%`);
      where.push(`LOWER(location) LIKE $${params.length}`);
    }
    if (statusFilter) {
      params.push(statusFilter);
      where.push(`status = $${params.length}`); // 'open' | 'closed' | 'filled'
    } else if (String(req.query.includeUnavailable || '') === '1' && !mine) {
      // Student board wants everything so closed/filled cards render a friendly
      // 'no longer accepting applications' state instead of vanishing.
    } else if (!mine) {
      where.push(`status = 'open'`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRes = await query(`SELECT count(*)::int AS n FROM jobs ${whereSql}`, params);
    const total = countRes.rows[0].n;
    params.push(limit, (page - 1) * limit);
    const dataRes = await query(
      `SELECT * FROM jobs ${whereSql} ORDER BY posted_date DESC NULLS LAST, created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      jobs: dataRes.rows.map(mapJobRow),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    console.error('GET /jobs failed:', error.message);
    res.status(500).json({ error: 'Failed to load jobs.' });
  }
});

// Job posting mutates the shared opportunity pool — recruiter auth required
router.post('/jobs', requireAuth, async (req: Request, res: Response) => {
  const {
    title, company, companyLogo, location, type, stipendOrSalary,
    duration, openings, deadline, description, requiredSkills, minCgpa, eligibleBranches
  } = req.body;

  try {
    const recruiter = (req as any).user;
    const id = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await query(
      `INSERT INTO jobs (
        id, title, company, company_logo, location, type, stipend_or_salary,
        duration, openings, deadline, description, required_skills, min_cgpa, eligible_branches,
        posted_by, posted_by_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'open')
      RETURNING *`,
      [
        id, title, company, companyLogo || null, location, type, stipendOrSalary,
        duration || null, openings || 1, deadline || null, description,
        JSON.stringify(requiredSkills || []), minCgpa || 6.0,
        JSON.stringify(eligibleBranches || []),
        recruiter.sub, recruiter.name || company,
      ]
    );

    const job = result.rows[0];

    // Broadcast the new opening to every connected browser in real time
    emitEvent({
      type: 'new_job',
      title: 'New Opportunity Posted',
      message: `${job.title} at ${job.company} (${job.location}) is now live!`,
      data: { jobId: job.id, company: job.company },
    });

    res.json({ success: true, job: mapJobRow(job) });
  } catch (error: any) {
    console.error('POST /jobs failed:', error.message);
    res.status(500).json({ error: 'Failed to post job.' });
  }
});

// ── Job lifecycle (owner-only): edit / close / mark-filled / delete ─────────
async function requireJobOwner(req: Request, res: Response): Promise<any | null> {
  const jobId = req.params.jobId;
  const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (jobRes.rows.length === 0) {
    res.status(404).json({ error: 'Job not found.' });
    return null;
  }
  const job = jobRes.rows[0];
  const recruiter = (req as any).user;
  if (job.posted_by && job.posted_by !== recruiter.sub) {
    res.status(403).json({ error: 'Only the recruiter who posted this job can manage it.' });
    return null;
  }
  if (!job.posted_by) {
    res.status(403).json({ error: 'This listing was synced from an external platform and cannot be managed here.' });
    return null;
  }
  return job;
}

function notifyJobApplicants(jobId: string, jobTitle: string, company: string, title: string, message: string) {
  // Non-blocking: informs every applicant on status change via notification + SSE.
  (async () => {
    const apps = await query(
      `SELECT DISTINCT student_id FROM applications WHERE job_id = $1`,
      [jobId]
    );
    for (const row of apps.rows) {
      const studentUserId = await query(`SELECT id FROM users WHERE LOWER(email) = (SELECT LOWER(email) FROM students WHERE id = $1)`, [row.student_id]);
      const uid = studentUserId.rows[0]?.id || row.student_id;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, 'alert')`,
        [`notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, uid, title, message]
      ).catch(() => {});
      emitEvent({
        type: 'application_update',
        title,
        message,
        targetUserId: uid,
        data: { jobId },
      });
    }
  })().catch(err => console.error('notifyJobApplicants failed:', err.message));
}

router.patch('/jobs/:jobId', requireAuth, async (req: Request, res: Response) => {
  const job = await requireJobOwner(req, res);
  if (!job) return;

  const { title, company, location, type, stipendOrSalary, duration, openings, deadline, description, requiredSkills, minCgpa, eligibleBranches } = req.body || {};

  try {
    const result = await query(
      `UPDATE jobs SET
         title = COALESCE($1, title),
         company = COALESCE($2, company),
         location = COALESCE($3, location),
         type = COALESCE($4, type),
         stipend_or_salary = COALESCE($5, stipend_or_salary),
         duration = COALESCE($6, duration),
         openings = COALESCE($7, openings),
         deadline = COALESCE($8, deadline),
         description = COALESCE($9, description),
         required_skills = COALESCE($10, required_skills),
         min_cgpa = COALESCE($11, min_cgpa),
         eligible_branches = COALESCE($12, eligible_branches),
         status = 'open',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        title ?? null, company ?? null, location ?? null, type ?? null,
        stipendOrSalary ?? null, duration ?? null,
        openings !== undefined && openings !== null ? parseInt(String(openings), 10) || null : null,
        deadline ?? null, description ?? null,
        requiredSkills ? JSON.stringify(requiredSkills) : null,
        minCgpa !== undefined && minCgpa !== null ? parseFloat(String(minCgpa)) || null : null,
        eligibleBranches ? JSON.stringify(eligibleBranches) : null,
        job.id,
      ]
    );

    res.json({ success: true, job: mapJobRow(result.rows[0]) });
  } catch (error: any) {
    console.error('PATCH /jobs/:id failed:', error.message);
    res.status(500).json({ error: 'Failed to update job.' });
  }
});

// Close (unpublish) / reopen / mark-filled — one endpoint, explicit actions
router.patch('/jobs/:jobId/status', requireAuth, async (req: Request, res: Response) => {
  const job = await requireJobOwner(req, res);
  if (!job) return;

  const { status } = req.body || {};
  if (!['open', 'closed', 'filled'].includes(status)) {
    return res.status(400).json({ error: "status must be 'open', 'closed' or 'filled'." });
  }

  try {
    const result = await query(
      `UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, job.id]
    );
    const updated = result.rows[0];

    if (status !== 'open') {
      notifyJobApplicants(
        job.id, job.title, job.company,
        status === 'filled' ? 'Position Filled' : 'Application Window Closed',
        status === 'filled'
          ? `Great news — ${job.title} at ${job.company} has been filled. Thank you for applying!`
          : `${job.title} at ${job.company} is no longer accepting applications.`
      );
      emitEvent({
        type: 'job_update',
        title: status === 'filled' ? 'Position Filled' : 'Job Closed',
        message: `${job.title} at ${job.company} — ${status === 'filled' ? 'position filled' : 'closed for applications'}`,
        data: { jobId: job.id, status },
      });
    }

    res.json({ success: true, job: mapJobRow(updated) });
  } catch (error: any) {
    console.error('PATCH /jobs/:id/status failed:', error.message);
    res.status(500).json({ error: 'Failed to update job status.' });
  }
});

router.delete('/jobs/:jobId', requireAuth, async (req: Request, res: Response) => {
  const job = await requireJobOwner(req, res);
  if (!job) return;

  try {
    const applicantCount = await query(`SELECT count(DISTINCT student_id)::int AS n FROM applications WHERE job_id = $1`, [job.id]);
    if (applicantCount.rows[0].n > 0) {
      // Keep the ATS history intact — closing is the correct operation when applicants exist.
      return res.status(409).json({
        error: `This job has ${applicantCount.rows[0].n} applicant(s). Close or mark it filled instead of deleting, so application history is preserved.`,
      });
    }

    await query('DELETE FROM jobs WHERE id = $1', [job.id]);
    res.json({ success: true, deleted: job.id });
  } catch (error: any) {
    console.error('DELETE /jobs/:id failed:', error.message);
    res.status(500).json({ error: 'Failed to delete job.' });
  }
});

// ── Bulk candidate actions (owner-only): shortlist/reject many at once ──────
router.patch('/applications/bulk-status', requireAuth, async (req: Request, res: Response) => {
  const { jobIds, ids, status } = req.body || {};
  const targetIds: string[] = Array.isArray(ids) ? ids.map(String) : [];
  const filterJobIds: string[] = Array.isArray(jobIds) ? jobIds.map(String) : [];

  if (targetIds.length === 0 && filterJobIds.length === 0) {
    return res.status(400).json({ error: 'Provide application ids[] or jobIds[] to update.' });
  }
  const allowed = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Offer Extended', 'Rejected'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  try {
    const recruiter = (req as any).user;
    // Ownership enforced in SQL: only applications on jobs posted_by the caller move.
    const result = await query(
      `UPDATE applications a
         SET status = $1,
             updated_at = CURRENT_TIMESTAMP,
             stage_history = a.stage_history || $2::jsonb
       WHERE ($3::text[] IS NULL OR a.id = ANY($3::text[]))
         AND ($4::text[] IS NULL OR a.job_id = ANY($4::text[]))
         AND a.job_id IN (SELECT id FROM jobs WHERE posted_by = $5)
       RETURNING id, student_id, student_name, job_title, company`,
      [
        status,
        JSON.stringify([{ stage: status, date: new Date().toISOString().split('T')[0], note: `Bulk update to ${status} by recruiter` }]),
        targetIds.length ? targetIds : null,
        filterJobIds.length ? filterJobIds : null,
        recruiter.sub,
      ]
    );

    // Notify every affected student (best-effort, non-blocking)
    for (const row of result.rows) {
      const uidRes = await query(
        `SELECT u.id FROM users u WHERE LOWER(u.email) = (SELECT LOWER(email) FROM students WHERE id = $1)`,
        [row.student_id]
      ).catch(() => ({ rows: [] as any[] }));
      const uid = uidRes.rows[0]?.id || row.student_id;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)`,
        [
          `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          uid,
          `Application ${status}`,
          `Your application for ${row.job_title} at ${row.company} moved to: ${status}`,
          status === 'Rejected' ? 'alert' : 'success',
        ]
      ).catch(() => {});
      emitEvent({
        type: 'application_update',
        title: `Application ${status}`,
        message: `Your application for ${row.job_title} at ${row.company} moved to: ${status}`,
        targetUserId: uid,
        data: { status },
      });
    }

    res.json({ success: true, updated: result.rowCount, status });
  } catch (error: any) {
    console.error('bulk-status failed:', error.message);
    res.status(500).json({ error: 'Bulk update failed.' });
  }
});

// ==========================================
// 6. APPLICATIONS & ATS WORKFLOW
// ==========================================
router.get('/applications', async (req: Request, res: Response) => {
  try {
    // ?studentId= scopes to one student (personal tracker).
    // ?mine=1 (recruiter JWT) scopes to applications on the recruiter's OWN jobs.
    // With neither, industry/college dashboards get the global ATS view.
    const studentIdFilter = String(req.query.studentId || '').trim();
    const mine = String(req.query.mine || '') === '1';

    let result;
    if (mine) {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      const { verifyToken } = await import('./auth');
      const auth = token ? verifyToken(token) : null;
      if (!auth) {
        return res.status(401).json({ error: 'Authentication required for ?mine=1.' });
      }
      result = await query(
        `SELECT a.* FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE j.posted_by = $1
         ORDER BY a.applied_date DESC`,
        [auth.sub]
      );
    } else if (studentIdFilter) {
      result = await query('SELECT * FROM applications WHERE student_id = $1 ORDER BY applied_date DESC', [studentIdFilter]);
    } else {
      result = await query('SELECT * FROM applications ORDER BY applied_date DESC');
    }
    const apps = result.rows.map(r => ({
      id: r.id,
      jobId: r.job_id,
      jobTitle: r.job_title,
      company: r.company,
      studentId: r.student_id,
      studentName: r.student_name,
      // pg DATE arrives as a JS Date → serialize as 'YYYY-MM-DD', not raw ISO datetime
      appliedDate: typeof r.applied_date === 'string'
        ? r.applied_date
        : new Date(r.applied_date).toLocaleDateString('en-CA'),  // en-CA = YYYY-MM-DD
      status: r.status,
      aiMatchScore: r.ai_match_score,
      notes: r.notes,
      attachedScorecardUrl: r.attached_scorecard_url,
      attachedResumeUrl: r.attached_resume_url,
      stageHistory: r.stage_history || [],
    }));
    res.json(apps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/applications', async (req: Request, res: Response) => {
  const { jobId, jobTitle, company, studentId, studentName, aiMatchScore, notes, attachedScorecardUrl, attachedResumeUrl } = req.body;
  try {
    // A closed/filled job must never accept new applications.
    const jobState = await query(`SELECT status, title, company FROM jobs WHERE id = $1`, [jobId]);
    if (jobState.rows.length > 0 && jobState.rows[0].status && jobState.rows[0].status !== 'open') {
      return res.status(409).json({
        error: `${jobState.rows[0].title} at ${jobState.rows[0].company} is no longer accepting applications.`,
      });
    }
    const id = `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const initialStatus = (aiMatchScore && aiMatchScore >= 80) ? 'Shortlisted' : 'Applied';
    const initialStageHistory = JSON.stringify([
      { stage: initialStatus, date: new Date().toISOString().split('T')[0], note: 'Application registered on S.P.A.R.K.' }
    ]);

    const result = await query(
      `INSERT INTO applications (
        id, job_id, job_title, company, student_id, student_name, status, ai_match_score, notes,
        attached_scorecard_url, attached_resume_url, stage_history
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id, jobId, jobTitle, company, studentId, studentName, initialStatus,
        aiMatchScore || 70, notes || null,
        attachedScorecardUrl || null, attachedResumeUrl || null, initialStageHistory
      ]
    );

    // Create a real-time notification
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, 
        studentId,
        'Application Submitted',
        `Your application for ${jobTitle} at ${company} was submitted. Current stage: ${initialStatus}`,
        'info',
      ]
    );

    // Push live update to the student's open browser sessions
    emitEvent({
      type: 'application_update',
      title: 'Application Submitted',
      message: `Your application for ${jobTitle} at ${company} is now: ${initialStatus}`,
      targetUserId: studentId,
      data: { jobId, status: initialStatus },
    });

    res.json({ success: true, application: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/applications/:id/status', async (req: Request, res: Response) => {
  const { status, notes, attachedScorecardUrl, attachedResumeUrl } = req.body;
  try {
    const appRes = await query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (appRes.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    
    const existing = appRes.rows[0];
    const currentHistory = Array.isArray(existing.stage_history) ? existing.stage_history : [];
    const updatedHistory = [
      ...currentHistory,
      { stage: status || existing.status, date: new Date().toISOString().split('T')[0], note: notes || 'Status updated' }
    ];

    const result = await query(
      `UPDATE applications SET
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        attached_scorecard_url = COALESCE($3, attached_scorecard_url),
        attached_resume_url = COALESCE($4, attached_resume_url),
        stage_history = $5,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [status, notes || null, attachedScorecardUrl || null, attachedResumeUrl || null, JSON.stringify(updatedHistory), req.params.id]
    );

    // Real-time stage-change push to the owning student
    const updatedApp = result.rows[0];
    emitEvent({
      type: 'application_update',
      title: `Application ${status || updatedApp.status}`,
      message: `${updatedApp.job_title} at ${updatedApp.company} moved to: ${status || updatedApp.status}`,
      targetUserId: updatedApp.student_id,
      data: { applicationId: updatedApp.id, status: status || updatedApp.status },
    });

    res.json({ success: true, application: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/applications/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM applications WHERE id = $1 RETURNING *', [req.params.id]);
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/applications/by-job/:jobId/:studentId', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM applications WHERE job_id = $1 AND student_id = $2 RETURNING *',
      [req.params.jobId, req.params.studentId]
    );
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. MOUS & COLLABORATION
// ==========================================
router.get('/mous', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM mous ORDER BY signed_date DESC');
    const mous = result.rows.map(r => ({
      id: r.id,
      collegeName: r.college_name,
      companyName: r.company_name,
      title: r.title,
      focusArea: r.focus_area,
      signedDate: r.signed_date,
      validUntil: r.valid_until,
      status: r.status,
      initiativesCount: r.initiatives_count,
      keyObjectives: r.key_objectives || [],
      digitalSignatureHash: r.digital_signature_hash,
    }));
    res.json(mous);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// MoU signing is an institutional action — auth required
router.post('/mous', requireAuth, async (req: Request, res: Response) => {
  const { collegeName, companyName, title, focusArea, validUntil, keyObjectives, digitalSignatureHash } = req.body;
  try {
    const id = `mou-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await query(
      `INSERT INTO mous (
        id, college_name, company_name, title, focus_area, valid_until, key_objectives, digital_signature_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id, collegeName, companyName, title, focusArea, validUntil,
        JSON.stringify(keyObjectives || []), digitalSignatureHash || null
      ]
    );

    const mou = result.rows[0];

    // Broadcast the new partnership ecosystem-wide
    emitEvent({
      type: 'new_mou',
      title: 'New MoU Signed',
      message: `${mou.college_name} × ${mou.company_name}: ${mou.title}`,
      data: { mouId: mou.id },
    });

    res.json({ success: true, mou });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. PROBLEM STATEMENTS & CAPSTONES
// ==========================================
router.get('/problems', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM problem_statements ORDER BY created_at DESC');
    const probs = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      company: r.company,
      domain: r.domain,
      description: r.description,
      rewardOrGrant: r.reward_or_grant,
      deadline: r.deadline,
      submissionsCount: r.submissions_count,
      status: r.status,
      tags: r.tags || [],
    }));
    res.json(probs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/problems', async (req: Request, res: Response) => {
  const { title, company, domain, description, rewardOrGrant, deadline, tags } = req.body;
  try {
    const id = `prob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await query(
      `INSERT INTO problem_statements (
        id, title, company, domain, description, reward_or_grant, deadline, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [id, title, company, domain, description, rewardOrGrant || null, deadline || null, JSON.stringify(tags || [])]
    );

    res.json({ success: true, problem: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. NOTIFICATIONS
// ==========================================
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  // Scope to the signed-in user (JWT sub = users.id; email also accepted so
  // legacy notification rows keyed by email still show).
  const user = (req as any).user;
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 OR user_id = $2 ORDER BY created_at DESC LIMIT 20',
      [user.sub, user.email]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── One-click job-alert unsubscribe (link in every digest email) ────────────
// HMAC-signed with the same secret as JWT_SECRET so the link can't be forged.
router.get('/unsubscribe-alerts', async (req: Request, res: Response) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const token = String(req.query.token || '').trim();
  if (!email || !token) {
    return res.status(400).send('Invalid unsubscribe link.');
  }

  const crypto = await import('crypto');
  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'spark-dev-unsubscribe-secret')
    .update(email)
    .digest('hex')
    .slice(0, 32);

  if (token !== expected) {
    return res.status(403).send('This unsubscribe link is invalid or expired.');
  }

  try {
    const result = await query(
      `UPDATE users SET job_alerts_enabled = FALSE WHERE LOWER(email) = $1 RETURNING email`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('No account found for this email.');
    }
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'JOB_ALERTS_UNSUBSCRIBED', '{}')`,
      [email]
    ).catch(() => {});
    res.type('html').send(
      '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#0b0f19;color:#e2e8f0;">'
      + '<h1 style="color:#6ee7b7;">✓ Unsubscribed</h1><p>You will no longer receive daily job-alert emails from S.P.A.R.K.</p>'
      + '<p style="color:#64748b;font-size:12px;">You can re-enable alerts anytime from your dashboard.</p></body></html>'
    );
  } catch (error: any) {
    console.error('Unsubscribe failed:', error.message);
    res.status(500).send('Could not process the unsubscribe request.');
  }
});

// Manual digest trigger for testing: POST /api/job-alerts/run?secret=<JWT_SECRET>
router.post('/job-alerts/run', async (req: Request, res: Response) => {
  const secret = process.env.JWT_SECRET?.trim();
  const provided = String(req.query.secret || req.body?.secret || '');
  if (!secret || provided !== secret) {
    return res.status(403).json({ error: 'Admin secret required.' });
  }
  try {
    const { sendJobAlertDigest } = await import('./jobAlerts');
    const result = await sendJobAlertDigest();
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Student job-alerts preference (dashboard toggle ↔ email unsubscribe) ────
router.get('/me/job-alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const r = await query(`SELECT job_alerts_enabled FROM users WHERE id = $1`, [user.sub]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    res.json({ jobAlertsEnabled: r.rows[0].job_alerts_enabled !== false });
  } catch (error: any) {
    console.error('GET /me/job-alerts failed:', error.message);
    res.status(500).json({ error: 'Failed to load preference.' });
  }
});

router.patch('/me/job-alerts', requireAuth, async (req: Request, res: Response) => {
  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required.' });
  }
  try {
    const user = (req as any).user;
    const r = await query(
      `UPDATE users SET job_alerts_enabled = $1 WHERE id = $2 RETURNING job_alerts_enabled`,
      [enabled, user.sub]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'JOB_ALERTS_SETTING', $2)`,
      [user.email, JSON.stringify({ enabled })]
    ).catch(() => {});
    res.json({ success: true, jobAlertsEnabled: r.rows[0].job_alerts_enabled });
  } catch (error: any) {
    console.error('PATCH /me/job-alerts failed:', error.message);
    res.status(500).json({ error: 'Failed to update preference.' });
  }
});

// ==========================================
// 10. ANALYTICS & COPILOT
// ==========================================
router.get('/analytics', (req: Request, res: Response) => {
  res.json({
    collegeDepartmentStats: COLLEGE_DEPARTMENT_STATS,
    govtRegionalStats: GOVT_REGIONAL_STATS,
    emergingSkillTrends: EMERGING_SKILL_TRENDS,
  });
});

router.post('/copilot', async (req: Request, res: Response) => {
  const { query: userQuery, apiKey } = req.body;
  try {
    const answer = await askCopilot(userQuery || '', apiKey);
    res.json({ answer });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 11. REGISTRATION & ONBOARDING (WITH EMAIL OTP)
// ==========================================
router.post('/auth/register-send-otp', async (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userName = (name && typeof name === 'string' && name.trim()) ? name.trim() : 'Learner';

  try {
    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const id = `reg-otp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any previous pending registration OTPs for this email
    await query('DELETE FROM otp_verifications WHERE LOWER(email) = $1', [normalizedEmail]);

    // Store in PostgreSQL
    await query(
      `INSERT INTO otp_verifications (id, email, otp, expires_at, verified)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [id, normalizedEmail, otp, expiresAt]
    );

    // Send email via Gmail SMTP using credentials provided
    const mailResult = await sendRegistrationOtpEmail({
      toEmail: normalizedEmail,
      otp,
      userName,
    });

    if (!mailResult.success) {
      return res.status(500).json({
        error: `Could not send verification email: ${mailResult.error || 'SMTP delivery failure'}`,
      });
    }

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [normalizedEmail, 'REGISTRATION_OTP_SENT', JSON.stringify({ messageId: mailResult.messageId, devFallback: !!mailResult.devOtp })]
    );

    res.json({
      success: true,
      message: `Verification code successfully sent to ${normalizedEmail}`,
      expiresInMinutes: 10,
      // Dev convenience only: lets the local UI display the OTP when SMTP is unreachable.
      ...(mailResult.devOtp && process.env.NODE_ENV !== 'production' ? { devOtp: mailResult.devOtp } : {}),
    });
  } catch (error: any) {
    console.error('Registration OTP dispatch error:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch registration OTP' });
  }
});

router.post('/auth/register-verify-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cleanOtp = otp.toString().trim();

  try {
    const result = await query(
      `SELECT * FROM otp_verifications
       WHERE LOWER(email) = $1 AND otp = $2 AND expires_at > CURRENT_TIMESTAMP AND verified = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, cleanOtp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired verification code. Please check your email or request a new code.',
      });
    }

    // Mark verified
    await query('UPDATE otp_verifications SET verified = TRUE WHERE id = $1', [result.rows[0].id]);

    res.json({
      success: true,
      verified: true,
      message: 'Email successfully verified! Proceeding to your profile configuration.',
    });
  } catch (error: any) {
    console.error('Registration OTP verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed.' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  const {
    role,
    name,
    email,
    password,
    college,
    degree,
    branch,
    semester,
    cgpa,
    graduationYear, 
    targetRole,
    bio,
    company,
    department,
    designation,
    jurisdiction,
  } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required for registration.' });
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Full name is required for registration.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Declared outside try so the catch block can always release the pooled
  // connection, even when a failure happens mid-transaction.
  let client: any = null;

  try {
    // Verify that this email has an approved OTP verification
    const otpCheck = await query(
      `SELECT * FROM otp_verifications 
       WHERE LOWER(email) = $1 AND verified = TRUE 
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail]
    );

    if (otpCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Email verification required. Please verify your email with the 6-digit OTP code before proceeding.',
      });
    }

    // ── Duplicate-account guard ────────────────────────────────────────────
    // A credential-bearing account must never be silently overwritten by a
    // public signup. Trusted internal flows (seeding/admin tooling) may pass
    // x-registration-override: <REGISTRATION_OVERRIDE_KEY> to overwrite —
    // which always triggers a security-alert email to the account owner.
    const existingUser = await query(
      `SELECT id, name FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    );
    const isExistingAccount = existingUser.rows.length > 0;
    const overrideKey = process.env.REGISTRATION_OVERRIDE_KEY?.trim();
    const overrideAllowed = !!overrideKey && req.get('x-registration-override') === overrideKey;

    if (isExistingAccount && !overrideAllowed) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please sign in or reset your password instead of registering again.',
      });
    }

    // Everything below runs in ONE transaction: users + students (or alumni)
    // rows commit atomically or not at all — no orphaned half-registrations.
    client = await pool.connect();
    const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'User')}`;

    // Hash the password with bcrypt before persisting (never store plaintext)
    const passwordHash = await hashPassword(password || 'spark-default-2026');

    await client.query('BEGIN');
    try {
      const userRes = await client.query(
        `INSERT INTO users (id, name, email, role, avatar, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role,
           avatar = EXCLUDED.avatar,
           password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash)
         RETURNING *`,
        [userId, name.trim(), normalizedEmail, role || 'student', avatar, passwordHash]
      );
      // The row's real id (on re-registration the existing id is preserved)
      const effectiveUserId = userRes.rows[0].id;

    let studentRecord = null;
    if (role === 'student') {
      const studentId = `std-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const semNumber = parseInt(semester, 10) || 1;
      const cgpaNumber = parseFloat(cgpa) || 7.5;
      const gradYear = parseInt(graduationYear, 10) || (new Date().getFullYear() + 2);

      const studentRes = await client.query(
        `INSERT INTO students (
          id, user_id, name, email, avatar, college, degree, branch, semester, cgpa,
          graduation_year, target_role, bio, resume_uploaded, resume_name,
          declared_skills, verified_skills, assessment_completed, readiness_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, NULL, '[]'::jsonb, '[]'::jsonb, FALSE, 15)
        ON CONFLICT (email) DO UPDATE SET
          name = $3, college = $6, degree = $7, branch = $8, semester = $9,
          cgpa = $10, graduation_year = $11, target_role = $12, bio = $13
        RETURNING *`,
        [
          studentId,
          effectiveUserId,
          name.trim(),
          normalizedEmail,
          avatar,
          college || 'Institute of Engineering & Technology',
          degree || 'B.Tech',
          branch || 'Computer Science & Engineering',
          semNumber,
          cgpaNumber,
          gradYear,
          targetRole || 'Full Stack Cloud Engineer',
          bio || `Undergraduate student at ${college || 'engineering institute'}.`,
        ]
      );

      studentRecord = studentRes.rows[0];
      }
      if (role === 'alumni') {
        const alumniId = `alum-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        // Schema requires a valid alumni_applications FK — auto-create an
        // approved application record (the email is already OTP-verified).
        const appId = `alumapp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        await client.query(
          `INSERT INTO alumni_applications (
             id, full_name, email, college_id, college_name, degree, graduation_year,
             company, designation, expertise, status, review_note, reviewed_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', 'Auto-approved via verified registration.', CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO NOTHING`,
          [appId, name.trim(), normalizedEmail, 'inst-default',
           college || 'Institute of Engineering & Technology', 'B.Tech', new Date().getFullYear() - 4,
           company || 'Enterprise Corp', designation || 'Alumni / Mentor',
           JSON.stringify([targetRole || 'Industry Insights'])]
        );
        await client.query(
          `INSERT INTO alumni (id, application_id, name, email, phone, college_id, college_name, degree, graduation_year, company, designation, expertise, mentor_capacity)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (email) DO NOTHING`,
          [
            alumniId,
            appId,
            name.trim(),
            normalizedEmail,
            'Not provided',
            'inst-default',
            college || 'Institute of Engineering & Technology',
            'B.Tech',
            new Date().getFullYear() - 4,
            company || 'Enterprise Corp',
            designation || 'Alumni / Mentor',
            JSON.stringify([targetRole || 'Industry Insights']),
            10
          ]
        );
      }
      

      await client.query(
        `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
        [effectiveUserId, 'USER_REGISTERED', JSON.stringify({ role: role || 'student', name: name.trim(), email: normalizedEmail, college, company, department })]
      );

      if (isExistingAccount) {
        await client.query(
          `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
          [effectiveUserId, 'ACCOUNT_OVERWRITTEN', JSON.stringify({ via: 'registration-override', email: normalizedEmail })]
        );
      }

      await client.query('COMMIT');

      if (isExistingAccount) {
        // Notify the previous account holder — non-blocking for the response.
        sendSecurityAlertEmail({
          toEmail: normalizedEmail,
          userName: String(existingUser.rows[0]?.name || 'there'),
          reason: 'account-overwritten',
        }).catch(() => { /* alert delivery must never fail the request */ });
      }

      res.json({
        success: true,
        role: role || 'student',
        user: { id: effectiveUserId, name: name.trim(), email: normalizedEmail, role: role || 'student', avatar },
      student: studentRecord ? {
        id: studentRecord.id,
        userId: studentRecord.user_id,
        name: studentRecord.name,
        email: studentRecord.email,
        avatar: studentRecord.avatar,
        college: studentRecord.college,
        degree: studentRecord.degree,
        branch: studentRecord.branch,
        semester: studentRecord.semester,
        cgpa: parseFloat(studentRecord.cgpa),
        graduationYear: studentRecord.graduation_year,
        targetRole: studentRecord.target_role,
        bio: studentRecord.bio,
        resumeUploaded: studentRecord.resume_uploaded,
        resumeName: studentRecord.resume_name,
        declaredSkills: studentRecord.declared_skills || [],
        verifiedSkills: studentRecord.verified_skills || [],
        assessmentCompleted: studentRecord.assessment_completed,
        readinessScore: studentRecord.readiness_score,
      } : null,
    });
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* connection may be dead */ }
      client.release();
    }
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ==========================================
// 12. FORGOT PASSWORD & OTP DISPATCH
// ==========================================
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Look up user or student name for personalized email greeting
    const userRes = await query(
      `SELECT name FROM users WHERE LOWER(email) = $1
       UNION
       SELECT name FROM students WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    const userName = userRes.rows.length > 0 ? userRes.rows[0].name : 'S.P.A.R.K. Member';

    // Generate random secure 6-digit numeric OTP (e.g. 748291)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const id = `otp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clear any previous pending OTPs for this email to prevent collisions
    await query('DELETE FROM otp_verifications WHERE LOWER(email) = $1', [normalizedEmail]);

    // Store new OTP in PostgreSQL
    await query(
      `INSERT INTO otp_verifications (id, email, otp, expires_at, verified)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [id, normalizedEmail, otp, expiresAt]
    );

    // Dispatch real email via Gmail SMTP
    const mailResult = await sendOtpEmail({
      toEmail: normalizedEmail,
      otp,
      userName,
    });

    if (!mailResult.success) {
      return res.status(500).json({
        error: `Could not send email: ${mailResult.error}. Please verify network connectivity.`,
      });
    }

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [normalizedEmail, 'OTP_SENT_VIA_GMAIL', JSON.stringify({ messageId: mailResult.messageId, devFallback: !!mailResult.devOtp })]
    );

    res.json({
      success: true,
      message: `A 6-digit verification code has been successfully emailed to ${normalizedEmail}.`,
      expiresInMinutes: 10,
      // Dev convenience only: lets the local UI display the OTP when SMTP is unreachable.
      ...(mailResult.devOtp && process.env.NODE_ENV !== 'production' ? { devOtp: mailResult.devOtp } : {}),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch verification code.' });
  }
});

router.post('/auth/verify-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cleanOtp = otp.toString().trim();

  try {
    const result = await query(
      `SELECT * FROM otp_verifications
       WHERE LOWER(email) = $1 AND otp = $2 AND expires_at > CURRENT_TIMESTAMP AND verified = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, cleanOtp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired OTP code. Please check your email or request a new code.',
      });
    }

    // Mark verified
    await query('UPDATE otp_verifications SET verified = TRUE WHERE id = $1', [result.rows[0].id]);

    res.json({
      success: true,
      message: 'OTP verified successfully! You can now choose your new password.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'OTP verification failed.' });
  }
});

router.post('/auth/reset-password', async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cleanOtp = otp.toString().trim();

  try {
    // Confirm valid verified OTP
    const otpRes = await query(
      `SELECT * FROM otp_verifications
       WHERE LOWER(email) = $1 AND otp = $2 AND verified = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, cleanOtp]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({
        error: 'Unauthorized. You must verify the OTP before updating your password.',
      });
    }

    // Remove OTP to prevent reuse
    await query('DELETE FROM otp_verifications WHERE LOWER(email) = $1', [normalizedEmail]);

    // Persist the new bcrypt hash — the reset must actually change the credential
    const newHash = await hashPassword(newPassword);
    await query(
      `UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2`,
      [newHash, normalizedEmail]
    );

    // Send confirmation email
    const userRes = await query(
      `SELECT name FROM users WHERE LOWER(email) = $1
       UNION
       SELECT name FROM students WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );
    const userName = userRes.rows.length > 0 ? userRes.rows[0].name : 'S.P.A.R.K. Member';

    await sendPasswordResetSuccessEmail({
      toEmail: normalizedEmail,
      userName,
    });

    // Security alert: a credential change must always notify the account owner.
    await sendSecurityAlertEmail({
      toEmail: normalizedEmail,
      userName,
      reason: 'password-changed',
    }).catch(() => { /* alert delivery must never fail the reset */ });

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [normalizedEmail, 'PASSWORD_RESET_COMPLETED', JSON.stringify({ timestamp: new Date() })]
    );

    res.json({
      success: true,
      message: 'Your password has been successfully updated! You can now sign in with your new password.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Password reset failed.' });
  }
});

// ==========================================
// 11b. LOGIN (JWT CREDENTIAL VERIFICATION)
// ==========================================
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const userRes = await query(
      `SELECT id, name, email, role, avatar, password_hash FROM users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );
    const user = userRes.rows[0];

    // Generic error message — don't reveal whether the email exists
    const INVALID = 'Invalid email or password.';
    if (!user || !user.password_hash) {
      // Burn a bcrypt round anyway to keep timing consistent and mitigate
      // user-enumeration via response-latency analysis.
      await comparePassword('timing-equalizer', '$2a$12$C6UzMDM.H6dfI/f/IKcEe.6bIiV9CnQ4uJ9GhKPR5rEE0EqHmgRiO');
      return res.status(401).json({ error: INVALID });
    }

    const passwordOk = await comparePassword(password, user.password_hash);
    if (!passwordOk) {
      await query(
        `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
        [normalizedEmail, 'LOGIN_FAILED', JSON.stringify({ timestamp: new Date() })]
     );
      return res.status(401).json({ error: INVALID });

    }

    // Record login and issue the session token
    await query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [user.id, 'LOGIN_SUCCESS', JSON.stringify({ timestamp: new Date() })]
    );

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      message: `Welcome back, ${user.name}!`,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed.' });
  }
});

// ==========================================
// 12. DATABASE ADMIN EXPLORER (BROWSER GUI)
// ==========================================
const ALLOWED_ADMIN_TABLES = [
  'users',
  'students',
  'assessments',
  'roadmaps',
  'jobs',
  'applications',
  'mous',
  'problem_statements',
  'otp_verifications',
  'audit_logs'
];

router.get('/admin/tables-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const summary: any[] = [];
    for (const table of ALLOWED_ADMIN_TABLES) {
      try {
        const countRes = await query(`SELECT count(*) as count FROM ${table}`);
        summary.push({
          tableName: table,
          count: parseInt(countRes.rows[0].count, 10),
        });
      } catch (err) {
        // Table might not exist yet
      }
    }
    res.json({ tables: summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/admin/table-data/:tableName', requireAuth, async (req: Request, res: Response) => {
  const tableName = String(req.params.tableName);
  if (!ALLOWED_ADMIN_TABLES.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid or restricted table.' });
  }

  try {
    const dataRes = await query(`SELECT * FROM ${tableName} ORDER BY 1 DESC LIMIT 100`);
    const colsRes = await query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = $1 
       ORDER BY ordinal_position`,
      [tableName]
    );

    res.json({
      tableName,
      columns: colsRes.rows,
      rows: dataRes.rows,
      totalReturned: dataRes.rows.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a row in a table (Browser Admin GUI)
// Full database admin GUI — JWT-protected, never expose without auth
router.put('/admin/table-data/:tableName/:id', requireAuth, async (req: Request, res: Response) => {
  const tableName = String(req.params.tableName);
  const id = String(req.params.id);
  if (!ALLOWED_ADMIN_TABLES.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid or restricted table.' });
  }

  const updates = req.body;
  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields provided for update.' });
  }

  try {
    // Check valid columns for this table to prevent SQL injection
    const colsRes = await query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = $1`,
      [tableName]
    );
    const validCols = new Map(colsRes.rows.map(c => [c.column_name, c.data_type]));

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [col, val] of Object.entries(updates)) {
      if (col === 'id' || !validCols.has(col)) continue;

      const dataType = validCols.get(col);
      if (dataType === 'jsonb' || dataType === 'json') {
        setClauses.push(`"${col}" = $${paramIndex}`);
        values.push(typeof val === 'string' ? val : JSON.stringify(val));
      } else {
        setClauses.push(`"${col}" = $${paramIndex}`);
        values.push(val === '' ? null : val);
      }
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid columns provided to update.' });
    }

    values.push(id);
    const sql = `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Record with id "${id}" not found in "${tableName}".` });
    }

    res.json({ success: true, updatedRow: result.rows[0] });
  } catch (error: any) {
    console.error(`Error updating ${tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a row from a table (Browser Admin GUI)
router.delete('/admin/table-data/:tableName/:id', requireAuth, async (req: Request, res: Response) => {
  const tableName = String(req.params.tableName);
  const id = String(req.params.id);
  if (!ALLOWED_ADMIN_TABLES.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid or restricted table.' });
  }

  try {
    const result = await query(`DELETE FROM "${tableName}" WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Record with id "${id}" not found.` });
    }
    res.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error(`Error deleting from ${tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 13. STUDENT ID CARD OCR VERIFICATION (GEMINI VISION)
// ==========================================
router.post('/verify/student-id-card', upload.single('idCard'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Please provide an image of the student ID card.' });
  }

  const base64Data = file.buffer.toString('base64');
  const mimeType = file.mimetype || 'image/jpeg';
  const apiKey = process.env.GEMINI_API_KEY;

  let ocrResult = {
    verified: false,
    institutionName: '',
    studentName: '',
    rollNumber: '',
    validThruYear: '',
    confidenceScore: 0,
    accreditationNote: '',
    rawSummary: '',
    rawOcrText: '',
    ocrEngine: 'Tesseract OCR'
  };

  // 1. Try Gemini Vision if an API key is configured
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an AI Document Scanner & ID Card Verification Specialist for the Government & Academic portal S.P.A.R.K.
Analyze the provided Student ID Card image.
Extract the following fields in strict JSON format:
{
  "isStudentIdCard": boolean,
  "institutionName": "Full College or University Name",
  "studentName": "Full Name of Student",
  "rollNumber": "Roll Number or PRN or Student ID",
  "validThruYear": "Graduation Year or Validity (e.g. 2026 or 2024-2028)",
  "confidenceScore": number between 70 and 99
}
Return ONLY pure JSON without markdown backticks.`
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: 'application/json'
            }
          })
        }
      );

      if (response.ok) {
        const data: any = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const parsed = JSON.parse(textContent);
          if (parsed.isStudentIdCard) {
            ocrResult = {
              verified: true,
              institutionName: parsed.institutionName || 'Verified Higher Education Institution',
              studentName: parsed.studentName || 'Student Candidate',
              rollNumber: parsed.rollNumber || `PRN-${Date.now().toString().slice(-6)}`,
              validThruYear: parsed.validThruYear || '2026',
              confidenceScore: parsed.confidenceScore || 95,
              accreditationNote: 'Gemini Vision Authenticated Student Identity',
              rawSummary: `Successfully extracted credentials for ${parsed.studentName || 'Student'} at ${parsed.institutionName || 'Institute'}.`,
              rawOcrText: `Institution: ${parsed.institutionName}\nName: ${parsed.studentName}\nRoll: ${parsed.rollNumber}\nValidity: ${parsed.validThruYear}`,
              ocrEngine: 'Google Gemini 1.5 Flash Vision'
            };
          }
        }
      }
    } catch (geminiErr) {
      console.warn('Gemini Vision API error, falling back to local Tesseract OCR engine:', geminiErr);
    }
  }

  // 2. Real Local Optical Character Recognition with Tesseract.js
  if (!ocrResult.verified) {
    try {
      console.log('Initiating local Tesseract OCR worker on uploaded card image...');
      const worker = await createWorker('eng');
      const ocrOutput = await worker.recognize(file.buffer);
      await worker.terminate();

      const rawText = ocrOutput.data.text || '';
      const confidence = Math.round(ocrOutput.data.confidence || 85);
      console.log('Tesseract OCR extracted text length:', rawText.length, 'Confidence:', confidence);

      const lines = rawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 1);

      let extractedCollege = '';
      let extractedName = '';
      let extractedRoll = '';
      let extractedYear = '';

      // A. Extract College / University Name by fuzzy matching against national database
      const cleanRawLower = rawText.toLowerCase();

      // 1. Check if any verified institution from our directory is mentioned in rawText
      let matchedInstitutionObj: any = null;
      for (const inst of VERIFIED_INSTITUTIONS) {
        const instNameLower = inst.name.toLowerCase();
        const instCodeLower = inst.code.toLowerCase();

        // Check for code match (e.g. "IITB", "COEP", "BITS", "AIIMS")
        if (instCodeLower.length >= 3 && new RegExp(`\\b${instCodeLower}\\b`, 'i').test(rawText)) {
          matchedInstitutionObj = inst;
          extractedCollege = inst.name;
          break;
        }

        // Check key title segments
        const titleCore = instNameLower.split('(')[0].trim();
        if (titleCore.length > 6 && cleanRawLower.includes(titleCore)) {
          matchedInstitutionObj = inst;
          extractedCollege = inst.name;
          break;
        }
      }



      // 2. Scan lines for educational keywords and assemble full multi-line institution name
      if (!extractedCollege) {
        const collegeKeywords = ['college', 'university', 'institute', 'polytechnic', 'technology', 'vidyapith', 'academy', 'engineering', 'school', 'coep', 'iit', 'nit', 'bits', 'iiit', 'campus'];
        const excludeKeywords = ['student', 'identity', 'card', 'signature', 'holder', 'authority', 'department', 'branch', 'choose', 'upload', 'verify', 'click'];
        
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          const lower = l.toLowerCase();
          if (collegeKeywords.some(kw => lower.includes(kw)) && !excludeKeywords.some(kw => lower.includes(kw))) {
            let fullCollege = l;
            // Check if previous line is parent educational society or trust
            if (i > 0) {
              const prev = lines[i - 1];
              if (/society|trust|sanstha|shikshan|mandal|foundation|education/i.test(prev)) {
                fullCollege = prev + ' ' + fullCollege;
              }
            }
            // Check if next line contains campus location / city
            if (i < lines.length - 1) {
              const next = lines[i + 1];
              if (/mumbai|pune|delhi|bengaluru|chennai|hyderabad|kharghar|kolkata|campus|road|nagar/i.test(next)) {
                fullCollege = fullCollege.replace(/,+$/, '') + ', ' + next;
              }
            }
            extractedCollege = fullCollege.replace(/^[^\w]+|[^\w]+$/g, '').trim();
            break;
          }
        }
      }

      // B. Extract Roll / PRN / ID Number
      // 1. First priority: look for alphanumeric enrollment code containing both letters and digits (e.g. STACPCOE25618, PRN-638552, 21BCE042)
      for (const line of lines) {
        const m = line.match(/\b([A-Z]{2,10}\d{3,12}|\d{6,12}|[A-Z]{2,6}-\d{4,10})\b/i);
        if (m && !/^(202[0-9]|203[0-9])$/.test(m[1])) {
          extractedRoll = m[1].trim().toUpperCase();
          break;
        }
      }

      // 2. Second priority: look for explicitly labeled Roll/PRN numbers on the SAME line
      if (!extractedRoll) {
        const labeledMatch = rawText.match(/(?:PRN|Roll(?:\s*No\.?)?|Reg(?:\s*No\.?)?|Enrollment(?:\s*No\.?)?|ID\s*No\.?|Student\s*ID)[^\S\r\n]*[:#\-.]?[^\S\r\n]*([A-Za-z0-9\/-]{4,25})/i);
        if (labeledMatch && labeledMatch[1] && !['card', 'photo', 'verification'].includes(labeledMatch[1].toLowerCase())) {
          extractedRoll = labeledMatch[1].trim().toUpperCase();
        }
      }

      // C. Extract Student Name
      const namePrefixMatch = rawText.match(/(?:Name|Student\s*Name|Candidate(?:\s*Name)?)\s*[:#\-.]?\s*([A-Za-z\s.]{3,35})/i);
      if (
        namePrefixMatch && 
        namePrefixMatch[1] && 
        !namePrefixMatch[1].toLowerCase().includes('university') && 
        !namePrefixMatch[1].toLowerCase().includes('college') &&
        !namePrefixMatch[1].toLowerCase().includes('student')
      ) {
        extractedName = namePrefixMatch[1].trim();
      } else {
        // Search lines for candidate personal name (2-4 capitalized English words)
        const uiNoiseWords = ['my id', 'myid', 'student id', 'identity', 'card', 'valid', 'signature', 'date', 'birth', 'dob', 'holder', 'authority', 'choose', 'photo', 'drag', 'supports', 'acpatil', 'kharghar', 'mumbai', 'verification'];
        for (const line of lines) {
          const lower = line.toLowerCase();
          if (uiNoiseWords.some(kw => lower === kw || lower.startsWith(kw))) continue;
          if (extractedCollege && extractedCollege.toLowerCase().includes(lower)) continue;
          if (extractedRoll && extractedRoll.toLowerCase() === lower) continue;
          
          if (/^[A-Za-z\s.]+$/.test(line)) {
            const words = line.split(/\s+/).filter(w => w.length > 1);
            if (words.length >= 2 && words.length <= 4) {
              extractedName = line.trim();
              break;
            }
          }
        }
      }

      // D. Extract Validity / Year
      const yearMatch = rawText.match(/(?:202[3-9]|203[0-2])(?:\s*[-–]\s*(?:202[4-9]|203[0-5]|\d{2}))?/);
      if (yearMatch) {
        extractedYear = yearMatch[0].trim();
      } else {
        const batchMatch = rawText.match(/(?:Batch|Valid\s*(?:till|thru|up\s*to)?|Class\s*of)\s*[:#\-.]?\s*([A-Za-z0-9\s\/-]{4,15})/i);
        if (batchMatch && batchMatch[1]) {
          extractedYear = batchMatch[1].trim();
        }
      }

      // If optical text was read from the card image:
      if (rawText.trim().length > 5) {
        // Cross-validate the extracted college against the accredited registry.
        // A strong registry hit boosts confidence and pins the canonical name;
        // an unverified extraction is flagged for manual review instead of silently passing.
        let registryMatch: ReturnType<typeof verifyInstitutionServer> | null = null;
        if (extractedCollege) {
          registryMatch = verifyInstitutionServer(extractedCollege);
          if (registryMatch.verified) {
            extractedCollege = registryMatch.matchedName || extractedCollege;  // canonical registry name
          }
        } else if (matchedInstitutionObj) {
          registryMatch = {
            verified: true,
            level: 'verified',
            confidence: 95,
            matchedName: matchedInstitutionObj.name,
            matchedCode: matchedInstitutionObj.code,
            matchedType: matchedInstitutionObj.type,
            accreditation: matchedInstitutionObj.accreditation,
            note: `Verified ${matchedInstitutionObj.type} Institution: ${matchedInstitutionObj.name}`,
          };
          extractedCollege = matchedInstitutionObj.name;
        }

        const confidenceBoost = registryMatch?.verified ? 8 : 0;
        const note = registryMatch?.verified
          ? `${registryMatch.note} (${registryMatch.accreditation})`
          : registryMatch?.level === 'recognized'
          ? `${registryMatch.note}`
          : 'Optical Character Recognition (Tesseract Neural Engine) — institution not in accredited registry';

        const finalInstitutionVerified = registryMatch?.verified || false;
        const finalLevel = registryMatch?.level || 'unverified';

        ocrResult = {
          verified: true,
          institutionName: extractedCollege || 'Accredited Higher Education Institution',
          studentName: extractedName || 'Candidate Student',
          rollNumber: extractedRoll || `PRN-${Math.floor(100000 + Math.random() * 900000)}`,
          validThruYear: extractedYear || '2026',
          confidenceScore: Math.min(99, Math.max(74, confidence + confidenceBoost)),
          accreditationNote: note,
          institutionVerified: finalInstitutionVerified,
          registryMatchName: registryMatch?.matchedName || null,
          registryMatchLevel: finalLevel,
          reviewQueued: !finalInstitutionVerified,
          rawSummary: finalInstitutionVerified
            ? `Card authenticated against accredited registry: ${registryMatch!.matchedName}.`
            : `Extracted optically — queued for manual institutional review.`,
          rawOcrText: rawText.trim(),
          ocrEngine: 'Tesseract.js Neural OCR v7.0.0'
        } as any;

        // Unverified/recognized extractions enter the govt review queue
        if (!finalInstitutionVerified) {
          await query(
            `INSERT INTO verification_reviews (
              id, kind, submitted_value, level, confidence, matched_name, student_id, student_name, roll_number, details
            ) VALUES ($1, 'id_card', $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING`,
            [
              `vr-id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
              extractedCollege || 'Unknown institution',
              finalLevel,
              Math.min(99, Math.max(74, confidence + confidenceBoost)),
              registryMatch?.matchedName || null,
              req.params.id || null,
              extractedName || null,
              extractedRoll || null,
              JSON.stringify({ rawTextPreview: rawText.slice(0, 300), at: new Date() }),
            ]
          ).catch(() => {});
        }
      }
    } catch (tessErr) {
      console.error('Tesseract OCR error:', tessErr);
    }
  }

  // 3. Fallback if both engines produced empty text (e.g. blank image or extreme blur).
  // Honest result: NOT verified — the student must retake a clearer photo.
  if (!ocrResult.verified) {
    ocrResult = {
      verified: false,
      institutionName: '',
      studentName: '',
      rollNumber: '',
      validThruYear: '',
      confidenceScore: 0,
      accreditationNote: 'Could not read the card — please retake in better lighting',
      institutionVerified: false,
      registryMatchLevel: 'unverified',
      rawSummary: 'No readable text detected. Ensure the full card is visible, in focus, and evenly lit.',
      rawOcrText: '',
      ocrEngine: 'Tesseract.js Neural OCR v7.0.0'
    } as any;
  }

  res.json({
    success: true,
    result: ocrResult
  });
});

// ==========================================
// 15. LIVE JOBS — MULTI-SOURCE AGGREGATOR WITH FALLBACK CHAIN
// (Adzuna India → SerpAPI Google Jobs → LinkedIn → Curated DB)
// ==========================================
router.get('/linkedin/live-jobs', async (req: Request, res: Response) => {
  const keywords = (req.query.keywords as string) || 'Full Stack Engineer';
  const location = (req.query.location as string) || 'India';

  try {
    const result = await aggregateJobs(keywords, location);

    res.json({
      success: result.jobs.length > 0,
      count: result.jobs.length,
      source: result.source,
      attempts: result.attempts,
      keywords,
      location,
      jobs: result.jobs,
      message: result.jobs.length === 0
        ? 'All live sources unavailable — showing curated campus opportunities.'
        : `Fetched ${result.jobs.length} live postings via ${result.source}.`,
    });
  } catch (error: any) {
    res.json({ success: true, fallback: true, jobs: [], message: error.message });
  }
});

// ==========================================
// 16. DIGITAL BADGES & VERIFICATIONS
// ==========================================
router.get('/badges/:studentId', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM digital_badges WHERE student_id = $1 ORDER BY issued_at DESC',
      [req.params.studentId]
    );
    const badges = result.rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      title: r.title,
      category: r.category,
      issuedAt: r.issued_at,
      scorePercentage: r.score_percentage,
      verificationHash: r.verification_hash,
      issuer: r.issuer,
      skills: r.skills || [],
    }));
    res.json(badges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/badges', async (req: Request, res: Response) => {
  const { studentId, title, category, scorePercentage, skills, issuer } = req.body;
  try {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256')
      .update(`${studentId}-${title}-${scorePercentage}-${Date.now()}`)
      .digest('hex');
    const id = `badge-${Date.now().toString().slice(-6)}`;

    const result = await query(
      `INSERT INTO digital_badges (
        id, student_id, title, category, score_percentage, verification_hash, issuer, skills
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [id, studentId, title, category, scorePercentage, hash, issuer || 'S.P.A.R.K. National Skill Registry (NEP 2020)', JSON.stringify(skills || [])]
    );

    res.json({ success: true, badge: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 17. CODING TELEMETRY (GITHUB & LEETCODE)
// ==========================================
router.get('/telemetry/github/:username', async (req: Request, res: Response) => {
  const username = String(req.params.username);
  try {
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'SPARK-Skill-Analytics' }
    });
    
    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: 'GitHub profile not found' });
    }

    const userData: any = await ghRes.json();

    // Fetch user repos to inspect primary languages
    const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=10`, {
      headers: { 'User-Agent': 'SPARK-Skill-Analytics' }
    });
    
    let topLanguages: string[] = ['TypeScript', 'Python', 'Go'];
    if (reposRes.ok) {
      const repos = (await reposRes.json()) as any[];
      const langs = repos.map((r: any) => r.language).filter(Boolean);
      topLanguages = Array.from(new Set(langs)).slice(0, 4) as string[];
    }

    const telemetry = {
      githubRepos: userData.public_repos || 0,
      githubCommits: Math.max(userData.public_repos * 14, 42),
      topLanguages: topLanguages.length ? topLanguages : ['TypeScript', 'JavaScript'],
      followers: userData.followers || 0,
      telemetryScoreBonus: Math.min(15, Math.floor((userData.public_repos || 0) * 1.5) + 3),
      lastSyncedAt: new Date().toISOString()
    };

    res.json({ success: true, telemetry });
  } catch (error: any) {
    // Intelligent offline demo fallback if rate-limited
    res.json({
      success: true,
      telemetry: {
        githubRepos: 18,
        githubCommits: 284,
        topLanguages: ['TypeScript', 'Python', 'Go', 'Docker'],
        followers: 24,
        telemetryScoreBonus: 12,
        lastSyncedAt: new Date().toISOString()
      }
    });
  }
});

router.get('/telemetry/leetcode/:username', async (req: Request, res: Response) => {
  const { username } = req.params;
  try {
    // Query public LeetCode GraphQL
    const lcRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        query: `
          query userProblemsSolved($username: String!) {
            matchedUser(username: $username) {
              submitStatsGlobal {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
            }
          }
        `,
        variables: { username }
      })
    });

    if (lcRes.ok) {
      const data: any = await lcRes.json();
      const counts = data.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
      if (counts) {
        const all = counts.find((c: any) => c.difficulty === 'All')?.count || 0;
        const easy = counts.find((c: any) => c.difficulty === 'Easy')?.count || 0;
        const med = counts.find((c: any) => c.difficulty === 'Medium')?.count || 0;
        const hard = counts.find((c: any) => c.difficulty === 'Hard')?.count || 0;

        return res.json({
          success: true,
          telemetry: {
            leetcodeSolved: all,
            leetcodeEasy: easy,
            leetcodeMedium: med,
            leetcodeHard: hard,
            telemetryScoreBonus: Math.min(18, Math.floor(all / 10) + 4),
            lastSyncedAt: new Date().toISOString()
          }
        });
      }
    }
  } catch (e) {}

  // High-fidelity fallback for offline demo / demo accounts
  res.json({
    success: true,
    telemetry: {
      leetcodeSolved: 146,
      leetcodeEasy: 64,
      leetcodeMedium: 68,
      leetcodeHard: 14,
      telemetryScoreBonus: 14,
      lastSyncedAt: new Date().toISOString()
    }
  });
});

// ==========================================
// 18. ALUMNI NETWORK — applications, university verification desk,
//     verified directory, mentorship requests, 1-on-1 chat rooms,
//     and mentor "Fast-Track" opportunities.
// ==========================================

const alumniRowMapper = (r: any) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  collegeId: r.college_id,
  collegeName: r.college_name,
  degree: r.degree,
  graduationYear: r.graduation_year,
  company: r.company,
  designation: r.designation,
  experienceYears: r.experience_years ?? 0,
  expertise: r.expertise || [],
  bio: r.bio || '',
  linkedinUrl: r.linkedin_url || undefined,
  avatarUrl: r.avatar_url || undefined,
  mentorCapacity: r.mentor_capacity ?? 5,
  activeMentees: r.active_mentees ?? 0,
  rating: r.rating ? Number(r.rating) : undefined,
  verifiedAt: r.verified_at,
});

// ── 18a. Alumni application (3 workflows: student / alumni / university) ────
router.post('/alumni/apply', async (req: Request, res: Response) => {
  const b = req.body || {};
  const required = ['fullName', 'email', 'collegeId', 'collegeName', 'degree', 'graduationYear', 'company', 'designation'];
  const missing = required.filter(k => !b[k]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }
  if (!['alumni', 'student', 'university'].includes(b.workflow)) {
    return res.status(400).json({ error: 'workflow must be one of: student, alumni, university' });
  }

  try {
    // Simple per-email rate/duplication guard: one active application per email
    const existing = await query(
      `SELECT id, status FROM alumni_applications WHERE LOWER(email) = LOWER($1) AND status = 'pending' LIMIT 1`,
      [b.email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An application for this email is already pending review.' });
    }

    const id = `alumapp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO alumni_applications (
        id, full_name, email, phone, college_id, college_name, degree, graduation_year,
        company, designation, experience_years, linkedin_url, github_url, expertise,
        bio, credential_doc_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id, b.fullName, b.email, b.phone || null, b.collegeId, b.collegeName,
        b.degree, parseInt(b.graduationYear, 10) || new Date().getFullYear(),
        b.company, b.designation, parseInt(b.experienceYears, 10) || 0,
        b.linkedinUrl || null, b.githubUrl || null,
        JSON.stringify(Array.isArray(b.expertise) ? b.expertise : []),
        b.bio || null, b.credentialDocName || null,
      ]
    );

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [b.email, 'ALUMNI_APPLICATION_SUBMITTED', JSON.stringify({ id, workflow: b.workflow, college: b.collegeName })]
    ).catch(() => {});

    res.status(201).json({ success: true, id, message: 'Application submitted to your institution for verification.' });

    // Provision a login-capable user row immediately (role 'alumni') so the
    // graduate can sign in while their application awaits desk review. Their
    // alumni_id becomes resolvable after approval (18c keeps email in sync).
    try {
      await query(
        `INSERT INTO users (id, name, email, role, avatar)
         VALUES ($1, $2, $3, 'alumni', $4)
         ON CONFLICT (email) DO UPDATE SET role = 'alumni', name = EXCLUDED.name`,
        [
          `usr-alum-${Date.now().toString(36)}`,
          b.fullName,
          String(b.email).toLowerCase(),
          `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(b.fullName)}`,
        ]
      );
    } catch (userErr: any) {
      console.warn('[alumni] user provisioning skipped:', userErr.message);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const mapAlumniApplication = (r: any) => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone || undefined,
  collegeId: r.college_id,
  collegeName: r.college_name,
  degree: r.degree,
  graduationYear: r.graduation_year,
  company: r.company,
  designation: r.designation,
  experienceYears: r.experience_years ?? 0,
  linkedinUrl: r.linkedin_url || undefined,
  githubUrl: r.github_url || undefined,
  expertise: r.expertise || [],
  bio: r.bio || '',
  credentialDocName: r.credential_doc_name || undefined,
  status: r.status,
  reviewNote: r.review_note || undefined,
  createdAt: r.created_at,
});

const mapMentorshipRequest = (r: any) => ({
  id: r.id,
  alumniId: r.alumni_id,
  studentId: r.student_id,
  studentName: r.student_name,
  studentCollege: r.student_college || '',
  studentBranch: r.student_branch || '',
  message: r.message,
  status: r.status,
  roomId: r.room_id || undefined,
  respondedAt: r.responded_at || undefined,
  createdAt: r.created_at,
});

const mapFastTrackJob = (r: any) => ({
  id: r.id,
  alumniId: r.alumni_id,
  alumniName: r.alumni_name,
  title: r.title,
  company: r.company,
  type: r.type === 'Full-Time' ? 'Full-Time' : 'Internship',
  stipendOrSalary: r.stipend_or_salary || '',
  location: r.location || '',
  description: r.description || '',
  expiryDays: r.expiry_days ?? 14,
  postedAt: r.posted_at,
  applicantIds: r.applicant_ids || [],
});

// ── 18b. University verification desk: pending applications for a college ──
router.get('/alumni/applications', async (req: Request, res: Response) => {
  const collegeId = String(req.query.collegeId || '');
  if (!collegeId) {
    return res.status(400).json({ error: 'collegeId query parameter is required.' });
  }
  try {
    const r = await query(
      `SELECT * FROM alumni_applications WHERE college_id = $1 AND status = 'pending' ORDER BY created_at ASC`,
      [collegeId]
    );
    res.json(r.rows.map(mapAlumniApplication));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18c. University desk: approve or reject an application ─────────────────
router.patch('/alumni/applications/:id/review', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { decision, reviewNote } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
  }

  try {
    const appRes = await query(`SELECT * FROM alumni_applications WHERE id = $1`, [id]);
    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }
    const app = appRes.rows[0];
    if (app.status !== 'pending') {
      return res.status(409).json({ error: 'Application has already been reviewed.' });
    }

    if (decision === 'rejected') {
      await query(
        `UPDATE alumni_applications SET status = 'rejected', review_note = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id, reviewNote || 'Did not match institutional records.']
      );
      await query(
        `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
        ['university-desk', 'ALUMNI_APPLICATION_REJECTED', JSON.stringify({ id })]
      ).catch(() => {});
      return res.json({ success: true, status: 'rejected' });
    }

    // Approve → mint the verified alumni record (directory inclusion)
    const alumniId = `alum-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO alumni (
        id, application_id, name, email, college_id, college_name, degree, graduation_year,
        company, designation, experience_years, expertise, bio, linkedin_url, avatar_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (email) DO UPDATE SET
        company = EXCLUDED.company,
        designation = EXCLUDED.designation,
        expertise = EXCLUDED.expertise,
        bio = EXCLUDED.bio,
        linkedin_url = EXCLUDED.linkedin_url,
        verified_at = CURRENT_TIMESTAMP`,
      [
        alumniId, id, app.full_name, app.email, app.college_id, app.college_name,
        app.degree, app.graduation_year, app.company, app.designation,
        app.experience_years, JSON.stringify(app.expertise || []), app.bio, app.linkedin_url,
        `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(app.full_name)}`,
      ]
    );
    await query(
      `UPDATE alumni_applications SET status = 'approved', review_note = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, reviewNote || 'Verified against institutional records.']
    );
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      ['university-desk', 'ALUMNI_APPLICATION_APPROVED', JSON.stringify({ id, alumniId })]
    ).catch(() => {});
    emitEvent({
      type: 'notification',
      title: 'Alumni verified 🎓',
      message: `${app.full_name} is now a verified mentor in the directory.`,
      data: { alumniId, collegeId: app.college_id },
    });
    res.json({ success: true, status: 'approved', alumniId });
  } catch (error: any) {
    console.error('[alumni-desk] approval failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── 18d. Public verified alumni directory (with search) ────────────────
router.get('/alumni/directory', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const collegeId = String(req.query.collegeId || '');
  try {
    const params: any[] = [];
    const conds: string[] = [];
    if (collegeId) { params.push(collegeId); conds.push(`college_id = $${params.length}`); }
    if (q) {
      params.push(`%${q}%`);
      const col = `$${params.length}`;
      conds.push(`(LOWER(name) LIKE ${col} OR LOWER(company) LIKE ${col} OR LOWER(designation) LIKE ${col} OR LOWER(expertise::text) LIKE ${col})`);
    }
    const where = conds.length ? ` WHERE ${conds.join(' AND ')}` : '';
    const r = await query(`SELECT a.*, (SELECT COUNT(*)::int FROM mentorship_requests mr WHERE mr.alumni_id = a.id AND mr.status = 'accepted') AS active_mentees FROM alumni a${where} ORDER BY a.verified_at DESC LIMIT 200`, params);
    res.json(r.rows.map(alumniRowMapper));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18e. Mentor profile by id (student request flow) ───────────────────
router.get('/alumni/profile/:id', async (req: Request, res: Response) => {
  try {
    const r = await query(`SELECT a.*, (SELECT COUNT(*)::int FROM mentorship_requests mr WHERE mr.alumni_id = a.id AND mr.status = 'accepted') AS active_mentees FROM alumni a WHERE a.id = $1`, [String(req.params.id)]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Alumnus not found.' });
    res.json(alumniRowMapper(r.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});// ── 18e2. Resolve MY mentor profile by login email (dashboard bootstrap) ──
router.get('/alumni/me', async (req: Request, res: Response) => {
  const email = String(req.query.email || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'email is required.' });
  try {
    const r = await query(`SELECT a.*, (SELECT COUNT(*)::int FROM mentorship_requests mr WHERE mr.alumni_id = a.id AND mr.status = 'accepted') AS active_mentees FROM alumni a WHERE LOWER(a.email) = $1 LIMIT 1`, [email]);
    if (r.rows.length === 0) {
      // Not yet approved by their university desk — report application state
      const pend = await query(
        `SELECT status FROM alumni_applications WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1`,
        [email]
      );
      const status = pend.rows[0]?.status || 'none';
      return res.json({
        found: false,
        applicationStatus: status,
        message: status === 'pending'
          ? 'Your application is awaiting review by your institution\u2019s verification desk.'
          : status === 'rejected'
          ? 'Your application was not approved. Contact your institution\u2019s alumni office.'
          : 'No alumni application on record — register through the Alumni Registration portal.',
      });
    }
    res.json({ found: true, profile: alumniRowMapper(r.rows[0]) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18f. Student sends a mentorship request ──────────────────────────
router.post('/mentorship/request', async (req: Request, res: Response) => {
  const { alumniId, studentId, studentName, studentCollege, studentBranch, message } = req.body || {};
  if (!alumniId || !studentId || !message) {
    return res.status(400).json({ error: 'alumniId, studentId and message are required.' });
  }

  try {
    // Demo-safety: make sure the student also exists as a real user/student row
    // so the mentor can accept and chat without hitting foreign-data gaps.
    const userExists = await query('SELECT id FROM users WHERE id = $1 OR LOWER(email) = LOWER($2) LIMIT 1', [studentId, studentId]);
    if (userExists.rows.length === 0 && studentId.includes('@')) {
      const uid = `usr-${Date.now().toString().slice(-6)}`;
      await query(
        `INSERT INTO users (id, name, email, role, avatar) VALUES ($1,$2,$3,'student',$4)
         ON CONFLICT (email) DO NOTHING`,
        [uid, studentName || 'Student', String(studentId).toLowerCase(), `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(studentName || 'Student')}`]
      );
      const stRes = await query('SELECT id FROM students WHERE LOWER(email) = LOWER($1) LIMIT 1', [studentId]);
      if (stRes.rows.length === 0) {
        await query(
          `INSERT INTO students (id, user_id, name, email, avatar, college, degree, branch, semester, cgpa, graduation_year, target_role)
           VALUES ($1,$2,$3,$4,$5,$6,'B.Tech','Computer Science & Engineering',6,7.5,2027,'Full Stack Cloud Engineer')
           ON CONFLICT (email) DO NOTHING`,
          [`std-${Date.now().toString().slice(-6)}`, uid, studentName || 'Student', String(studentId).toLowerCase(), `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(studentName || 'Student')}`, studentCollege || 'Institute of Engineering & Technology']
        );
      }
    }

    // Duplicate guard: one pending request per student→mentor pair
    const dup = await query(
      `SELECT id FROM mentorship_requests WHERE alumni_id = $1 AND student_id = $2 AND status = 'pending' LIMIT 1`,
      [alumniId, studentId]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending request with this mentor.' });
    }

    // Mentor capacity check
    const mentorRes = await query(`SELECT mentor_capacity FROM alumni WHERE id = $1`, [alumniId]);
    if (mentorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor not found.' });
    }
    const acceptedRes = await query(
      `SELECT COUNT(*)::int AS n FROM mentorship_requests WHERE alumni_id = $1 AND status = 'accepted'`,
      [alumniId]
    );
    if (acceptedRes.rows[0].n >= mentorRes.rows[0].mentor_capacity) {
      return res.status(409).json({ error: 'This mentor has reached their mentee capacity.' });
    }

    const id = `mreq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO mentorship_requests (id, alumni_id, student_id, student_name, student_college, student_branch, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, alumniId, studentId, studentName || 'Student', studentCollege || null, studentBranch || null, message]
    );
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [studentId, 'MENTORSHIP_REQUESTED', JSON.stringify({ id, alumniId })]
    ).catch(() => {});
    emitEvent({
      type: 'notification',
      title: 'New mentorship request',
      message: `${studentName || 'A student'} wants to connect with you.`,
      targetUserId: alumniId,
      data: { requestId: id },
    });
    res.status(201).json({ success: true, id, message: 'Mentorship request sent.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18g. Requests inbox (mentor side or student tracking) ─────────────
router.get('/mentorship/requests', async (req: Request, res: Response) => {
  const alumniId = String(req.query.alumniId || '');
  const studentId = String(req.query.studentId || '');
  if (!alumniId && !studentId) {
    return res.status(400).json({ error: 'alumniId or studentId is required.' });
  }
  try {
    const params: any[] = [];
    let sql = `SELECT * FROM mentorship_requests`;
    if (alumniId) { params.push(alumniId); sql += ` WHERE alumni_id = $${params.length}`; }
    else { params.push(studentId); sql += ` WHERE student_id = $${params.length}`; }
    sql += ` ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC`;
    const r = await query(sql, params);
    res.json(r.rows.map(mapMentorshipRequest));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18h. Mentor accepts/declines — acceptance provisions a chat room ───
router.patch('/mentorship/requests/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { decision } = req.body || {};
  if (!['accepted', 'declined'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'accepted' or 'declined'" });
  }

  try {
    const rr = await query(`SELECT * FROM mentorship_requests WHERE id = $1`, [id]);
    if (rr.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    const request = rr.rows[0];
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'Request has already been answered.' });
    }

    let roomId: string | undefined;
    if (decision === 'accepted') {
      roomId = `mroom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await query(
        `INSERT INTO mentorship_rooms (id, alumni_id, student_id, request_id) VALUES ($1,$2,$3,$4)`,
        [roomId, request.alumni_id, request.student_id, id]
      );
      await query(
        `INSERT INTO mentorship_messages (id, room_id, sender_role, sender_name, body)
         VALUES ($1,$2,'mentor',$3,$4)`,
        [`msg-${Date.now().toString(36)}-sys`, roomId, 'Mentorship Room', `Welcome ${request.student_name}! This is your private mentorship room — discuss career pathways, interviews, referrals, or schedule a call.`]
      );
    }

    await query(
      `UPDATE mentorship_requests SET status = $2, room_id = $3, responded_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, decision, roomId || null]
    );
    emitEvent({
      type: 'notification',
      title: decision === 'accepted' ? 'Mentorship accepted 🎉' : 'Mentorship request declined',
      message: decision === 'accepted'
        ? 'Your mentor accepted! Your private chat room is ready.'
        : 'Your mentorship request was declined. Try another mentor from the directory.',
      targetUserId: request.student_id,
      data: { requestId: id, roomId },
    });
    res.json({ success: true, status: decision, roomId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18i. Chat rooms for a user (mentor or student side) ───────────────
router.get('/mentorship/rooms', async (req: Request, res: Response) => {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).json({ error: 'userId is required.' });
  try {
    const r = await query(
      `SELECT mr.id, mr.alumni_id, mr.student_id, mr.created_at,
              a.name AS alumni_name, a.designation AS alumni_designation, a.company AS alumni_company, a.avatar_url AS alumni_avatar,
              (SELECT body FROM mentorship_messages m WHERE m.room_id = mr.id ORDER BY m.at DESC LIMIT 1) AS last_message,
              (SELECT at FROM mentorship_messages m WHERE m.room_id = mr.id ORDER BY m.at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*)::int FROM mentorship_messages m WHERE m.room_id = mr.id) AS message_count
       FROM mentorship_rooms mr
       JOIN alumni a ON a.id = mr.alumni_id
       WHERE mr.alumni_id = $1 OR mr.student_id = $2
       ORDER BY mr.created_at DESC`,
      [userId, userId]
    );
    res.json(r.rows.map((row: any) => ({
      id: row.id,
      alumniId: row.alumni_id,
      studentId: row.student_id,
      alumniName: row.alumni_name,
      alumniDesignation: row.alumni_designation,
      alumniCompany: row.alumni_company,
      alumniAvatar: row.alumni_avatar,
      lastMessage: row.last_message || undefined,
      lastMessageAt: row.last_message_at || undefined,
      messageCount: row.message_count ?? 0,
      createdAt: row.created_at,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18j. Messages in a room ───────────────────────────────────────────
router.get('/mentorship/rooms/:id/messages', async (req: Request, res: Response) => {
  const roomId = String(req.params.id);
  try {
    const r = await query(
      `SELECT * FROM mentorship_messages WHERE room_id = $1 ORDER BY at ASC LIMIT 500`,
      [roomId]
    );
    res.json(r.rows.map((m: any) => ({
      id: m.id,
      roomId: m.room_id,
      senderRole: m.sender_role,
      senderName: m.sender_name,
      body: m.body,
      at: m.at,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18k. Send a message into a room ───────────────────────────────────
router.post('/mentorship/rooms/:id/messages', async (req: Request, res: Response) => {
  const roomId = String(req.params.id);
  const { senderRole, senderName, body } = req.body || {};
  if (!senderRole || !senderName || !body) {
    return res.status(400).json({ error: 'senderRole, senderName and body are required.' });
  }
  if (!['student', 'mentor'].includes(senderRole)) {
    return res.status(400).json({ error: "senderRole must be 'student' or 'mentor'" });
  }
  try {
    const room = await query(`SELECT * FROM mentorship_rooms WHERE id = $1`, [roomId]);
    if (room.rows.length === 0) return res.status(404).json({ error: 'Room not found.' });

    const msgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const inserted = await query(
      `INSERT INTO mentorship_messages (id, room_id, sender_role, sender_name, body)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [msgId, roomId, senderRole, senderName, body]
    );
    const row = inserted.rows[0];
    const roomRow = room.rows[0];
    emitEvent({
      type: 'notification',
      title: `New message from ${senderName}`,
      message: body.slice(0, 80),
      targetUserId: senderRole === 'mentor' ? roomRow.student_id : roomRow.alumni_id,
      data: { roomId, messageId: msgId },
    });
    res.status(201).json({
      id: row.id, roomId: row.room_id, senderRole: row.sender_role,
      senderName: row.sender_name, body: row.body, at: row.at,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18l. Mentor posts a Fast-Track opportunity ────────────────────────
router.post('/mentorship/fast-track', async (req: Request, res: Response) => {
  const b = req.body || {};
  if (!b.alumniId || !b.title || !b.company) {
    return res.status(400).json({ error: 'alumniId, title and company are required.' });
  }
  try {
    const id = `ftj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO fast_track_jobs (id, alumni_id, alumni_name, title, company, type, stipend_or_salary, location, description, expiry_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, b.alumniId, b.alumniName || 'Alumni Mentor', b.title, b.company, b.type || 'Internship', b.stipendOrSalary || null, b.location || null, b.description || null, parseInt(b.expiryDays, 10) || 14]
    );
    emitEvent({
      type: 'new_job',
      title: 'Fast-Track Opportunity',
      message: `${b.title} @ ${b.company} — exclusive to the mentorship network`,
      data: { fastTrackId: id },
    });
    res.status(201).json({ success: true, id, message: 'Fast-Track opportunity posted to your mentees.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18m. Fast-Track opportunities for a student (mentorship network) ──
router.get('/mentorship/fast-track', async (req: Request, res: Response) => {
  const studentId = String(req.query.studentId || '');
  try {
    let rows: any[] = [];
    if (studentId) {
      const r = await query(
        `SELECT DISTINCT f.* FROM fast_track_jobs f
         JOIN mentorship_rooms mr ON mr.alumni_id = f.alumni_id
         WHERE mr.student_id = $1
         ORDER BY f.posted_at DESC`,
        [studentId]
      );
      rows = r.rows;
    } else {
      const r = await query(`SELECT * FROM fast_track_jobs ORDER BY posted_at DESC LIMIT 50`);
      rows = r.rows;
    }
    res.json(rows.map(mapFastTrackJob));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── 18n. Student applies to a fast-track opportunity ─────────────────
router.post('/mentorship/fast-track/:id/apply', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId is required.' });
  try {
    const existing = await query(`SELECT applicant_ids FROM fast_track_jobs WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found.' });
    const applicants: string[] = existing.rows[0].applicant_ids || [];
    if (applicants.includes(studentId)) {
      return res.json({ success: true, applicantIds: applicants, alreadyApplied: true });
    }
    const updated = await query(
      `UPDATE fast_track_jobs SET applicant_ids = $2::jsonb WHERE id = $1 RETURNING applicant_ids`,
      [id, JSON.stringify([...applicants, studentId])]
    );
    res.json({ success: true, applicantIds: updated.rows[0].applicant_ids });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

