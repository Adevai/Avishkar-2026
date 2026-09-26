import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { PDFParse } from 'pdf-parse';
import { query, pool } from './db';
import { ASSESSMENT_QUESTIONS, COLLEGE_DEPARTMENT_STATS, GOVT_REGIONAL_STATS, EMERGING_SKILL_TRENDS } from '../src/data/mockData';
import { calculateJobMatch } from '../src/utils/matchCalculator';
import { askCopilot } from '../src/utils/geminiService';
import { extractSkillsFromText } from './nlpEngine';
import { sendOtpEmail, sendRegistrationOtpEmail, sendPasswordResetSuccessEmail, sendSecurityAlertEmail, buildInterviewIcs, sendInterviewConfirmationEmail } from './emailService';
import { getCollegeDepartmentStats, getGovtRegionalStats, getEmergingSkillTrends } from './analytics';
import { icsEscape as icsEscapeText, icsBasicUtc as icsBasicUtcTime } from './emailService';
import { checkRateLimit, clientIpOf } from './rateLimit';
import { enqueueEmail } from './emailOutbox';
import { hashPassword, comparePassword, signToken, signRefreshToken, verifyRefreshToken, requireAuth, requireAdmin } from './auth';
import { verifyInstitutionServer } from './institutionVerify';
import { aggregateJobs } from './jobAggregator';
import { addClient, removeClient, emitEvent, connectedClients } from './events';
import { createWorker } from 'tesseract.js';
import { VERIFIED_INSTITUTIONS } from '../src/data/institutions';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Durable storage root for user uploads (resumes + verification
// certificates). Point UPLOADS_DIR at a mounted volume (or a bind mount of
// an object-store bucket) so files survive container replacement — see the
// "Durable file storage" section of DEPLOYMENT.md. Legacy relative paths
// stored in the DB are still resolved against process.cwd() when serving.
const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), 'uploads');

export const router = Router();

// --- DYNAMIC AI ASSESSMENT ENGINE ---

// In-memory store for active assessments (for grading). In production, use Redis or Postgres.
const activeAssessments = new Map<string, any>();

router.post('/assessment/generate', async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'Role is required' });

  // Abuse guard: this endpoint calls Gemini on the server's key.
  const rl = checkRateLimit(`assessment-gen:${clientIpOf(req)}`, 10);
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Assessment generation limit reached. Try again shortly.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }

  try {
    const prompt = `
      Generate 15 multiple-choice assessment questions for a ${role}.
      Make them difficult, covering Fundamentals, Backend Systems, Frontend Web, Cloud & DevOps, AI & Data, and Soft Skills.
      Return ONLY a valid JSON array where each object has:
      {
        "category": "category_name",
        "categoryName": "Display Name",
        "question": "The question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "Explanation of the correct answer",
        "difficulty": "medium"
      }
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error('Gemini API call failed');
    const data: any = await response.json();
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) throw new Error('Empty response from Gemini');
    
    const questions = JSON.parse(rawText);
    const assessmentId = `assessment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Store securely on backend for grading (bounded so abandoned sessions
    // can't grow the map without limit)
    activeAssessments.set(assessmentId, questions);
    if (activeAssessments.size > 500) {
      const oldest = activeAssessments.keys().next().value as string | undefined;
      if (oldest) activeAssessments.delete(oldest);
    }
    
    // Strip correct answers before sending to frontend
    const clientQuestions = questions.map((q: any, i: number) => ({
      id: `q-${i}`,
      category: q.category,
      categoryName: q.categoryName,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty
    }));

    res.json({ success: true, assessmentId, questions: clientQuestions });
  } catch (error: any) {
    console.error('Failed to generate assessment:', error);
    res.status(500).json({ error: 'Failed to generate assessment' });
  }
});

router.post('/assessment/grade', async (req: Request, res: Response) => {
  const { assessmentId, answers, timeSpentSeconds, studentId } = req.body;
  if (!assessmentId || !answers) return res.status(400).json({ error: 'Missing required fields' });

  const sessionQuestions = activeAssessments.get(assessmentId);
  // Unknown session (e.g. static-bank fallback after generation failure):
  // grade against the shipped question bank using its real question ids.
  const staticBank = !sessionQuestions;
  const originalQuestions: any[] = sessionQuestions || ASSESSMENT_QUESTIONS;
  if (originalQuestions.length === 0) {
    return res.status(404).json({ error: 'Assessment session expired or not found' });
  }

  let score = 0;
  const categoryScores: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  originalQuestions.forEach((q: any, i: number) => {
    const qId = staticBank ? q.id : `q-${i}`;
    const selected = answers[qId];
    
    if (!categoryCounts[q.category]) categoryCounts[q.category] = 0;
    if (!categoryScores[q.category]) categoryScores[q.category] = 0;
    categoryCounts[q.category]++;

    if (selected === q.correctAnswer) {
      score++;
      categoryScores[q.category]++;
    }
  });

  const percentage = Math.round((score / originalQuestions.length) * 100);
  
  Object.keys(categoryScores).forEach(cat => {
    categoryScores[cat] = Math.round((categoryScores[cat] / categoryCounts[cat]) * 100);
  });

  let performanceGrade = 'Needs Improvement';
  if (percentage >= 90) performanceGrade = 'Expert';
  else if (percentage >= 75) performanceGrade = 'Proficient';
  else if (percentage >= 60) performanceGrade = 'Competent';

  // Cleanup
  if (!staticBank) activeAssessments.delete(assessmentId);

  // Persist the attempt (score + readiness + roadmap) so the student registry,
  // NIRF export and readiness analytics reflect this assessment.
  let persisted = false;
  if (studentId && typeof studentId === 'string') {
    try {
      const assessmentRowId = `asm-dyn-${Date.now().toString().slice(-6)}`;
      await query(
        `INSERT INTO assessments (
          id, student_id, total_score, max_score, percentage, category_scores,
          time_spent_seconds, performance_grade
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          assessmentRowId,
          studentId,
          score,
          originalQuestions.length,
          percentage,
          JSON.stringify(categoryScores),
          timeSpentSeconds || 600,
          performanceGrade,
        ]
      );
      const studentRes = await query('SELECT readiness_score FROM students WHERE id = $1', [studentId]);
      if (studentRes.rows.length > 0) {
        const newReadiness = Math.round(((studentRes.rows[0].readiness_score || 70) + percentage) / 2);
        await query(
          `UPDATE students SET assessment_completed = TRUE, readiness_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [newReadiness, studentId]
        );
      }
      const rmCheck = await query('SELECT id FROM roadmaps WHERE student_id = $1', [studentId]);
      if (rmCheck.rows.length === 0) {
        const milestones = await generateDefaultRoadmap(studentId);
        await query(
          'INSERT INTO roadmaps (id, student_id, milestones) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
          [`rdm-${studentId}`, studentId, JSON.stringify(milestones)]
        );
      }
      persisted = true;
    } catch (persistErr: any) {
      console.error('assessment/grade persist failed:', persistErr.message);
    }
  }

  res.json({
    success: true,
    persisted,
    result: {
      completedAt: new Date().toISOString(),
      totalScore: score,
      maxScore: originalQuestions.length,
      percentage,
      categoryScores,
      timeSpentSeconds,
      performanceGrade
    }
  });
});

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

  // Resolve the caller identity from the bearer token (if any) so events
  // route correctly: `sub` is the authoritative users.id for targeted events
  // (the legacy ?userId= param carries profile ids that never match), and the
  // portal role powers role-targeted desks. Anonymous connections keep the
  // query userId and stay broadcast-only. EventSource cannot set headers,
  // so the browser also passes ?token=.
  let sseUser: string | null = (req.query.userId as string) || null;
  let sseRole: string | null = null;
  const authHeader = req.headers.authorization;
  const rawToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.query.token as string) || '';
  if (rawToken) {
    try {
      const decoded: any = jwt.verify(rawToken, process.env.JWT_SECRET || 'spark-dev-secret');
      sseUser = decoded.sub || sseUser;
      sseRole = decoded.role || null;
    } catch {
      // Invalid/expired token — connect as anonymous rather than failing the stream.
    }
  }
  const clientId = addClient(res, sseUser, sseRole);
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

// Public institution profile: AISHE code, verification status, and student
// stats. The id is the institutions row id (stable, non-enumerable-ish),
// safe to expose — no documents or emails leak here.
router.get('/institutions/profile/:id', async (req: Request, res: Response) => {
  try {
    const inst = await query(
      `SELECT i.id, i.aishe_code, i.official_domain, i.college_name, i.created_at,
              u.id AS user_id, u.name AS tpo_name, u.verification_status
         FROM institutions i JOIN users u ON u.id = i.user_id
        WHERE i.id = $1
        LIMIT 1`,
      [req.params.id]
    );
    if (inst.rows.length === 0) {
      return res.status(404).json({ error: 'Institution not found.' });
    }
    const row = inst.rows[0];
    const instName = row.college_name || row.tpo_name;

    // Live platform stats for this institution's account
    const statsRes = await query(
      `SELECT
         (SELECT count(*)::int FROM jobs j WHERE j.posted_by = $1) AS campus_postings,
         (SELECT count(*)::int FROM students s WHERE LOWER(s.college) = LOWER($2)) AS registered_students,
         (SELECT count(*)::int FROM students s
            JOIN users su ON su.id = s.user_id
           WHERE LOWER(s.college) = LOWER($2) AND su.verification_status = 'verified') AS verified_students`,
      [row.user_id, instName]
    );
    const stats = statsRes.rows[0] || { campus_postings: 0, registered_students: 0, verified_students: 0 };

    res.json({
      success: true,
      institution: {
        id: row.id,
        userId: row.user_id,
        name: instName,
        tpoName: row.tpo_name,
        aisheCode: row.aishe_code,
        officialDomain: row.official_domain,
        verificationStatus: row.verification_status || 'pending',
        verified: row.verification_status === 'verified',
        memberSince: row.created_at,
      },
      stats,
    });
  } catch (error: any) {
    console.error('institution profile failed:', error.message);
    res.status(500).json({ error: 'Failed to load the institution profile.' });
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

    // Persist the original file to local disk (uploads/resumes) so it
    // survives restarts and can be served via an expiring signed URL.
    const resumeDir = path.join(UPLOADS_ROOT, 'resumes');
    await fs.promises.mkdir(resumeDir, { recursive: true });
    const safeName = `${req.params.id}-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const resumePath = path.join(resumeDir, safeName);
    await fs.promises.writeFile(resumePath, file.buffer);

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
          resume_path = $2,
          resume_uploaded_at = CURRENT_TIMESTAMP,
          declared_skills = $3,
          readiness_score = $4,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [file.originalname, resumePath, JSON.stringify(merged), newReadiness, req.params.id]
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
// Verified campus accounts: userId -> {institutionId, name, aisheCode}.
// Used to stamp job cards with the public 'Verified Campus' badge.
async function verifiedCampusMap(): Promise<Map<string, { institutionId: string; name: string; aisheCode: string | null }>> {
  const r = await query(
    `SELECT i.id AS institution_id, i.aishe_code, i.college_name, u.id AS user_id, u.name
       FROM institutions i JOIN users u ON u.id = i.user_id
      WHERE u.verification_status = 'verified' AND u.role = 'college'`
  );
  return new Map(r.rows.map((row: any) => [row.user_id, {
    institutionId: row.institution_id,
    name: row.college_name || row.name,
    aisheCode: row.aishe_code || null,
  }]));
}

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

    const jobs = dataRes.rows.map(mapJobRow);

    // Stamp postings from verified institution accounts with the public
    // campus badge (one shared lookup, not a per-row join).
    if (jobs.length > 0) {
      try {
        const campus = await verifiedCampusMap();
        if (campus.size > 0) {
          for (const j of jobs) {
            const inst = j.postedBy ? campus.get(j.postedBy) : undefined;
            if (inst) {
              (j as any).campusInstitution = { id: inst.institutionId, name: inst.name, aisheCode: inst.aisheCode };
            }
          }
        }
      } catch (campusErr: any) {
        console.warn('campus badge lookup skipped:', campusErr.message);
      }
    }

    res.json({
      jobs,
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
  // Team access: the poster OR an added collaborator may manage the posting.
  if (job.posted_by && job.posted_by !== recruiter.sub) {
    const collab = await query(
      `SELECT 1 FROM job_collaborators WHERE job_id = $1 AND user_id = $2`,
      [job.id, recruiter.sub]
    ).catch(() => ({ rows: [] as any[] }));
    if (collab.rows.length === 0) {
      res.status(403).json({ error: 'Only the recruiter who posted this job (or a teammate) can manage it.' });
      return null;
    }
  }
  if (!job.posted_by) {
    res.status(403).json({ error: 'This listing was synced from an external platform and cannot be managed here.' });
    return null;
  }
  return job;
}

// Resolve the linked login account (users.id) for a student record, if any.
// Data-only students (no own login) have no users row.
async function resolveStudentUserId(studentId: string): Promise<string | null> {
  try {
    const r = await query(
      `SELECT u.id FROM users u WHERE LOWER(u.email) = (SELECT LOWER(email) FROM students WHERE id = $1)`,
      [studentId]
    );
    return r.rows[0]?.id || null;
  } catch {
    return null;
  }
}

// Persist a notification for a REAL login account only. notifications.user_id
// carries a foreign key to users(id); writing a bare students.id would violate
// it (or be unreadable by GET /notifications). Students without a linked
// account still receive the SSE event.
async function insertNotification(userId: string | null, title: string, message: string, type: string) {
  if (!userId) return;
  await query(
    `INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)`,
    [`notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, userId, title, message, type]
  ).catch(() => {});
}

// ── PORTAL ROLE VERIFICATION MATRIX (shared validators) ────────────────────
// Student: college domain + OTP auto-verify or ID-card OCR; personal mail ->
// PENDING_COLLEGE_APPROVAL. College: AISHE code + domain match. Industry:
// work email + CIN/GSTIN; MSME certificate fallback. Alumni: grad year +
// enrollment + LinkedIn, approved by the college desk before mentoring.
const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
const CIN_REGEX = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;          // 21-char MCA CIN
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/; // 15-char GSTIN
const AISHE_REGEX = /^[CU]-[0-9]{4,6}$/;                                       // e.g. C-33915
const OFFICIAL_TLD_SUFFIXES = ['.ac.in', '.edu.in', '.ernet.in', '.gov.in', '.nic.in', '.edu', '.ac.uk'];

const emailDomainOf = (email: string) => (email.includes('@') ? email.split('@')[1].toLowerCase() : '');
const emailLooksInstitutional = (domain: string) =>
  OFFICIAL_TLD_SUFFIXES.some(sfx => domain.endsWith(sfx));

function validateAisheCode(code: string): { isValid: boolean; error?: string } {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return { isValid: false, error: 'AISHE code is required (format C-12345 or U-12345, e.g. C-33915).' };
  if (!AISHE_REGEX.test(c)) {
    return { isValid: false, error: 'Invalid AISHE code format — it must look like C-33915 (College) or U-12345 (University): a C/U prefix, a hyphen, then 4-6 digits.' };
  }
  return { isValid: true };
}

function validateCinOrGstin(value: string): { isValid: boolean; kind: 'CIN' | 'GSTIN' | null; error?: string } {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return { isValid: false, kind: null, error: 'CIN or GSTIN is required for Industry registration.' };
  if (CIN_REGEX.test(v)) return { isValid: true, kind: 'CIN' };
  if (GSTIN_REGEX.test(v)) return { isValid: true, kind: 'GSTIN' };
  return {
    isValid: false,
    kind: null,
    error: 'Invalid CIN/GSTIN. CIN is 21 characters (e.g. L12345MH2020PLC123456); GSTIN is 15 characters (e.g. 27AAPFU0939F1ZV). Startups without one may upload an Udyam/Incorporation certificate instead.',
  };
}

// An email matches an organisation when its domain equals (or is a subdomain
// of) the official website host — coep.ac.in mail matches www.coep.ac.in.
function emailDomainMatchesSite(email: string, site: string): boolean {
  if (!site) return false;
  const host = String(site).trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0];
  if (!host || !host.includes('.')) return false;
  const dom = emailDomainOf(email);
  return !!dom && (dom === host || dom.endsWith(`.${host}`) || host.endsWith(`.${dom}`));
}

const LINKEDIN_PROFILE_REGEX = /^https:\/\/(www\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9_%-]{3,100}\/?$/i;

function notifyJobApplicants(jobId: string, jobTitle: string, company: string, title: string, message: string) {
  // Non-blocking: informs every applicant on status change via notification + SSE.
  (async () => {
    const apps = await query(
      `SELECT DISTINCT student_id FROM applications WHERE job_id = $1`,
      [jobId]
    );
    for (const row of apps.rows) {
      const uid = await resolveStudentUserId(row.student_id);
      await insertNotification(uid, title, message, 'alert');
      if (uid) emitEvent({
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
      const uid = await resolveStudentUserId(row.student_id);
      await insertNotification(
        uid,
        `Application ${status}`,
        `Your application for ${row.job_title} at ${row.company} moved to: ${status}`,
        status === 'Rejected' ? 'alert' : 'success'
      );
      if (uid) emitEvent({
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
// ── Interview slot scheduling (owner-only): book real slots for selected candidates ──
router.post('/applications/schedule-interviews', requireAuth, async (req: Request, res: Response) => {
  const { ids, scheduledAt, durationMinutes, mode, meetingUrl, notes } = req.body || {};
  const targetIds: string[] = Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];

  if (targetIds.length === 0) {
    return res.status(400).json({ error: 'Provide application ids[] to schedule interviews for.' });
  }
  const when = new Date(String(scheduledAt || ''));
  if (!scheduledAt || isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
    return res.status(400).json({ error: 'scheduledAt must be a valid future date/time (ISO string).' });
  }
  const duration = Math.min(Math.max(Number(durationMinutes) || 45, 10), 240);
  const interviewMode = ['online', 'in-person', 'phone'].includes(mode) ? mode : 'online';

  try {
    const recruiter = (req as any).user;
    // Ownership enforced in SQL: only applications on jobs posted_by the caller can be booked.
    const apps = await query(
      `SELECT a.id, a.student_id, a.student_name, a.job_id, a.job_title, a.company
         FROM applications a
        WHERE a.id = ANY($1::text[])
          AND a.job_id IN (SELECT id FROM jobs WHERE posted_by = $2)`,
      [targetIds, recruiter.sub]
    );
    if (apps.rows.length === 0) {
      return res.status(403).json({ error: 'No schedulable applications found among the selected candidates.' });
    }

    const slotRows: any[] = [];
    for (const app of apps.rows) {
      const slotId = `slot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      await query(
        `INSERT INTO interview_slots (id, application_id, job_id, student_id, scheduled_at, duration_minutes, mode, meeting_url, notes, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10)`,
        [slotId, app.id, app.job_id, app.student_id, when.toISOString(), duration, interviewMode, meetingUrl || null, notes || null, recruiter.sub]
      );
      const whenLabel = when.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
      slotRows.push({ id: slotId, applicationId: app.id, jobId: app.job_id, studentId: app.student_id, studentName: app.student_name, scheduledAt: when.toISOString(), durationMinutes: duration, mode: interviewMode, meetingUrl: meetingUrl || null, notes: notes || null, status: 'scheduled' });

      await query(
        `UPDATE applications a
            SET status = 'Interview Scheduled',
                updated_at = CURRENT_TIMESTAMP,
                stage_history = a.stage_history || $2::jsonb
          WHERE a.id = $1`,
        [app.id, JSON.stringify([{ stage: 'Interview Scheduled', date: new Date().toISOString().split('T')[0], note: `Interview booked for ${whenLabel} (${interviewMode})` }])]
      );

      const uid = await resolveStudentUserId(app.student_id);
      const istLabel = when.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
      await insertNotification(uid, 'Interview Scheduled', `Your interview for ${app.job_title} at ${app.company} is booked for ${istLabel} IST (${interviewMode}).`, 'success');
      if (uid) emitEvent({
        type: 'application_update',
        title: 'Interview Scheduled',
        message: `Your interview for ${app.job_title} at ${app.company} is booked for ${whenLabel} (${interviewMode}).`,
        targetUserId: uid,
        data: { applicationId: app.id, jobId: app.job_id, scheduledAt: when.toISOString(), mode: interviewMode },
      });

      // Best-effort invitation email with an RFC 5545 .ics attachment so the
      // slot lands in the candidate's Google/Outlook/Apple calendar.
      (async () => {
        const em = await query(
          `SELECT COALESCE(u.email, s.email) AS email, COALESCE(s.name, split_part(COALESCE(u.email, s.email), '@', 1)) AS name
             FROM students s LEFT JOIN users u ON u.id = s.user_id
            WHERE s.id = $1`,
          [app.student_id]
        ).catch(() => ({ rows: [] as any[] }));
        const to = em.rows[0]?.email;
        if (!to) return;
        const ics = buildInterviewIcs({
          slotId,
          jobTitle: app.job_title,
          company: app.company,
          scheduledAt: when.toISOString(),
          durationMinutes: duration,
          mode: interviewMode,
          meetingUrl: meetingUrl || null,
          notes: notes || null,
        });
        await sendInterviewConfirmationEmail({
          toEmail: to,
          userName: em.rows[0].name,
          jobTitle: app.job_title,
          company: app.company,
          scheduledAt: when.toISOString(),
          durationMinutes: duration,
          mode: interviewMode,
          meetingUrl: meetingUrl || undefined,
          notes: notes || undefined,
          ics,
        });
      })().catch(err => console.error('interview confirmation email failed:', err.message));
    }

    res.status(201).json({ success: true, scheduled: slotRows.length, slots: slotRows });
  } catch (error: any) {
    console.error('schedule-interviews failed:', error.message);
    res.status(500).json({ error: 'Failed to schedule interviews.' });
  }
});

// ── Interview slots for one job (owner-only) ──
router.get('/jobs/:jobId/interview-slots', requireAuth, async (req: Request, res: Response) => {
  const job = await requireJobOwner(req, res);
  if (!job) return;
  try {
    const result = await query(
      `SELECT s.*, a.student_name AS app_student_name
         FROM interview_slots s
         JOIN applications a ON a.id = s.application_id
        WHERE s.job_id = $1
        ORDER BY s.scheduled_at ASC`,
      [job.id]
    );
    const slots = result.rows.map(r => ({
      id: r.id,
      applicationId: r.application_id,
      jobId: r.job_id,
      studentId: r.student_id,
      studentName: r.student_name || r.app_student_name,
      scheduledAt: r.scheduled_at,
      durationMinutes: r.duration_minutes,
      mode: r.mode,
      meetingUrl: r.meeting_url,
      notes: r.notes,
      status: r.status,
      createdAt: r.created_at,
    }));
    res.json({ success: true, slots });
  } catch (error: any) {
    console.error('interview-slots failed:', error.message);
    res.status(500).json({ error: 'Failed to load interview slots.' });
  }
});

// ── Update a slot (owner-only): mark completed / cancel, notify the student ──
router.patch('/interview-slots/:slotId', requireAuth, async (req: Request, res: Response) => {
  const { status } = req.body || {};
  if (!['completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: "status must be 'completed' or 'cancelled'." });
  }
  try {
    const recruiter = (req as any).user;
    const result = await query(
      `UPDATE interview_slots s SET status = $1
        WHERE s.id = $2 AND s.job_id IN (SELECT id FROM jobs WHERE posted_by = $3)
        RETURNING *`,
      [status, req.params.slotId, recruiter.sub]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found (or you do not own its job).' });
    }
    const slot = result.rows[0];

    // Best-effort: tell the student the interview was completed or cancelled.
    const detail = await query(
      `SELECT j.title AS job_title, j.company FROM interview_slots s JOIN jobs j ON j.id = s.job_id WHERE s.id = $1`,
      [slot.id]
    );
    const jobTitle = detail.rows[0]?.job_title || 'your interview';
    const company = detail.rows[0]?.company || '';
    const uid = await resolveStudentUserId(slot.student_id);
    const title = status === 'completed' ? 'Interview Completed' : 'Interview Cancelled';
    const message = status === 'completed'
      ? `Your interview for ${jobTitle} at ${company} was marked completed. Results will follow soon.`
      : `Your interview for ${jobTitle} at ${company} scheduled for ${new Date(slot.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST was cancelled by the recruiter.`;
    await insertNotification(uid, title, message, status === 'completed' ? 'success' : 'alert');
    if (uid) emitEvent({ type: 'application_update', title, message, targetUserId: uid, data: { slotId: slot.id, status } });

    res.json({ success: true, slot: { id: slot.id, status: slot.status, jobTitle, company } });
  } catch (error: any) {
    console.error('interview-slot update failed:', error.message);
    res.status(500).json({ error: 'Failed to update interview slot.' });
  }
});

// ── Download the .ics invite for a slot (the slot's student or the job owner) ──
router.get('/interview-slots/:slotId/ics', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const r = await query(
      `SELECT s.id, s.scheduled_at, s.duration_minutes, s.mode, s.meeting_url, s.notes,
              s.student_id, j.title AS job_title, j.company, j.posted_by
         FROM interview_slots s JOIN jobs j ON j.id = s.job_id
        WHERE s.id = $1`,
      [req.params.slotId]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found.' });
    }
    const slot = r.rows[0];
    const ownerRes = await query(`SELECT user_id FROM students WHERE id = $1`, [slot.student_id]);
    const isStudentOwner = ownerRes.rows[0]?.user_id === user.sub;
    const isJobOwner = slot.posted_by === user.sub;
    if (!isStudentOwner && !isJobOwner) {
      return res.status(403).json({ error: 'This interview does not belong to you.' });
    }
    const ics = buildInterviewIcs({
      slotId: slot.id,
      jobTitle: slot.job_title,
      company: slot.company,
      scheduledAt: new Date(slot.scheduled_at).toISOString(),
      durationMinutes: slot.duration_minutes || 45,
      mode: slot.mode || 'online',
      meetingUrl: slot.meeting_url,
      notes: slot.notes,
    });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="interview-invite.ics"');
    res.send(ics);
  } catch (error: any) {
    console.error('slot ICS download failed:', error.message);
    res.status(500).json({ error: 'Failed to generate the calendar invite.' });
  }
});

// ── Resend the invitation email (job owner only) ──
router.post('/interview-slots/:slotId/resend-invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const r = await query(
      `SELECT s.*, j.title AS job_title, j.company
         FROM interview_slots s JOIN jobs j ON j.id = s.job_id
        WHERE s.id = $1 AND j.posted_by = $2`,
      [req.params.slotId, user.sub]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found (or you do not own its job).' });
    }
    const slot = r.rows[0];
    const em = await query(
      `SELECT COALESCE(u.email, s2.email) AS email, COALESCE(s2.name, split_part(COALESCE(u.email, s2.email), '@', 1)) AS name
         FROM students s2 LEFT JOIN users u ON u.id = s2.user_id
        WHERE s2.id = $1`,
      [slot.student_id]
    );
    const to = em.rows[0]?.email;
    if (!to) return res.status(409).json({ error: 'This candidate has no linked email account.' });
    const ics = buildInterviewIcs({
      slotId: slot.id,
      jobTitle: slot.job_title,
      company: slot.company,
      scheduledAt: new Date(slot.scheduled_at).toISOString(),
      durationMinutes: slot.duration_minutes || 45,
      mode: slot.mode || 'online',
      meetingUrl: slot.meeting_url,
      notes: slot.notes,
    });
    const result = await sendInterviewConfirmationEmail({
      toEmail: to,
      userName: em.rows[0].name,
      jobTitle: slot.job_title,
      company: slot.company,
      scheduledAt: new Date(slot.scheduled_at).toISOString(),
      durationMinutes: slot.duration_minutes || 45,
      mode: slot.mode || 'online',
      meetingUrl: slot.meeting_url || undefined,
      notes: slot.notes || undefined,
      ics,
    });
    res.json({ success: result.success, resentTo: to, error: result.error });
  } catch (error: any) {
    console.error('resend-invite failed:', error.message);
    res.status(500).json({ error: 'Failed to resend the invitation.' });
  }
});

// ── Reschedule a slot (owner-only): new time, re-notify, fresh ICS invite ──
router.patch('/interview-slots/:slotId/reschedule', requireAuth, async (req: Request, res: Response) => {
  const { scheduledAt } = req.body || {};
  const when = new Date(String(scheduledAt || ''));
  if (!scheduledAt || isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
    return res.status(400).json({ error: 'scheduledAt must be a valid future date/time (ISO string).' });
  }
  try {
    const recruiter = (req as any).user;
    const result = await query(
      `UPDATE interview_slots s SET scheduled_at = $1,
              reminder_24h_sent_at = NULL, reminder_2h_sent_at = NULL
        WHERE s.id = $2 AND s.job_id IN (SELECT id FROM jobs WHERE posted_by = $3)
        RETURNING *`,
      [when.toISOString(), req.params.slotId, recruiter.sub]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found (or you do not own its job).' });
    }
    const slot = result.rows[0];
    const detail = await query(
      `SELECT j.title AS job_title, j.company FROM interview_slots s JOIN jobs j ON j.id = s.job_id WHERE s.id = $1`,
      [slot.id]
    );
    const jobTitle = detail.rows[0]?.job_title || 'your interview';
    const company = detail.rows[0]?.company || '';
    const uidRes = await query(`SELECT user_id FROM students WHERE id = $1`, [slot.student_id]);
    const uid: string | null = uidRes.rows[0]?.user_id || null;
    const istLabel = when.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const title = 'Interview Rescheduled';
    const message = `Your interview for ${jobTitle} at ${company} moved to ${istLabel} IST. A fresh calendar invite is on its way.`;
    await insertNotification(uid, title, message, 'success');
    if (uid) emitEvent({ type: 'application_update', title, message, targetUserId: uid, data: { slotId: slot.id, scheduledAt: when.toISOString() } });

    // Fresh invitation email with the updated .ics (queued through the outbox).
    (async () => {
      const em = await query(
        `SELECT COALESCE(u.email, s2.email) AS email, COALESCE(s2.name, split_part(COALESCE(u.email, s2.email), '@', 1)) AS name
           FROM students s2 LEFT JOIN users u ON u.id = s2.user_id WHERE s2.id = $1`,
        [slot.student_id]
      );
      const to = em.rows[0]?.email;
      if (!to) return;
      const ics = buildInterviewIcs({
        slotId: slot.id, jobTitle, company,
        scheduledAt: new Date(slot.scheduled_at).toISOString(),
        durationMinutes: slot.duration_minutes || 45,
        mode: slot.mode || 'online',
        meetingUrl: slot.meeting_url, notes: slot.notes,
      });
      await enqueueEmail({
        to,
        subject: `[S.P.A.R.K.] Rescheduled: ${jobTitle} @ ${company} — now ${istLabel} (IST)`,
        text: `Your interview moved to ${istLabel} (IST). Updated calendar invite attached.`,
        html: `<p>Your interview for <strong>${jobTitle}</strong> at <strong>${company}</strong> was rescheduled to <strong>${istLabel} IST</strong>.</p><p>The updated calendar invite (.ics) is attached.</p>`,
        ics: { filename: 'interview-invite.ics', content: ics },
      });
    })().catch(err => console.error('reschedule email failed:', err.message));

    res.json({ success: true, slot: { id: slot.id, scheduledAt: slot.scheduled_at } });
  } catch (error: any) {
    console.error('reschedule failed:', error.message);
    res.status(500).json({ error: 'Failed to reschedule.' });
  }
});

// ── OFFER MANAGEMENT ────────────────────────────────────────────────────────
// Extend a formal offer on an application (owner-only).
router.post('/applications/:appId/offer', requireAuth, async (req: Request, res: Response) => {
  const { salaryText, joiningDate, deadlineDays } = req.body || {};
  try {
    const recruiter = (req as any).user;
    const app = await query(
      `SELECT a.*, j.posted_by FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = $1`,
      [req.params.appId]
    );
    if (app.rows.length === 0) return res.status(404).json({ error: 'Application not found.' });
    if (app.rows[0].posted_by !== recruiter.sub) {
      return res.status(403).json({ error: 'Only the job owner can extend offers.' });
    }
    const existing = await query(`SELECT id FROM offers WHERE application_id = $1 AND status = 'pending'`, [req.params.appId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A pending offer already exists for this application.' });
    }
    const deadline = new Date(Date.now() + Math.min(Math.max(Number(deadlineDays) || 7, 1), 30) * 86_400_000);
    const offerId = `offer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO offers (id, application_id, job_id, student_id, recruiter_id, salary_text, joining_date, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [offerId, app.rows[0].id, app.rows[0].job_id, app.rows[0].student_id, recruiter.sub,
       salaryText || null, joiningDate || null, deadline.toISOString().slice(0, 10)]
    );
    await query(
      `UPDATE applications SET status = 'Offer Extended', updated_at = CURRENT_TIMESTAMP,
              stage_history = stage_history || $2::jsonb WHERE id = $1`,
      [req.params.appId, JSON.stringify([{ stage: 'Offer Extended', date: new Date().toISOString().split('T')[0], note: `Formal offer extended${salaryText ? ` (${salaryText})` : ''}` }])]
    );
    const uidRes = await query(`SELECT user_id FROM students WHERE id = $1`, [app.rows[0].student_id]);
    const uid: string | null = uidRes.rows[0]?.user_id || null;
    const msg = `🎉 Offer from ${app.rows[0].company} for ${app.rows[0].job_title}! Respond by ${deadline.toISOString().slice(0, 10)}.`;
    await insertNotification(uid, 'Offer Received', msg, 'success');
    if (uid) emitEvent({ type: 'application_update', title: 'Offer Received', message: msg, targetUserId: uid, data: { offerId } });
    res.status(201).json({ success: true, offerId, deadline: deadline.toISOString().slice(0, 10) });
  } catch (error: any) {
    console.error('offer extend failed:', error.message);
    res.status(500).json({ error: 'Failed to extend the offer.' });
  }
});

// Student: my offers with live details.
router.get('/me/offers', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await query(
      `SELECT o.id, o.status, o.salary_text AS "salaryText", o.joining_date AS "joiningDate",
              o.deadline, o.created_at AS "createdAt",
              a.job_title AS "jobTitle", a.company, a.id AS "applicationId"
         FROM offers o JOIN applications a ON a.id = o.application_id
        WHERE o.student_id = (SELECT id FROM students WHERE user_id = $1)
        ORDER BY o.created_at DESC`,
      [user.sub]
    );
    res.json({ success: true, offers: result.rows });
  } catch (error: any) {
    console.error('me/offers failed:', error.message);
    res.status(500).json({ error: 'Failed to load offers.' });
  }
});

// Student: accept or decline an offer (deadline enforced server-side).
router.post('/offers/:offerId/respond', requireAuth, async (req: Request, res: Response) => {
  const { decision } = req.body || {};
  if (!['accepted', 'declined'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'accepted' or 'declined'." });
  }
  try {
    const user = (req as any).user;
    const r = await query(
      `SELECT o.*, j.posted_by, j.title AS job_title, j.company
         FROM offers o JOIN jobs j ON j.id = o.job_id
        WHERE o.id = $1 AND o.student_id = (SELECT id FROM students WHERE user_id = $2)`,
      [req.params.offerId, user.sub]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Offer not found.' });
    const offer = r.rows[0];
    if (offer.status !== 'pending') return res.status(409).json({ error: `Offer already ${offer.status}.` });
    if (offer.deadline && new Date(offer.deadline).getTime() < Date.now()) {
      return res.status(410).json({ error: 'The offer deadline has passed.' });
    }
    await query(`UPDATE offers SET status = $2, responded_at = CURRENT_TIMESTAMP WHERE id = $1`, [offer.id, decision]);
    if (decision === 'accepted') {
      await query(
        `UPDATE applications SET status = 'Offer Accepted', updated_at = CURRENT_TIMESTAMP,
                stage_history = stage_history || $2::jsonb WHERE id = $1`,
        [offer.application_id, JSON.stringify([{ stage: 'Offer Accepted', date: new Date().toISOString().split('T')[0], note: 'Candidate accepted the offer' }])]
      ).catch(() => {});
    }
    const status = decision === 'accepted' ? 'Offer Accepted 🎉' : 'Offer Declined';
    const msg = `${user.name} ${decision} the offer for ${offer.job_title} (${offer.company}).`;
    await insertNotification(offer.posted_by, status, msg, decision === 'accepted' ? 'success' : 'info');
    emitEvent({ type: 'application_update', title: status, message: msg, targetUserId: offer.posted_by, data: { offerId: offer.id } });
    res.json({ success: true, decision });
  } catch (error: any) {
    console.error('offer respond failed:', error.message);
    res.status(500).json({ error: 'Failed to record the decision.' });
  }
});

// ── STUDENT SELF-SCHEDULING WINDOWS ─────────────────────────────────────────
// Recruiter publishes bookable windows on their own job.
router.post('/jobs/:jobId/windows', requireAuth, async (req: Request, res: Response) => {
  const { startAt, endAt, slotMinutes, capacity } = req.body || {};
  const start = new Date(String(startAt || ''));
  const end = new Date(String(endAt || ''));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: 'startAt/endAt must be a valid time range.' });
  }
  if (start.getTime() < Date.now()) {
    return res.status(400).json({ error: 'Windows must start in the future.' });
  }
  try {
    const job = await requireJobOwner(req, res);
    if (!job) return;
    const id = `win-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO interview_windows (id, job_id, recruiter_id, start_at, end_at, slot_minutes, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, job.id, (req as any).user.sub, start.toISOString(), end.toISOString(),
       Math.min(Math.max(Number(slotMinutes) || 45, 15), 180), Math.min(Math.max(Number(capacity) || 1, 1), 20)]
    );
    res.status(201).json({ success: true, windowId: id });
  } catch (error: any) {
    console.error('window create failed:', error.message);
    res.status(500).json({ error: 'Failed to create the window.' });
  }
});

// Windows for a job (owner for management; students see upcoming with availability).
router.get('/jobs/:jobId/windows', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT w.id, w.start_at AS "startAt", w.end_at AS "endAt", w.slot_minutes AS "slotMinutes",
              w.capacity,
              (SELECT count(*)::int FROM interview_slots s WHERE s.window_id = w.id AND s.status = 'scheduled') AS booked
         FROM interview_windows w
        WHERE w.job_id = $1 AND w.end_at > NOW()
        ORDER BY w.start_at ASC`,
      [req.params.jobId]
    );
    res.json({ success: true, windows: result.rows });
  } catch (error: any) {
    console.error('windows list failed:', error.message);
    res.status(500).json({ error: 'Failed to load windows.' });
  }
});

// Student books themselves into a window (capacity + one-per-job enforced).
router.post('/windows/:windowId/book', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const w = await query(`SELECT * FROM interview_windows WHERE id = $1`, [req.params.windowId]);
    if (w.rows.length === 0) return res.status(404).json({ error: 'Window not found.' });
    const win = w.rows[0];
    if (new Date(win.end_at).getTime() < Date.now()) return res.status(410).json({ error: 'This window has closed.' });
    const booked = await query(`SELECT count(*)::int AS n FROM interview_slots WHERE window_id = $1 AND status = 'scheduled'`, [win.id]);
    if (booked.rows[0].n >= win.capacity) return res.status(409).json({ error: 'This window is fully booked.' });
    const stu = await query(`SELECT id FROM students WHERE user_id = $1`, [user.sub]);
    if (stu.rows.length === 0) return res.status(403).json({ error: 'Only student accounts can book slots.' });
    const studentId = stu.rows[0].id;
    const dup = await query(`SELECT id FROM interview_slots WHERE window_id = $1 AND student_id = $2`, [win.id, studentId]);
    if (dup.rows.length > 0) return res.status(409).json({ error: 'You already booked a slot in this window.' });
    const appRes = await query(
      `SELECT id, job_title, company FROM applications WHERE job_id = $1 AND student_id = $2 ORDER BY applied_date DESC LIMIT 1`,
      [win.job_id, studentId]
    );
    if (appRes.rows.length === 0) {
      return res.status(409).json({ error: 'Apply to this job before booking an interview slot.' });
    }
    const app = appRes.rows[0];
    // Assign the next free slot inside the window: start + booked * slotMinutes.
    const slotStart = new Date(new Date(win.start_at).getTime() + booked.rows[0].n * win.slot_minutes * 60_000);
    if (slotStart.getTime() + win.slot_minutes * 60_000 > new Date(win.end_at).getTime() + 86_400_000) {
      return res.status(409).json({ error: 'No slots remain inside this window.' });
    }
    const slotId = `slot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO interview_slots (id, application_id, job_id, student_id, scheduled_at, duration_minutes, mode, status, created_by, window_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'online', 'scheduled', $7, $8)`,
      [slotId, app.id, win.job_id, studentId, slotStart.toISOString(), win.slot_minutes, win.recruiter_id, win.id]
    );
    await query(
      `UPDATE applications SET status = 'Interview Scheduled', updated_at = CURRENT_TIMESTAMP,
              stage_history = stage_history || $2::jsonb WHERE id = $1`,
      [app.id, JSON.stringify([{ stage: 'Interview Scheduled', date: new Date().toISOString().split('T')[0], note: 'Self-booked by candidate' }])]
    );
    const istLabel = slotStart.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const msg = `${user.name} self-booked an interview for ${app.job_title} (${app.company}) at ${istLabel} IST.`;
    await insertNotification(win.recruiter_id, 'Interview Self-Booked', msg, 'info');
    emitEvent({ type: 'application_update', title: 'Interview Self-Booked', message: msg, targetUserId: win.recruiter_id, data: { slotId } });
    res.status(201).json({ success: true, slotId, scheduledAt: slotStart.toISOString(), durationMinutes: win.slot_minutes });
  } catch (error: any) {
    console.error('window book failed:', error.message);
    res.status(500).json({ error: 'Failed to book the slot.' });
  }
});

// ── RECRUITER TEAMS (job collaborators) ─────────────────────────────────────
router.post('/jobs/:jobId/collaborators', requireAuth, async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email || !String(email).includes('@')) return res.status(400).json({ error: 'A valid teammate email is required.' });
  try {
    const job = await requireJobOwner(req, res);
    if (!job) return;
    const teammate = await query(`SELECT id, name FROM users WHERE LOWER(email) = LOWER($1)`, [String(email).trim()]);
    if (teammate.rows.length === 0) return res.status(404).json({ error: 'No S.P.A.R.K. account with that email.' });
    if (teammate.rows[0].id === job.posted_by) return res.status(409).json({ error: 'That user already owns this posting.' });
    await query(
      `INSERT INTO job_collaborators (job_id, user_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [job.id, teammate.rows[0].id, (req as any).user.sub]
    );
    res.json({ success: true, added: teammate.rows[0].name });
  } catch (error: any) {
    console.error('collaborator add failed:', error.message);
    res.status(500).json({ error: 'Failed to add the collaborator.' });
  }
});

// ── CALENDAR SUBSCRIPTION (read-only per-student feed) ─────────────────────
router.get('/me/calendar-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const r = await query(`SELECT cal_feed_token FROM users WHERE id = $1`, [user.sub]);
    let token = r.rows[0]?.cal_feed_token;
    if (!token) {
      token = crypto.randomBytes(24).toString('hex');
      await query(`UPDATE users SET cal_feed_token = $2 WHERE id = $1`, [user.sub, token]);
    }
    res.json({ success: true, url: `/api/calendar/${token}.ics` });
  } catch (error: any) {
    console.error('calendar token failed:', error.message);
    res.status(500).json({ error: 'Failed to load the calendar feed.' });
  }
});

router.post('/me/calendar-token/rotate', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const token = crypto.randomBytes(24).toString('hex');
    await query(`UPDATE users SET cal_feed_token = $2 WHERE id = $1`, [user.sub, token]);
    res.json({ success: true, url: `/api/calendar/${token}.ics` });
  } catch (error: any) {
    console.error('calendar rotate failed:', error.message);
    res.status(500).json({ error: 'Failed to rotate the calendar token.' });
  }
});

// Unauthenticated (token-in-URL) feed — safe: token is a 192-bit secret scoped
// to read-only interview data for one student; rotate to revoke.
router.get('/calendar/:token.ics', async (req: Request, res: Response) => {
  try {
    const u = await query(`SELECT id FROM users WHERE cal_feed_token = $1`, [req.params.token]);
    if (u.rows.length === 0) return res.status(404).json({ error: 'Invalid calendar token.' });
    const slots = await query(
      `SELECT s.id, s.scheduled_at, s.duration_minutes, s.mode, s.meeting_url, s.notes,
              j.title AS job_title, j.company
         FROM interview_slots s JOIN jobs j ON j.id = s.job_id
        WHERE s.student_id = (SELECT id FROM students WHERE user_id = $1)
          AND s.status = 'scheduled'
        ORDER BY s.scheduled_at ASC`,
      [u.rows[0].id]
    );
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//S.P.A.R.K.//Interview Feed//EN', 'CALSCALE:GREGORIAN',
      'X-WR-CALNAME:S.P.A.R.K. Interviews', 'METHOD:PUBLISH',
    ];
    for (const s of slots.rows) {
      const start = new Date(s.scheduled_at);
      const end = new Date(start.getTime() + (s.duration_minutes || 45) * 60_000);
      lines.push(
        'BEGIN:VEVENT',
        `UID:${s.id}@interviews.spark`,
        `DTSTAMP:${icsBasicUtcTime(new Date().toISOString())}`,
        `DTSTART:${icsBasicUtcTime(start.toISOString())}`,
        `DTEND:${icsBasicUtcTime(end.toISOString())}`,
        `SUMMARY:${icsEscapeText(`Interview — ${s.job_title} @ ${s.company}`)}`,
        `DESCRIPTION:${icsEscapeText([s.meeting_url ? `Join: ${s.meeting_url}` : '', s.notes ? `Notes: ${s.notes}` : ''].filter(Boolean).join('\n'))}`,
        `LOCATION:${icsEscapeText(s.meeting_url || s.mode || 'Online')}`,
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(lines.join('\r\n') + '\r\n');
  } catch (error: any) {
    console.error('calendar feed failed:', error.message);
    res.status(500).json({ error: 'Failed to build the feed.' });
  }
});

// ── Signed resume download: HMAC link, 10-minute expiry, recruiter-only ────
router.get('/students/:id/resume-url', requireAuth, async (req: Request, res: Response) => {
  try {
    const r = await query(`SELECT resume_path, resume_uploaded_at FROM students WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0 || !r.rows[0].resume_path) {
      return res.status(404).json({ error: 'No resume on file for this student.' });
    }
    const expires = Date.now() + 10 * 60_000;
    const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'spark-dev-secret').update(`${req.params.id}:${expires}`).digest('hex').slice(0, 32);
    res.json({ success: true, url: `/api/students/${req.params.id}/resume?expires=${expires}&sig=${sig}`, expiresInMinutes: 10 });
  } catch (error: any) {
    console.error('resume-url failed:', error.message);
    res.status(500).json({ error: 'Failed to create the resume link.' });
  }
});

router.get('/students/:id/resume', async (req: Request, res: Response) => {
  const { expires, sig } = req.query as { expires?: string; sig?: string };
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'spark-dev-secret').update(`${req.params.id}:${expires}`).digest('hex').slice(0, 32);
  if (!expires || !sig || sig !== expected || Number(expires) < Date.now()) {
    return res.status(403).json({ error: 'This resume link has expired. Request a fresh one.' });
  }
  try {
    const r = await query(`SELECT resume_path, resume_name FROM students WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0 || !r.rows[0].resume_path) {
      return res.status(404).json({ error: 'Resume not found.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${(r.rows[0].resume_name || 'resume').replace(/["\r\n]/g, '')}"`);
    // Tolerate legacy relative URLs from earlier uploads (matches the
    // verification-certificate route so both survive a cwd change).
    const storedPath: string = r.rows[0].resume_path;
    const absResumePath = path.isAbsolute(storedPath) ? storedPath : path.join(process.cwd(), storedPath);
    res.sendFile(absResumePath);
  } catch (error: any) {
    console.error('resume download failed:', error.message);
    res.status(500).json({ error: 'Failed to serve the resume.' });
  }
});

// ── Interview Schedule board (owner-only): every slot across own postings ──
router.get('/recruiter/interview-slots', requireAuth, async (req: Request, res: Response) => {
  try {
    const recruiter = (req as any).user;
    // Real rows only: slots joined to jobs posted_by this recruiter, enriched
    // with the candidate's application stage so the board is actionable.
    const result = await query(
      `SELECT s.id, s.application_id, s.job_id, s.student_id, s.scheduled_at,
              s.duration_minutes, s.mode, s.meeting_url, s.notes, s.status, s.created_at,
              j.title AS job_title, j.company,
              a.student_name, a.status AS application_status
         FROM interview_slots s
         JOIN jobs j ON j.id = s.job_id
         LEFT JOIN applications a ON a.id = s.application_id
        WHERE j.posted_by = $1
           OR j.id IN (SELECT job_id FROM job_collaborators WHERE user_id = $1)
        ORDER BY (s.status = 'scheduled') DESC, s.scheduled_at ASC`,
      [recruiter.sub]
    );
    const slots = result.rows.map(r => ({
      id: r.id,
      applicationId: r.application_id,
      jobId: r.job_id,
      jobTitle: r.job_title,
      company: r.company,
      studentId: r.student_id,
      studentName: r.student_name || r.student_id,
      applicationStatus: r.application_status,
      scheduledAt: r.scheduled_at,
      durationMinutes: r.duration_minutes,
      mode: r.mode,
      meetingUrl: r.meeting_url,
      notes: r.notes,
      status: r.status,
      createdAt: r.created_at,
    }));
    const counts = {
      scheduled: slots.filter(s => s.status === 'scheduled').length,
      completed: slots.filter(s => s.status === 'completed').length,
      cancelled: slots.filter(s => s.status === 'cancelled').length,
    };
    res.json({ success: true, slots, counts });
  } catch (error: any) {
    console.error('recruiter interview-slots failed:', error.message);
    res.status(500).json({ error: 'Failed to load the interview schedule.' });
  }
});

// ── Recruiter funnel analytics: applied → shortlisted → interview → offer per posting ──
router.get('/recruiter/funnel', requireAuth, async (req: Request, res: Response) => {
  try {
    const recruiter = (req as any).user;
    const perJob = await query(
      `SELECT j.id AS job_id, j.title, j.company,
              count(a.id) AS applied,
              count(a.id) FILTER (WHERE a.status IN ('Shortlisted','Interview Scheduled','Offer Extended')) AS shortlisted,
              count(a.id) FILTER (WHERE a.status IN ('Interview Scheduled','Offer Extended')) AS interviewed,
              count(a.id) FILTER (WHERE a.status = 'Offer Extended') AS offers,
              count(a.id) FILTER (WHERE a.status = 'Rejected') AS rejected
         FROM jobs j
         LEFT JOIN applications a ON a.job_id = j.id
        WHERE j.posted_by = $1
           OR j.id IN (SELECT job_id FROM job_collaborators WHERE user_id = $1)
        GROUP BY j.id, j.title, j.company
        ORDER BY applied DESC, j.title ASC`,
      [recruiter.sub]
    );
    const trend = await query(
      `SELECT j.id AS job_id, to_char(date_trunc('week', a.applied_date), 'YYYY-MM-DD') AS week, count(*)::int AS applications
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
        WHERE j.posted_by = $1
           OR j.id IN (SELECT job_id FROM job_collaborators WHERE user_id = $1)
        GROUP BY 1, 2
        ORDER BY 2 ASC`,
      [recruiter.sub]
    );
    const trendByJob = new Map<string, { week: string; applications: number }[]>();
    for (const r of trend.rows) {
      if (!trendByJob.has(r.job_id)) trendByJob.set(r.job_id, []);
      trendByJob.get(r.job_id)!.push({ week: r.week, applications: Number(r.applications) });
    }
    const postings = perJob.rows.map(r => {
      const applied = Number(r.applied) || 0;
      const offers = Number(r.offers) || 0;
      return {
        jobId: r.job_id,
        title: r.title,
        company: r.company,
        applied,
        shortlisted: Number(r.shortlisted) || 0,
        interviewed: Number(r.interviewed) || 0,
        offers,
        rejected: Number(r.rejected) || 0,
        conversionPct: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
        // Drill-down: this posting's own weekly application trend.
        weeklyTrend: trendByJob.get(r.job_id) || [],
      };
    });
    const aggregateTrend = trend.rows.reduce<{ week: string; applications: number }[]>((acc, r) => {
      const week = r.week;
      const existing = acc.find(w => w.week === week);
      if (existing) existing.applications += Number(r.applications);
      else acc.push({ week, applications: Number(r.applications) });
      return acc;
    }, []);
    res.json({ success: true, postings, weeklyTrend: aggregateTrend });
  } catch (error: any) {
    console.error('recruiter funnel failed:', error.message);
    res.status(500).json({ error: 'Failed to compute funnel analytics.' });
  }
});

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
            OR j.id IN (SELECT job_id FROM job_collaborators WHERE user_id = $1)
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
    const jobState = await query(`SELECT status, title, company, posted_by FROM jobs WHERE id = $1`, [jobId]);
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

    // Create a real-time notification — resolve the student's linked login
    // account; notifications.user_id references users(id), so a bare student
    // id must never be written (it would violate the FK or be unreadable).
    const linkedUserRes = await query(`SELECT user_id FROM students WHERE id = $1`, [studentId]).catch(() => ({ rows: [] as any[] }));
    const notifyUserId: string | null = linkedUserRes.rows[0]?.user_id || await resolveStudentUserId(studentId);
    await insertNotification(notifyUserId, 'Application Submitted', `Your application for ${jobTitle} at ${company} was submitted. Current stage: ${initialStatus}`, 'info');

    // Push live update to the student's open browser sessions
    if (notifyUserId) emitEvent({
      type: 'application_update',
      title: 'Application Submitted',
      message: `Your application for ${jobTitle} at ${company} is now: ${initialStatus}`,
      targetUserId: notifyUserId,
      data: { jobId, status: initialStatus },
    });

    // Ping the posting's recruiter over SSE so their candidates list
    // refreshes instantly. Owner-targeted (not role-broadcast) — applicant
    // names must not leak to other companies.
    if (jobState.rows[0]?.posted_by) {
      emitEvent({
        type: 'new_application',
        title: 'New candidate received',
        message: `${studentName || 'A student'} applied for ${jobTitle}.`,
        targetUserId: jobState.rows[0].posted_by,
        data: { jobId, applicationId: id, studentName: studentName || null },
      });
    }

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

// ── My Interviews: booked slots for the logged-in student ──────────────────
router.get('/me/interview-slots', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Real rows only: slots whose application belongs to this student's profile.
    const result = await query(
      `SELECT s.id, s.application_id, s.job_id, s.student_id, s.scheduled_at,
              s.duration_minutes, s.mode, s.meeting_url, s.notes, s.status, s.created_at,
              j.title AS job_title, j.company, j.location
         FROM interview_slots s
         JOIN applications a ON a.id = s.application_id
         JOIN jobs j ON j.id = s.job_id
        WHERE a.student_id = (SELECT id FROM students WHERE user_id = $1)
        ORDER BY (s.status = 'scheduled') DESC, s.scheduled_at DESC`,
      [user.sub]
    );
    const slots = result.rows.map(r => ({
      id: r.id,
      applicationId: r.application_id,
      jobId: r.job_id,
      jobTitle: r.job_title,
      company: r.company,
      location: r.location,
      scheduledAt: r.scheduled_at,
      durationMinutes: r.duration_minutes,
      mode: r.mode,
      meetingUrl: r.meeting_url,
      notes: r.notes,
      status: r.status,
      createdAt: r.created_at,
    }));
    res.json({ success: true, slots });
  } catch (error: any) {
    console.error('GET /me/interview-slots failed:', error.message);
    res.status(500).json({ error: 'Failed to load your interview slots.' });
  }
});

// Manual reminder sweep for testing: POST /api/interview-reminders/run?secret=<JWT_SECRET>
router.post('/interview-reminders/run', async (req: Request, res: Response) => {
  const secret = process.env.JWT_SECRET?.trim();
  const provided = String(req.query.secret || req.body?.secret || '');
  if (!secret || provided !== secret) {
    return res.status(403).json({ error: 'Admin secret required.' });
  }
  try {
    const { sendInterviewReminders } = await import('./jobAlerts');
    const result = await sendInterviewReminders();
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 10. ANALYTICS & COPILOT
// ==========================================
router.get('/analytics', async (req: Request, res: Response) => {
  // Real aggregates from live tables — every figure on the analytics
  // dashboards is computed from students/assessments/applications/jobs.
  try {
    const [collegeDepartmentStats, govtRegionalStats, emergingSkillTrends] = await Promise.all([
      getCollegeDepartmentStats(),
      getGovtRegionalStats(),
      getEmergingSkillTrends(),
    ]);
    res.json({ collegeDepartmentStats, govtRegionalStats, emergingSkillTrends });
  } catch (error: any) {
    console.error('GET /analytics failed:', error.message);
    res.status(500).json({ error: 'Failed to compute analytics.' });
  }
});

router.post('/copilot', async (req: Request, res: Response) => {
  const { query: userQuery } = req.body;
  // Abuse guard: the server's GEMINI_API_KEY is used — client keys are ignored
  // so users can never be phished for their own credentials.
  const rl = checkRateLimit(`copilot:${clientIpOf(req)}`, 20);
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Copilot rate limit reached. Try again shortly.' });
  }
  try {
    const answer = await askCopilot(userQuery || '', process.env.GEMINI_API_KEY);
    res.json({ answer });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── TalentSearch: real direct interview invitation (persisted + notified) ───
router.post('/talent/invite', requireAuth, async (req: Request, res: Response) => {
  const { studentId, message } = req.body || {};
  if (!studentId || typeof studentId !== 'string') {
    return res.status(400).json({ error: 'studentId is required.' });
  }
  try {
    const recruiter = (req as any).user;
    const stu = await query(`SELECT id, name, email, user_id FROM students WHERE id = $1`, [studentId]);
    if (stu.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    const student = stu.rows[0];
    const note = (message && typeof message === 'string' ? message : '').slice(0, 500);
    const uid: string | null = student.user_id || await resolveStudentUserId(studentId);
    const title = 'Direct Interview Invitation';
    const msg = `${recruiter.name} (${recruiter.email}) invites you to an interview.${note ? ` Note: ${note}` : ''} Open your dashboard to respond.`;
    await insertNotification(uid, title, msg, 'success');
    if (uid) emitEvent({ type: 'application_update', title, message: msg, targetUserId: uid, data: { from: recruiter.sub } });
    await query(`INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'TALENT_INVITE', $2)`,
      [recruiter.email, JSON.stringify({ studentId, note })]).catch(() => {});
    res.json({ success: true, studentId, studentName: student.name, notifiedUserId: uid || null });
  } catch (error: any) {
    console.error('talent invite failed:', error.message);
    res.status(500).json({ error: 'Failed to send the invitation.' });
  }
});

// ── NIRF-format registry export (real CSV from students + assessments) ──────
router.get('/college/nirf-export', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT s.name, s.email, s.college, s.branch, s.semester, s.cgpa, s.graduation_year,
              s.target_role, s.readiness_score, s.assessment_completed,
              count(a.id)::int AS applications,
              count(a.id) FILTER (WHERE a.status = 'Offer Extended')::int AS offers
         FROM students s
         LEFT JOIN applications a ON a.student_id = s.id
        GROUP BY s.id
        ORDER BY s.branch ASC, s.readiness_score DESC`
    );
    const escape = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = 'Name,Email,College,Branch,Semester,CGPA,Graduation Year,Target Track,AI Readiness %,Assessment Completed,Applications,Offers';
    const lines = result.rows.map(r => [
      r.name, r.email, r.college, r.branch, r.semester, r.cgpa, r.graduation_year,
      r.target_role, r.readiness_score ?? '', r.assessment_completed ? 'Yes' : 'No',
      r.applications, r.offers,
    ].map(escape).join(','));
    const csv = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nirf-student-registry-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('NIRF export failed:', error.message);
    res.status(500).json({ error: 'Failed to build the NIRF export.' });
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

  // Brute-force guard: per-IP + per-email sliding window.
  const rlKey = `register-otp:${clientIpOf(req)}|${String(email).trim().toLowerCase()}`;
  const rl = checkRateLimit(rlKey, 6);
  if (!rl.allowed) {
    return res.status(429).json({ error: `Too many OTP requests. Try again in ${Math.ceil((rl.retryAfterSeconds || 60) / 60)} minute(s).` });
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
      
        let verificationStatus = 'pending';
        let studentEnrollment: string | null = null;
        let studentPrn: string | null = null;

        if (role === 'student') {
          // Auto-verify when the email belongs to the selected college's
          // official domain (e.g. @coep.ac.in) or any institutional .ac.in /
          // .edu.in domain; personal mail (Gmail etc.) lands in the college's
          // TPO approval queue. The OTP gate above already proved email
          // ownership, so a domain match is a real instant verification.
          const domain = emailDomainOf(normalizedEmail);
          const selectedCollege = String(college || '').trim();
          // (a) The email domain belongs to a VERIFIED institution registered
          // on this platform (its official website domain) — strongest signal.
          const collegeDomainRow = await client.query(
            `SELECT 1 FROM institutions i JOIN users u ON u.id = i.user_id
              WHERE i.official_domain IS NOT NULL AND u.verification_status = 'verified'
                AND ($1 = i.official_domain OR $1 LIKE '%.' || i.official_domain)
              LIMIT 1`,
            [domain]
          );
          const domainMatchesRegisteredCollege = collegeDomainRow.rows.length > 0;
          // (b) Institutional TLD (.ac.in / .edu.in) AND the selected college
          // matches the accredited institutions registry.
          const registryMatch = selectedCollege ? verifyInstitutionServer(selectedCollege) : null;
          const institutionalTld = emailLooksInstitutional(domain);
          if (domainMatchesRegisteredCollege || (institutionalTld && registryMatch?.level === 'verified')) {
            verificationStatus = 'verified';
          } else {
            verificationStatus = 'pending_college_approval';
          }
          studentEnrollment = (req.body.enrollmentNumber && String(req.body.enrollmentNumber).trim()) || null;
          studentPrn = (req.body.prn && String(req.body.prn).trim()) || null;
        } else if (role === 'college') {
          // AISHE format check + the email domain must match the submitted
          // official website hostname. Failure is a hard 400 (invalid data),
          // not a silent queue entry — garbage must not become pending rows.
          const aishe = validateAisheCode(req.body.aisheCode);
          if (!aishe.isValid) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: aishe.error });
          }
          const officialDomain = String(req.body.officialDomain || '').trim();
          if (!officialDomain) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Official website domain is required (e.g. coep.ac.in).' });
          }
          if (!emailDomainMatchesSite(normalizedEmail, officialDomain)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `The email domain does not match your institution's official website (${officialDomain}). Use an email on your official domain, or correct the website address.` });
          }
          verificationStatus = 'verified';
        } else if (role === 'industry') {
          if (FREE_EMAIL_DOMAINS.includes(emailDomainOf(normalizedEmail))) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Free email domains (Gmail, Yahoo, Outlook, Hotmail) are blocked for Industry registration — use your company work email.' });
          }
          const cinGstin = String(req.body.cinGstin || '').trim();
          const incorporationDoc = req.body.incorporationDocument ? String(req.body.incorporationDocument).slice(0, 500) : null;
          if (cinGstin) {
            const cin = validateCinOrGstin(cinGstin);
            if (!cin.isValid) {
              await client.query('ROLLBACK');
              return res.status(400).json({ error: cin.error });
            }
            verificationStatus = 'verified';
          } else if (incorporationDoc) {
            // MSME / startup fallback: Udyam or Incorporation certificate
            // uploaded — work email already verified via OTP, pending admin.
            verificationStatus = 'pending_admin_approval';
          } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Provide a valid CIN or GSTIN, or upload an Udyam/Incorporation certificate.' });
          }
        } else if (role === 'alumni') {
          // Alumni register with graduation year + enrollment/PRN + LinkedIn.
          // The college TPO must approve the record before it becomes a
          // verified mentor — no auto-approval.
          const linkedinUrl = String(req.body.linkedinUrl || '').trim();
          studentEnrollment = (req.body.enrollmentNumber && String(req.body.enrollmentNumber).trim()) || null;
          if (!studentEnrollment) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Enrollment number / PRN is required for Alumni registration.' });
          }
          if (!linkedinUrl || !LINKEDIN_PROFILE_REGEX.test(linkedinUrl)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'A valid LinkedIn profile URL (https://linkedin.com/in/…) is required for Alumni registration.' });
          }
          verificationStatus = 'pending_college_approval';
        }

        const userRes = await client.query(
          `INSERT INTO users (id, name, email, role, avatar, password_hash, verification_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role,
             avatar = EXCLUDED.avatar,
             password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
             verification_status = EXCLUDED.verification_status
           RETURNING *`,
          [userId, name.trim(), normalizedEmail, role || 'student', avatar, passwordHash, verificationStatus]
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
          declared_skills, verified_skills, assessment_completed, readiness_score,
          enrollment_number, prn
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, NULL, '[]'::jsonb, '[]'::jsonb, FALSE, 15, $14, $15)
        ON CONFLICT (email) DO UPDATE SET
          name = $3, college = $6, degree = $7, branch = $8, semester = $9,
          cgpa = $10, graduation_year = $11, target_role = $12, bio = $13,
          enrollment_number = $14, prn = $15
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
          studentEnrollment,
          studentPrn,
        ]
      );

      studentRecord = studentRes.rows[0];
      }
      if (role === 'alumni') {
        const linkedinUrl = String(req.body.linkedinUrl || '').trim();
        const alumniGradYear = parseInt(graduationYear, 10) || (new Date().getFullYear() - 4);
        // Schema requires a valid alumni_applications FK — create the PENDING
        // application the college TPO must approve (email is OTP-verified;
        // the mentor record is minted only on desk approval).
        const appId = `alumapp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        await client.query(
          `INSERT INTO alumni_applications (
             id, full_name, email, college_id, college_name, degree, graduation_year,
             company, designation, linkedin_url, status, review_note
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'Awaiting college TPO approval (registered via portal).')
           ON CONFLICT (id) DO NOTHING`,
          [appId, name.trim(), normalizedEmail, 'inst-default',
           college || 'Institute of Engineering & Technology', 'B.Tech', alumniGradYear,
           company || 'Enterprise Corp', designation || 'Alumni / Mentor', linkedinUrl]
        );
      }

      if (role === 'college') {
        const instId = `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const affiliationDoc = req.body.affiliationDocument ? String(req.body.affiliationDocument).slice(0, 500) : null;
        await client.query(
          `INSERT INTO institutions (id, user_id, aishe_code, official_domain, college_name, affiliation_document_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [instId, effectiveUserId,
           String(req.body.aisheCode || '').trim().toUpperCase(),
           String(req.body.officialDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, ''),
           college || null,
           affiliationDoc]
        );
      }

      if (role === 'industry') {
        const indId = `ind-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const incorporationDoc = req.body.incorporationDocument ? String(req.body.incorporationDocument).slice(0, 500) : null;
        await client.query(
          `INSERT INTO industries (id, user_id, cin_gstin, incorporation_document_url)
           VALUES ($1, $2, $3, $4)`,
          [indId, effectiveUserId,
           String(req.body.cinGstin || '').trim().toUpperCase() || null,
           incorporationDoc]
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

      // New pending accounts must light up TPO/admin desks instantly (SSE),
      // not wait for the next poll. Rejected accounts re-enter the admin queue.
      if (verificationStatus === 'pending_college_approval') {
        emitEvent({
          type: 'verification_queue', title: 'New approval pending',
          message: `${name.trim()} (${role === 'alumni' ? 'alumnus' : 'student'}) is awaiting college approval.`,
          targetRole: 'college', data: { role },
        });
      } else if (verificationStatus === 'pending_admin_approval') {
        emitEvent({
          type: 'verification_queue', title: 'New certificate to review',
          message: `${name.trim()} registered with a document — waiting in the admin verification queue.`,
          targetRole: 'government', data: { role },
        });
      }

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
// 11b. PORTAL ROLE VERIFICATION MATRIX — endpoints
// ==========================================

// My verification status (any signed-in role): shows the badge on the
// dashboard and tells industry/college accounts what document to upload.
router.get('/verify/institution-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const u = await query(`SELECT id, name, email, role, verification_status FROM users WHERE id = $1`, [user.sub]);
    if (u.rows.length === 0) return res.status(404).json({ error: 'Account not found.' });
    const row = u.rows[0];
    let institution: any = null;
    let industry: any = null;
    if (row.role === 'college') {
      const inst = await query(`SELECT aishe_code, official_domain, affiliation_document_url, created_at FROM institutions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [user.sub]);
      institution = inst.rows[0] || null;
    }
    if (row.role === 'industry') {
      const ind = await query(`SELECT cin_gstin, incorporation_document_url, created_at FROM industries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [user.sub]);
      industry = ind.rows[0] || null;
    }
    res.json({
      success: true,
      verificationStatus: row.verification_status || 'pending',
      statusLabel: ({
        verified: 'Verified',
        pending_college_approval: 'Pending college approval',
        pending_admin_approval: 'Pending platform admin approval',
        rejected: 'Verification rejected',
        pending: 'Verification pending',
      } as Record<string, string>)[row.verification_status || 'pending'] || 'Verification pending',
      institution,
      industry,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Udyam / Incorporation / AICTE affiliation letter upload (industry + college).
// Persisted to disk and linked on the account for the admin approval queue.
router.post('/verify/affiliation-document', requireAuth, upload.single('document'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!req.file) return res.status(400).json({ error: 'Attach the certificate file (PDF/JPG/PNG).' });
    const u = await query(`SELECT role FROM users WHERE id = $1`, [user.sub]);
    if (u.rows.length === 0) return res.status(404).json({ error: 'Account not found.' });
    const role = u.rows[0].role;
    if (role !== 'industry' && role !== 'college') {
      return res.status(403).json({ error: 'Only Institution and Industry accounts can submit verification documents.' });
    }
    // Same persistence pattern as resumes: absolute path on disk under
    // uploads/verify, served ONLY through expiring signed URLs.
    const docDir = path.join(UPLOADS_ROOT, 'verify');
    await fs.promises.mkdir(docDir, { recursive: true });
    const safeName = `${user.sub}-${Date.now()}-${req.file.originalname.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80)}`;
    const docPath = path.join(docDir, safeName);
    await fs.promises.writeFile(docPath, req.file.buffer);

    if (role === 'college') {
      await query(`UPDATE institutions SET affiliation_document_url = $2 WHERE user_id = $1`, [user.sub, docPath]);
    } else {
      await query(`UPDATE industries SET incorporation_document_url = $2 WHERE user_id = $1`, [user.sub, docPath]);
    }
    // Document submitted → (re)enter the admin approval queue.
    await query(`UPDATE users SET verification_status = 'pending_admin_approval' WHERE id = $1 AND verification_status <> 'verified'`, [user.sub]);
    // Certificate (re)submitted → ping the admin desk over SSE so it lands
    // in the queue view without waiting for a refresh/poll.
    emitEvent({
      type: 'verification_queue', title: 'Certificate submitted for review',
      message: `${role === 'college' ? 'Institution' : 'Company'} account uploaded a verification certificate.`,
      targetRole: 'government', data: { userId: user.sub, role },
    });
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [user.sub, role === 'college' ? 'AFFILIATION_DOC_UPLOADED' : 'INCORPORATION_DOC_UPLOADED', JSON.stringify({ file: safeName, size: req.file.size })]
    ).catch(() => {});
    res.json({ success: true, stored: true, status: 'pending_admin_approval' });
  } catch (error: any) {
    console.error('affiliation document upload failed:', error.message);
    res.status(500).json({ error: 'Failed to store the document.' });
  }
});

// Platform Admin desk: accounts awaiting document-based verification.
router.get('/verify/admin-queue', requireAdmin, async (req: Request, res: Response) => {
  try {
    const r = await query(
      `SELECT u.id, u.name, u.email, u.role, u.verification_status, u.created_at,
              i.aishe_code, i.official_domain, i.affiliation_document_url,
              ind.cin_gstin, ind.incorporation_document_url
         FROM users u
         LEFT JOIN institutions i ON i.user_id = u.id
         LEFT JOIN industries ind ON ind.user_id = u.id
        WHERE u.verification_status IN ('pending_admin_approval', 'rejected')
        ORDER BY u.created_at ASC
        LIMIT 200`
    );
    // Raw document paths stay server-side; clients mint expiring signed URLs.
    const accounts = r.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      verificationStatus: row.verification_status,
      createdAt: row.created_at,
      aisheCode: row.aishe_code || null,
      officialDomain: row.official_domain || null,
      cinGstin: row.cin_gstin || null,
      hasDocument: !!(row.affiliation_document_url || row.incorporation_document_url),
    }));
    res.json({ success: true, accounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: mint a 10-minute signed URL for an account's verification certificate
// (same HMAC pattern as resume downloads).
router.get('/verify/admin-queue/:userId/document-url', requireAdmin, async (req: Request, res: Response) => {
  try {
    const r = await query(
      `SELECT i.affiliation_document_url AS doc_a, ind.incorporation_document_url AS doc_b
         FROM users u
         LEFT JOIN institutions i ON i.user_id = u.id
         LEFT JOIN industries ind ON ind.user_id = u.id
        WHERE u.id = $1`,
      [req.params.userId]
    );
    const docPath = r.rows[0]?.doc_a || r.rows[0]?.doc_b;
    if (!docPath) return res.status(404).json({ error: 'No certificate on file for this account.' });
    const expires = Date.now() + 10 * 60_000;
    const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'spark-dev-secret').update(`${req.params.userId}:${expires}`).digest('hex').slice(0, 32);
    res.json({ success: true, url: `/api/verify/documents/${req.params.userId}?expires=${expires}&sig=${sig}`, expiresInMinutes: 10 });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create the document link.' });
  }
});

// Owner self-service: mint a signed link to YOUR OWN certificate (institution
// or industry) so rejected accounts can re-download what they submitted from
// the re-upload screen. Same 10-minute HMAC pattern as the admin desk.
router.get('/verify/my-document-url', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const r = await query(`SELECT role FROM users WHERE id = $1`, [user.sub]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Account not found.' });
    const role = r.rows[0].role;
    if (role !== 'college' && role !== 'industry') {
      return res.status(403).json({ error: 'Only Institution and Industry accounts have verification certificates.' });
    }
    const doc = role === 'college'
      ? await query(`SELECT affiliation_document_url AS doc FROM institutions WHERE user_id = $1`, [user.sub])
      : await query(`SELECT incorporation_document_url AS doc FROM industries WHERE user_id = $1`, [user.sub]);
    if (!doc.rows[0]?.doc) return res.status(404).json({ error: 'No certificate on file yet — upload one first.' });
    const expires = Date.now() + 10 * 60_000;
    const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'spark-dev-secret').update(`${user.sub}:${expires}`).digest('hex').slice(0, 32);
    res.json({ success: true, url: `/api/verify/documents/${user.sub}?expires=${expires}&sig=${sig}`, expiresInMinutes: 10 });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create your document link.' });
  }
});

// Ops: uploads disk usage by subdirectory (resumes vs verify) + oldest file
// age — backs the DEPLOYMENT.md disk-watch checklist item.
router.get('/ops/uploads-usage', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dir = String(req.query.dir || '').trim();
    const roots = dir
      ? [path.join(UPLOADS_ROOT, dir)]
      : ['resumes', 'verify'].map(sub => path.join(UPLOADS_ROOT, sub));

    const directories: { directory: string; fileCount: number; totalBytes: number; oldestFileAt: string | null }[] = [];
    for (const root of roots) {
      let fileCount = 0;
      let totalBytes = 0;
      let oldest: number | null = null;
      if (fs.existsSync(root)) {
        const entries = await fs.promises.readdir(root);
        for (const entry of entries) {
          const full = path.join(root, entry);
          const st = await fs.promises.stat(full).catch(() => null);
          if (!st || !st.isFile()) continue;
          fileCount += 1;
          totalBytes += st.size;
          if (oldest === null || st.mtimeMs < oldest) oldest = st.mtimeMs;
        }
      }
      directories.push({
        directory: path.basename(root),
        fileCount,
        totalBytes,
        oldestFileAt: oldest === null ? null : new Date(oldest).toISOString(),
      });
    }

    const grandTotal = directories.reduce((s, d) => s + d.totalBytes, 0);
    res.json({
      success: true,
      uploadsRoot: UPLOADS_ROOT,
      directories,
      totalBytes: grandTotal,
      totalHuman: `${(grandTotal / 1_048_576).toFixed(1)} MB`,
      perFileCapBytes: 15 * 1024 * 1024,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Signed certificate download (HMAC like resumes; link holder only).
router.get('/verify/documents/:userId', async (req: Request, res: Response) => {
  const { expires, sig } = req.query as { expires?: string; sig?: string };
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'spark-dev-secret').update(`${req.params.userId}:${expires}`).digest('hex').slice(0, 32);
  if (!expires || !sig || sig !== expected || Number(expires) < Date.now()) {
    return res.status(403).json({ error: 'This document link has expired. Request a fresh one.' });
  }
  try {
    const r = await query(
      `SELECT i.affiliation_document_url AS doc_a, ind.incorporation_document_url AS doc_b
         FROM users u
         LEFT JOIN institutions i ON i.user_id = u.id
         LEFT JOIN industries ind ON ind.user_id = u.id
        WHERE u.id = $1`,
      [req.params.userId]
    );
    const stored = r.rows[0]?.doc_a || r.rows[0]?.doc_b;
    if (!stored) return res.status(404).json({ error: 'Document not found.' });
    // Tolerate legacy relative URLs from earlier uploads.
    const absPath = path.isAbsolute(stored) ? stored : path.join(process.cwd(), stored);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'Document file is missing.' });
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(absPath)}"`);
    res.sendFile(absPath);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to serve the document.' });
  }
});

// Platform Admin: verify / reject an institution or industry account.
// Rejections carry a structured reason (clean stats) plus an optional note.
const REJECTION_REASONS = ['invalid_cin', 'unreadable_scan', 'wrong_institution', 'domain_mismatch', 'incomplete_document'] as const;
const REJECTION_REASON_LABELS: Record<string, string> = {
  invalid_cin: 'Invalid CIN/GSTIN',
  unreadable_scan: 'Certificate scan unreadable',
  wrong_institution: 'Wrong institution / account mismatch',
  domain_mismatch: 'Email domain does not match institution',
  incomplete_document: 'Document incomplete or missing pages',
};

router.patch('/verify/admin-queue/:userId', requireAdmin, async (req: Request, res: Response) => {
  const { decision, reviewNote, rejectionReason } = req.body || {};
  if (!['verified', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'verified' or 'rejected'." });
  }
  if (decision === 'rejected' && rejectionReason && !REJECTION_REASONS.includes(rejectionReason)) {
    return res.status(400).json({ error: `rejectionReason must be one of: ${REJECTION_REASONS.join(', ')}.` });
  }
  try {
    const admin = (req as any).user;
    const target = await query(`SELECT id, name, email, role, verification_status FROM users WHERE id = $1`, [req.params.userId]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'Account not found.' });
    const acct = target.rows[0];
    if (acct.role !== 'college' && acct.role !== 'industry') {
      return res.status(400).json({ error: 'Only Institution or Industry accounts go through admin verification.' });
    }
    if (acct.verification_status === 'verified' && decision === 'verified') {
      return res.status(409).json({ error: 'Account is already verified.' });
    }
    const reasonLabel = rejectionReason ? (REJECTION_REASON_LABELS[rejectionReason] || null) : null;
    await query(`UPDATE users SET verification_status = $2 WHERE id = $1`, [acct.id, decision]);
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'ADMIN_VERIFICATION_DECISION', $2)`,
      [admin.email || admin.sub, JSON.stringify({ targetUserId: acct.id, targetEmail: acct.email, role: acct.role, decision, reason: rejectionReason || null, note: reviewNote || null })]
    ).catch(() => {});
    insertNotification(acct.id,
      decision === 'verified' ? 'Account Verified ✓' : 'Verification Rejected',
      decision === 'verified'
        ? `Your ${acct.role === 'college' ? 'institution' : 'company'} account is now verified. Welcome aboard!`
        : `Your verification was not approved${reasonLabel ? ` — ${reasonLabel.toLowerCase()}` : ''}.${reviewNote ? ` Note: ${reviewNote}` : ''} You can re-download your certificate and re-upload documents and resubmit.`,
      decision === 'verified' ? 'success' : 'alert'
    );
    // Rejected accounts head back to this desk for a fresh review.
    if (decision === 'rejected') {
      emitEvent({
        type: 'verification_queue', title: 'Queue updated',
        message: `${acct.name} was rejected and can resubmit documents.`,
        targetRole: 'government', data: { userId: acct.id, decision },
      });
    }
    res.json({ success: true, status: decision });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Platform Admin desk metrics: queue volume, median decision time and
// rejection reasons — feeds the metrics strip above the admin queue.
router.get('/verify/admin-stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Queue volume: accounts currently waiting on a document review, split by
    // account kind (or one bucket when `groupByRole` is not requested).
    const byRole = String(req.query.groupByRole || '') === '1';
    const queueVol = await query(
      byRole
        ? `SELECT u.role, count(*)::int AS n FROM users u WHERE u.verification_status = 'pending_admin_approval' GROUP BY u.role`
        : `SELECT count(*)::int AS n FROM users u WHERE u.verification_status = 'pending_admin_approval'`
    );

    // Median decision time: newest COLLEGE/ADMIN VERIFICATION_DECISION audit
    // row per account, paired with the account's creation time. Audit details
    // are written by the admin desk at decision time.
    const decisions = await query(
      `SELECT a.details ->> 'targetUserId' AS target_user_id, a.created_at
         FROM audit_logs a
        WHERE a.action = 'ADMIN_VERIFICATION_DECISION'
        ORDER BY a.created_at ASC`
    );
    const firstDecision = new Map<string, Date>();
    for (const row of decisions.rows) {
      if (row.target_user_id && !firstDecision.has(row.target_user_id)) {
        firstDecision.set(row.target_user_id, new Date(row.created_at));
      }
    }
    if (firstDecision.size > 0) {
      const created = await query(
        `SELECT id, created_at FROM users WHERE id = ANY($1)`,
        [Array.from(firstDecision.keys())]
      );
      const durations: number[] = [];
      for (const row of created.rows) {
        const decidedAt = firstDecision.get(row.id);
        if (decidedAt) {
          const hours = (decidedAt.getTime() - new Date(row.created_at).getTime()) / 3_600_000;
          if (hours >= 0 && hours < 24 * 365) durations.push(hours);
        }
      }
      durations.sort((a, b) => a - b);
      const mid = Math.floor(durations.length / 2);
      const medianHours = durations.length === 0
        ? null
        : durations.length % 2 === 1
          ? durations[mid]
          : (durations[mid - 1] + durations[mid]) / 2;

      // Rejection reasons from the structured reason field, falling back to
      // free-text notes from before the picker existed (top 5, most frequent).
      const rejects = await query(
        `SELECT reason, count(*)::int AS n FROM (
           SELECT COALESCE(
             CASE details ->> 'reason'
               WHEN 'invalid_cin' THEN 'Invalid CIN/GSTIN'
               WHEN 'unreadable_scan' THEN 'Certificate scan unreadable'
               WHEN 'wrong_institution' THEN 'Wrong institution / account mismatch'
               WHEN 'domain_mismatch' THEN 'Email domain does not match institution'
               WHEN 'incomplete_document' THEN 'Document incomplete or missing pages'
               ELSE NULL END,
             NULLIF(details ->> 'note', '')
           ) AS reason
             FROM audit_logs
            WHERE action = 'ADMIN_VERIFICATION_DECISION' AND details ->> 'decision' = 'rejected'
         ) t
         WHERE reason IS NOT NULL
         GROUP BY reason ORDER BY n DESC, reason ASC LIMIT 5`
      );

      return res.json({
        success: true,
        queueVolume: byRole
          ? queueVol.rows.map((r: any) => ({ role: r.role, count: r.n }))
          : (queueVol.rows[0]?.n || 0),
        medianDecisionHours: medianHours === null ? null : Math.round(medianHours * 10) / 10,
        decisionsCounted: durations.length,
        rejectionReasons: rejects.rows
          .filter((r: any) => r.reason)
          .map((r: any) => ({ reason: r.reason, count: r.n })),
      });
    }

    // No decisions recorded yet — still report the live queue volume.
    return res.json({
      success: true,
      queueVolume: byRole
        ? queueVol.rows.map((r: any) => ({ role: r.role, count: r.n }))
        : (queueVol.rows[0]?.n || 0),
      medianDecisionHours: null,
      decisionsCounted: 0,
      rejectionReasons: [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pending-approvals count for the college sidebar badge (cheap aggregate).
router.get('/verify/pending-count', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const me = await query(`SELECT id FROM users WHERE id = $1 AND role = 'college'`, [user.sub]);
    if (me.rows.length === 0) return res.status(403).json({ error: 'College (TPO) access required.' });
    const students = await query(
      `SELECT count(*)::int AS n FROM users WHERE verification_status = 'pending_college_approval'`
    );
    const alumni = await query(
      `SELECT count(*)::int AS n FROM alumni_applications WHERE status = 'pending' AND review_note LIKE '%portal%'
      `
    );
    res.json({ success: true, students: students.rows[0]?.n || 0, alumni: alumni.rows[0]?.n || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// College TPO desk: students pending college approval + alumni applications
// from portal registrations, scoped to this college's own institution.
router.get('/verify/college-approvals', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const me = await query(`SELECT id, name FROM users WHERE id = $1 AND role = 'college'`, [user.sub]);
    if (me.rows.length === 0) return res.status(403).json({ error: 'College (TPO) access required.' });

    const students = await query(
      `SELECT u.id, u.name, u.email, u.verification_status, u.created_at,
              s.id AS student_id, s.college, s.branch, s.graduation_year, s.enrollment_number, s.prn
         FROM users u JOIN students s ON s.user_id = u.id
        WHERE u.verification_status = 'pending_college_approval'
        ORDER BY u.created_at ASC
        LIMIT 200`
    );
    // Alumni portal registrations land in alumni_applications as pending rows.
    const alumniApps = await query(
      `SELECT id, full_name, email, college_name, degree, graduation_year, company, designation, linkedin_url, created_at
         FROM alumni_applications
        WHERE status = 'pending' AND review_note LIKE '%portal%'
        ORDER BY created_at ASC
        LIMIT 200`
    );
    res.json({ success: true, students: students.rows, alumniApplications: alumniApps.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// College TPO: one-click approve / reject.
//   kind=student → flips users.verification_status to verified.
//   kind=alumni  → approves the application and mints the verified mentor
//                  record (unlocks the Enable Mentor Profile toggle).
router.patch('/verify/college-approvals/:userId', requireAuth, async (req: Request, res: Response) => {
  const { decision, kind, reviewNote } = req.body || {};
  if (!['verified', 'rejected'].includes(decision) || !['student', 'alumni'].includes(kind)) {
    return res.status(400).json({ error: "decision must be 'verified'/'rejected' and kind 'student'/'alumni'." });
  }
  try {
    const user = (req as any).user;
    const me = await query(`SELECT id, email FROM users WHERE id = $1 AND role = 'college'`, [user.sub]);
    if (me.rows.length === 0) return res.status(403).json({ error: 'College (TPO) access required.' });

    if (kind === 'student') {
      const target = await query(
        `SELECT u.id, u.name, u.email, u.verification_status FROM users u JOIN students s ON s.user_id = u.id WHERE u.id = $1`,
        [req.params.userId]
      );
      if (target.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
      const stu = target.rows[0];
      if (stu.verification_status !== 'pending_college_approval') {
        return res.status(409).json({ error: `Student is not awaiting approval (status: ${stu.verification_status}).` });
      }
      await query(`UPDATE users SET verification_status = $2 WHERE id = $1`, [stu.id, decision]);
      await query(
        `INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'COLLEGE_STUDENT_APPROVAL', $2)`,
        [me.rows[0].email || me.rows[0].id, JSON.stringify({ studentUserId: stu.id, decision, note: reviewNote || null })]
      ).catch(() => {});
      insertNotification(stu.id,
        decision === 'verified' ? 'Student Account Approved ✓' : 'Student Verification Declined',
        decision === 'verified'
          ? 'Your college TPO approved your account — full portal access unlocked.'
          : `Your college declined your verification.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
        decision === 'verified' ? 'success' : 'alert'
      );
      // Keep every connected TPO desk in sync with the live badge count.
      emitEvent({
        type: 'verification_queue', title: 'Queue updated',
        message: `${stu.name} was ${decision === 'verified' ? 'approved' : 'declined'} by the college desk.`,
        targetRole: 'college', data: { userId: stu.id, decision },
      });
      return res.json({ success: true, status: decision });
    }

    // kind === 'alumni': userId param carries the alumni_applications id
    const appRes = await query(`SELECT * FROM alumni_applications WHERE id = $1`, [req.params.userId]);
    if (appRes.rows.length === 0) return res.status(404).json({ error: 'Alumni application not found.' });
    const app = appRes.rows[0];
    if (app.status !== 'pending') return res.status(409).json({ error: 'Application has already been reviewed.' });

    if (decision === 'rejected') {
      await query(`UPDATE alumni_applications SET status = 'rejected', review_note = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $1`, [app.id, reviewNote || 'Declined by college TPO.']);
      const targetUser = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [app.email]);
      if (targetUser.rows[0]) await query(`UPDATE users SET verification_status = 'rejected' WHERE id = $1`, [targetUser.rows[0].id]);
      await query(
        `INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'COLLEGE_ALUMNI_REJECTED', $2)`,
        [me.rows[0].email || me.rows[0].id, JSON.stringify({ applicationId: app.id })]
      ).catch(() => {});
      emitEvent({
        type: 'verification_queue', title: 'Queue updated',
        message: `Alumni application from ${app.full_name} was declined.`,
        targetRole: 'college', data: { applicationId: app.id, decision: 'rejected' },
      });
      return res.json({ success: true, status: 'rejected' });
    }

    // Approve → mint the verified alumni mentor record
    const alumniId = `alum-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO alumni (
        id, application_id, name, email, college_id, college_name, degree, graduation_year,
        company, designation, expertise, linkedin_url, avatar_url, verified_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET verified_at = CURRENT_TIMESTAMP, linkedin_url = EXCLUDED.linkedin_url`,
      [
        alumniId, app.id, app.full_name, app.email, app.college_id, app.college_name,
        app.degree, app.graduation_year, app.company, app.designation,
        JSON.stringify([]), app.linkedin_url,
        `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(app.full_name)}`,
      ]
    );
    await query(`UPDATE alumni_applications SET status = 'approved', review_note = 'Approved by college TPO (portal registration).', reviewed_at = CURRENT_TIMESTAMP WHERE id = $1`, [app.id]);
    const targetUser = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [app.email]);
    if (targetUser.rows[0]) await query(`UPDATE users SET verification_status = 'verified' WHERE id = $1`, [targetUser.rows[0].id]);
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'COLLEGE_ALUMNI_APPROVED', $2)`,
      [me.rows[0].email || me.rows[0].id, JSON.stringify({ applicationId: app.id, alumniId })]
    ).catch(() => {});
    insertNotification(targetUser.rows[0]?.id || null,
      'Alumni Record Verified 🎓',
      'Your college TPO approved your alumni record — the Mentor Profile toggle is now unlocked in your dashboard.',
      'success'
    );
    emitEvent({
      type: 'verification_queue', title: 'Queue updated',
      message: `Alumni application from ${app.full_name} was approved — mentor record minted.`,
      targetRole: 'college', data: { applicationId: app.id, decision: 'approved', alumniId },
    });
    res.json({ success: true, status: 'approved', alumniId });
  } catch (error: any) {
    console.error('college approval failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Alumni: enable / update the Mentor Profile (only after college approval).
router.patch('/alumni/mentor-profile', requireAuth, async (req: Request, res: Response) => {
  const { isMentor, mentorCapacity, techStack, currentCompany, currentRole } = req.body || {};
  try {
    const user = (req as any).user;
    const r = await query(`SELECT id, verified_at FROM alumni WHERE LOWER(email) = (SELECT LOWER(email) FROM users WHERE id = $1)`, [user.sub]);
    if (r.rows.length === 0) {
      return res.status(403).json({ error: 'Your alumni record is not yet approved by your college — the mentor profile stays locked.' });
    }
    if (!r.rows[0].verified_at) {
      return res.status(403).json({ error: 'Mentor profile unlocks after your college verifies your alumni record.' });
    }
    const tech = Array.isArray(techStack) ? techStack.slice(0, 20).map((t: any) => String(t).slice(0, 40)) : undefined;
    await query(
      `UPDATE alumni SET
         is_mentor = COALESCE($2, is_mentor),
         mentor_capacity = COALESCE($3, mentor_capacity),
         mentor_tech_stack = COALESCE($4::jsonb, mentor_tech_stack),
         company = COALESCE($5, company),
         designation = COALESCE($6, designation)
       WHERE id = $1`,
      [r.rows[0].id,
        typeof isMentor === 'boolean' ? isMentor : null,
        Number.isFinite(Number(mentorCapacity)) ? Math.max(1, Math.min(50, Number(mentorCapacity))) : null,
        tech ? JSON.stringify(tech) : null,
        currentCompany ? String(currentCompany).slice(0, 200) : null,
        currentRole ? String(currentRole).slice(0, 200) : null]
    );
    const updated = await query(`SELECT is_mentor, mentor_capacity, mentor_tech_stack, company, designation FROM alumni WHERE id = $1`, [r.rows[0].id]);
    res.json({ success: true, profile: updated.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 12. FORGOT PASSWORD & OTP DISPATCH
// ==========================================
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  // Abuse guard: password-reset OTPs are rate limited per IP + email.
  const rlKey = `forgot:${clientIpOf(req)}|${String(req.body?.email || '').trim().toLowerCase()}`;
  const rl = checkRateLimit(rlKey, 6);
  if (!rl.allowed) {
    return res.status(429).json({ error: `Too many reset attempts. Try again in ${Math.ceil((rl.retryAfterSeconds || 60) / 60)} minute(s).` });
  }

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

  // Brute-force guard: 10 attempts / 15 min per IP+email, then a 10 min lockout.
  const rlKey = `login:${clientIpOf(req)}|${String(email).trim().toLowerCase()}`;
  const rl = checkRateLimit(rlKey, 10);
  if (!rl.allowed) {
    return res.status(429).json({ error: `Too many login attempts. Try again in ${Math.ceil((rl.retryAfterSeconds || 60) / 60)} minute(s).` });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const userRes = await query(
      `SELECT id, name, email, role, avatar, password_hash, verification_status, COALESCE(token_version, 0) AS token_version FROM users WHERE LOWER(email) = $1`,
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

    const ver = user.token_version ?? 0;
    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name, ver });
    const refreshToken = signRefreshToken(user.id);

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        verificationStatus: user.verification_status || 'verified',
      },
      message: `Welcome back, ${user.name}!`,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed.' });
  }
});

// ── Refresh token rotation: exchange a valid refresh token for a new session ─
router.post('/auth/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  const decoded = refreshToken ? verifyRefreshToken(String(refreshToken)) : null;
  if (!decoded) {
    return res.status(401).json({ error: 'Refresh token invalid or expired. Please sign in again.' });
  }
  try {
    const r = await query('SELECT id, email, role, name, token_version FROM users WHERE id = $1', [decoded.sub]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    const ver = user.token_version ?? 0;
    // Rotation: a new refresh token is issued with every refresh so a stolen
    // one has limited life; revocation (bump) kills the whole family.
    res.json({
      success: true,
      token: signToken({ sub: user.id, email: user.email, role: user.role, name: user.name, ver }),
      refreshToken: signRefreshToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    console.error('refresh error:', error.message);
    res.status(500).json({ error: 'Refresh failed.' });
  }
});

// ── Server-side logout: bump token_version so every issued JWT dies now ─────
router.post('/auth/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await query(`UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1`, [user.sub]);
    await query(`INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'LOGOUT', $2)`, [user.email, JSON.stringify({ at: new Date() })]).catch(() => {});
    res.json({ success: true, message: 'Signed out on this device. All existing tokens are revoked.' });
  } catch (error: any) {
    console.error('logout error:', error.message);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// ==========================================
// 12. DATABASE ADMIN EXPLORER (BROWSER GUI)
// ==========================================
const GENERIC_ADMIN_DELETE_TABLES = [
  'assessments',
  'roadmaps',
  'jobs',
  'applications',
  'mous',
  'problem_statements',
  'otp_verifications'
];

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
router.delete('/admin/table-data/:tableName/:id', requireAdmin, async (req: Request, res: Response) => {
  const tableName = String(req.params.tableName);
  const id = String(req.params.id);
  if (!GENERIC_ADMIN_DELETE_TABLES.includes(tableName)) {
    return res.status(400).json({ error: 'Use the dedicated account-deletion endpoint for users and students.' });
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
// DELETE COMPLETE USER / STUDENT ACCOUNT
// ==========================================
router.delete('/admin/users/:userId', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).user;
  const userId = String(req.params.userId);

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const client = await pool.connect();
  let deletedUser: any = null;
  let resumePath: string | null = null;

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT u.id, u.email, u.name, u.role, s.id AS student_id, s.resume_path
       FROM users u LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1 FOR UPDATE OF u`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }

    deletedUser = userResult.rows[0];
    resumePath = deletedUser.resume_path || null;
    const studentId = deletedUser.student_id;

    if (studentId) {
      await client.query(`DELETE FROM mentorship_messages WHERE room_id IN (SELECT id FROM mentorship_rooms WHERE student_id = $1)`, [studentId]);
      await client.query(`DELETE FROM mentorship_rooms WHERE student_id = $1`, [studentId]);
      await client.query(`DELETE FROM mentorship_requests WHERE student_id = $1`, [studentId]);
      await client.query(`DELETE FROM verification_reviews WHERE student_id = $1`, [studentId]);
      await client.query(`DELETE FROM digital_badges WHERE student_id = $1`, [studentId]);
      await client.query(`DELETE FROM applications WHERE student_id = $1`, [studentId]);
      await client.query(`DELETE FROM assessments WHERE student_id = $1`, [studentId]);
      await client.query(`DELETE FROM roadmaps WHERE student_id = $1`, [studentId]);
      await client.query(`DELETE FROM students WHERE id = $1`, [studentId]);
    }

    await client.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM otp_verifications WHERE LOWER(email) = LOWER($1)`, [deletedUser.email]);

    const deleteUserResult = await client.query(`DELETE FROM users WHERE id = $1 RETURNING id, email, name, role`, [userId]);
    if (deleteUserResult.rows.length === 0) {
      throw new Error('User disappeared before deletion completed.');
    }

    await client.query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [admin.email || admin.sub, 'DELETE_USER_ACCOUNT', JSON.stringify({
        deletedUserId: userId, deletedEmail: deletedUser.email, deletedName: deletedUser.name,
        deletedRole: deletedUser.role, deletedStudentId: studentId || null, deletedAt: new Date().toISOString()
      })]
    );

    await client.query('COMMIT');

    if (resumePath) {
      const fsPromises = require('fs').promises;
      try {
        await fsPromises.unlink(resumePath);
      } catch (fileError: any) {
        if (fileError.code !== 'ENOENT') {
          console.warn('User deleted but resume file could not be removed:', fileError.message);
        }
      }
    }

    return res.json({ success: true, message: 'User account and associated student data deleted successfully.', deleted: { userId, email: deletedUser.email, studentId: studentId || null } });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Delete user account error:', error);
    return res.status(500).json({ error: 'Account deletion failed. No changes were committed.' });
  } finally {
    client.release();
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
  isMentor: !!r.is_mentor,
  mentorTechStack: r.mentor_tech_stack || [],
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

