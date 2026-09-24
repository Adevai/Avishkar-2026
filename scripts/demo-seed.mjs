/**
 * Demo seeding & cleanup — idempotent, safe to re-run.
 *
 *  CLEANUP
 *   - removes e2e test junk (alumni-e2e-*@spark.test, XYZ Fake Institute…)
 *   - clears noisy audit_logs so the demo starts fresh
 *   - fixes inverted seeded salary ranges (₹16.0 - 12.0 LPA → low-high)
 *   - pushes stale problem-statement deadlines into the near future
 *  DEMO DATA
 *   - one known account per portal (password: Demo@2026):
 *       demo.student@spark.ac.in        student
 *       demo.college@spark.ac.in        college   (TPO, COEP)
 *       demo.industry@spark.ac.in       industry  (Persistent Systems)
 *       demo.gov@spark.ac.in            government
 *       ananya.deshpande@alumni.coep.ac.in  alumni mentor (approved)
 *   - student's applications across ATS stages, notifications,
 *     an accepted mentorship with a chat room, and a fast-track referral
 *
 * Usage:  node scripts/demo-seed.mjs   (or: npm run seed:demo)
 */
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'avishkar_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});
const q = (t, p) => pool.query(t, p);
const log = (...a) => console.log('  ', ...a);

const DEMO_PW = await bcrypt.hash('Demo@2026', 10);
const today = new Date();
const daysFromNow = (n) => {
  const d = new Date(today.getTime() + n * 86400000);
  return d.toISOString().slice(0, 10);
};

async function cleanup() {
  // e2e junk alumni — walk FK children first:
  // mentorship_messages → mentorship_rooms → mentorship_requests → alumni → alumni_applications
  const junkIds = await q(`SELECT id FROM alumni WHERE email LIKE 'alumni-e2e-%@spark.test'`);
  if (junkIds.rowCount > 0) {
    const ids = junkIds.rows.map(r => r.id);
    await q(`DELETE FROM mentorship_messages WHERE room_id IN (SELECT id FROM mentorship_rooms WHERE alumni_id = ANY($1))`, [ids]);
    await q(`DELETE FROM mentorship_rooms WHERE alumni_id = ANY($1)`, [ids]);
    await q(`DELETE FROM mentorship_requests WHERE alumni_id = ANY($1)`, [ids]);
    await q(`DELETE FROM fast_track_jobs WHERE alumni_id = ANY($1)`, [ids]);
    await q(`DELETE FROM alumni WHERE id = ANY($1)`, [ids]);
    log(`deleted ${ids.length} e2e alumni with all mentorship/fast-track children`);
  }
  const junkAlumni = await q(`DELETE FROM alumni_applications WHERE email LIKE 'alumni-e2e-%@spark.test' RETURNING id`);
  log(`deleted ${junkAlumni.rowCount} e2e alumni applications`);

  // junk verification queue rows (keep everything realistic)
  const junkVerify = await q(`DELETE FROM verification_reviews WHERE submitted_value LIKE 'XYZ Fake Institute%' OR submitted_value LIKE 'Mystery Institute%' RETURNING id`);
  log(`deleted ${junkVerify.rowCount} junk verification rows`);

  // audit noise (e2e + API probing) — start the demo with a clean ledger
  const audit = await q(`DELETE FROM audit_logs WHERE details::text ILIKE '%e2e%' OR actor ILIKE '%e2e%' OR actor ILIKE 'audit%' OR details::text ILIKE '%audit%'`);
  log(`deleted ${audit.rowCount} audit noise rows`);

  // orphaned audit-otp rows
  await q(`DELETE FROM otp_verifications WHERE expires_at < CURRENT_TIMESTAMP`);
}

async function fixBadSeedData() {
  // inverted salary ranges → low-high
  const bad = await q(`SELECT id, stipend_or_salary FROM jobs WHERE stipend_or_salary ~ '₹[0-9.]+ - [0-9.]+ LPA'`);
  let fixed = 0;
  for (const row of bad.rows) {
    const m = row.stipend_or_salary.match(/₹([0-9.]+) - ([0-9.]+) LPA/);
    if (!m) continue;
    const lo = parseFloat(m[1]), hi = parseFloat(m[2]);
    if (lo > hi) {
      await q(`UPDATE jobs SET stipend_or_salary = $1 WHERE id = $2`, [`₹${hi.toFixed(1)} - ${lo.toFixed(1)} LPA`, row.id]);
      fixed++;
    }
  }
  log(`fixed ${fixed} inverted salary ranges`);

  // stale capstone deadlines → future
  const stale = await q(`SELECT id, deadline FROM problem_statements WHERE deadline::text < CURRENT_DATE::text`);
  let i = 0;
  for (const row of stale.rows) {
    i++;
    await q(`UPDATE problem_statements SET deadline = $1 WHERE id = $2`, [daysFromNow(20 + i * 10), row.id]);
  }
  log(`moved ${i} stale capstone deadlines into the future`);

  // mojibake '₹' → '?' in legacy rows (encoding damage from old seed runs)
  const moji = await q(
    `UPDATE problem_statements
       SET title = replace(title, '?', '₹'),
           reward_or_grant = replace(reward_or_grant, '?', '₹'),
           description = replace(description, '?', '₹')
     WHERE title LIKE '%?%' OR reward_or_grant LIKE '%?%' OR description LIKE '%?%'`
  );
  log(`repaired ₹-mojibake in ${moji.rowCount} problem statements`);

  // stale core job deadlines → future (job-01…job-14 seeded with 2024 dates)
  const staleJobs = await q(`SELECT id, deadline FROM jobs WHERE deadline ~ '^\\d{4}-\\d{2}-\\d{2}$' AND deadline < CURRENT_DATE::text`);
  let j = 0;
  for (const row of staleJobs.rows) {
    j++;
    await q(`UPDATE jobs SET deadline = $1 WHERE id = $2`, [daysFromNow(15 + j * 3), row.id]);
  }
  log(`moved ${j} stale job deadlines into the future`);
}

async function upsertUser({ id, name, email, role, avatar, pwHash }) {
  await q(
    `INSERT INTO users (id, name, email, role, avatar, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (email) DO UPDATE SET name = $2, role = $4, avatar = $5, password_hash = $6`,
    [id, name, email, role, avatar, pwHash]
  );
}

async function demoAccounts() {
  const accounts = [
    { id: 'usr-demo-student', name: 'Aarav Sharma', email: 'demo.student@spark.ac.in', role: 'student', extra: 'Student' },
    { id: 'usr-demo-college', name: 'Prof. Meera Joshi (TPO)', email: 'demo.college@spark.ac.in', role: 'college', extra: 'TPO' },
    { id: 'usr-demo-industry', name: 'Rahul Verma (HR)', email: 'demo.industry@spark.ac.in', role: 'industry', extra: 'HR' },
    { id: 'usr-demo-gov', name: 'Dr. S. Kulkarni (Directorate)', email: 'demo.gov@spark.ac.in', role: 'government', extra: 'Govt' },
  ];
  for (const a of accounts) {
    await upsertUser({ ...a, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(a.name)}`, pwHash: DEMO_PW });
  }
  log(`ensured ${accounts.length} demo portal accounts (password Demo@2026)`);

  // ── Demo student profile ──────────────────────────────────────────────
  await q(
    `INSERT INTO students (id, user_id, name, email, avatar, college, degree, branch, semester, cgpa,
       graduation_year, target_role, bio, resume_uploaded, resume_name, github_url, linkedin_url,
       declared_skills, verified_skills, assessment_completed, readiness_score)
     VALUES ('std-demo-001','usr-demo-student','Aarav Sharma','demo.student@spark.ac.in',
       'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav%20Sharma',
       'IIT Bombay','B.Tech','Computer Science & Engineering',6,8.60,2027,'Full Stack Cloud Engineer',
       'Pre-final year CSE undergraduate at IIT Bombay. Passionate about distributed systems and cloud-native engineering.',
       TRUE,'Aarav_Sharma_Resume.pdf','https://github.com/aarav-sharma','https://linkedin.com/in/aarav-sharma',
       $1::jsonb, $2::jsonb, TRUE, 78)
     ON CONFLICT (email) DO UPDATE SET user_id = 'usr-demo-student', college = 'IIT Bombay',
       branch = 'Computer Science & Engineering', semester = 6, cgpa = 8.60,
       graduation_year = 2027, target_role = 'Full Stack Cloud Engineer',
       declared_skills = $1::jsonb, verified_skills = $2::jsonb, readiness_score = 78`,
    [
      JSON.stringify(['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'REST APIs', 'Git']),
      JSON.stringify([
        { skill: 'Data Structures & Algorithms', score: 82, verifiedAt: '2026-08-20' },
        { skill: 'Frontend Web (React/TS)', score: 88, verifiedAt: '2026-08-22' },
        { skill: 'Backend & REST APIs', score: 80, verifiedAt: '2026-08-25' },
        { skill: 'Cloud & Docker', score: 64, verifiedAt: '2026-09-01' },
        { skill: 'CI/CD & Kubernetes', score: 48, verifiedAt: '2026-09-01' },
        { skill: 'Professional Communication', score: 90, verifiedAt: '2026-08-10' },
      ]),
    ]
  );

  // assessment history for the demo student (trajectory for analytics tab)
  const hasAsm = await q(`SELECT id FROM assessments WHERE student_id = 'std-demo-001' LIMIT 1`);
  if (hasAsm.rowCount === 0) {
    const attempts = [
      { d: 45, pct: 58, grade: 'Needs Bridging', cats: { fundamentals: 55, backend_systems: 60, frontend_web: 65, cloud_devops: 45, ai_data: 55, soft_skills: 70 } },
      { d: 25, pct: 67, grade: 'Needs Bridging', cats: { fundamentals: 65, backend_systems: 70, frontend_web: 75, cloud_devops: 55, ai_data: 60, soft_skills: 75 } },
      { d: 8, pct: 74, grade: 'Proficient', cats: { fundamentals: 72, backend_systems: 75, frontend_web: 82, cloud_devops: 62, ai_data: 68, soft_skills: 85 } },
    ];
    let i = 0;
    for (const a of attempts) {
      i++;
      await q(
        `INSERT INTO assessments (id, student_id, completed_at, total_score, max_score, percentage, category_scores, time_spent_seconds, performance_grade)
         VALUES ($1,'std-demo-001', $2, $3, 16, $4, $5::jsonb, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [`asm-demo-${i}`, new Date(today.getTime() - a.d * 86400000).toISOString(), Math.round(16 * a.pct / 100), a.pct, JSON.stringify(a.cats), 300 + i * 40, a.grade]
      );
    }
    log('seeded 3 assessment attempts for the demo student');
  }

  // ── Demo applications across ATS stages ───────────────────────────────
  const jobsRes = await q(`SELECT id, title, company FROM jobs WHERE title ILIKE '%full stack%' OR title ILIKE '%cloud%' OR title ILIKE '%SRE%' OR title ILIKE '%backend%' ORDER BY posted_date DESC LIMIT 8`);
  const stages = ['Applied', 'Under Review', 'Assessment Sent', 'Shortlisted', 'Interview Scheduled', 'Offer Extended'];
  const appsRes = await q(`SELECT id FROM applications WHERE student_id = 'std-demo-001'`);
  if (appsRes.rowCount < 4 && jobsRes.rowCount > 0) {
    let i = 0;
    for (const j of jobsRes.rows) {
      if (i >= stages.length) break;
      const status = stages[i];
      const match = 62 + i * 6;
      await q(
        `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score, notes, stage_history)
         VALUES ($1,$2,$3,$4,'std-demo-001','Aarav Sharma', $5, $6, $7, $8, $9::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [
          `app-demo-${i + 1}`,
          j.id, j.title, j.company,
          daysFromNow(-(6 - i * 2)),
          status,
          match,
          status === 'Offer Extended' ? 'Strong performance across rounds. Offer released by HR.' : 'Pipeline progression logged by ATS.',
          JSON.stringify([`Applied → ${status}`]),
        ]
      );
      i++;
    }
    log(`seeded ${i} demo applications across ATS stages`);
  }

  // ── Demo notifications for the student ────────────────────────────────
  const notifs = [
    { t: 'Offer Extended 🎉', m: 'Persistent Systems released an offer for the Cloud Security & DevOps Specialist role. Congratulations!', ty: 'success' },
    { t: 'Interview Scheduled', m: 'Your Round-2 technical interview at Postman is scheduled for next week.', ty: 'info' },
    { t: 'Assessment Reminder', m: 'You have an ATS assessment pending from TCS Digital — complete it within 48 hours.', ty: 'warning' },
    { t: 'New Job Matches', m: '6 new opportunities matching your Full Stack Cloud Engineer profile were posted today.', ty: 'info' },
  ];
  let n = 0;
  for (const x of notifs) {
    n++;
    await q(
      `INSERT INTO notifications (id, user_id, title, message, type, read)
       VALUES ($1, 'usr-demo-student', $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [`notif-demo-${n}`, x.t, x.m, x.ty, n > 1]
    );
  }
  log(`seeded ${n} notifications for the demo student`);

  // ── Approved alumni mentor + accepted mentorship + chat room ──────────
  // Schema: alumni has NO user_id — it links to alumni_applications via application_id.
  // alumni_applications has NO password_hash / mentor_motivation columns.
  const mentorEmail = 'ananya.deshpande@alumni.coep.ac.in';
  await upsertUser({ id: 'usr-demo-alum', name: 'Ananya Deshpande', email: mentorEmail, role: 'alumni', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya%20Deshpande`, pwHash: DEMO_PW });

  // 1) Application row first (alumni.application_id → alumni_applications.id)
  await q(
    `INSERT INTO alumni_applications (id, full_name, email, phone, college_id, college_name, degree, graduation_year,
       company, designation, experience_years, linkedin_url, expertise, bio, status, review_note, reviewed_at)
     VALUES ('alumapp-demo-ananya','Ananya Deshpande',$1,'+91 98220 11223','COEP','College of Engineering, Pune',
       'B.Tech CSE',2019,'Zoho','Senior Systems Engineer',6,'https://linkedin.com/in/ananya-deshpande',
       $2::jsonb,'Giving back to my campus community.','approved','Records confirmed with the department office.',CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP`,
    [mentorEmail, JSON.stringify(['Backend Architecture', 'System Design', 'Interview Prep'])]
  );

  // 2) Directory row — reuse the seeded mentor's id if she already exists (email is UNIQUE)
  const existing = await q(`SELECT id FROM alumni WHERE email = $1`, [mentorEmail]);
  let alumniId = 'alum-demo-ananya';
  if (existing.rowCount > 0) {
    alumniId = existing.rows[0].id;
    await q(
      `UPDATE alumni SET application_id = 'alumapp-demo-ananya', company = 'Zoho', designation = 'Senior Systems Engineer',
         expertise = $1::jsonb, verified_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [JSON.stringify(['Backend Architecture', 'System Design', 'Interview Prep']), alumniId]
    );
  } else {
    await q(
      `INSERT INTO alumni (id, application_id, name, email, college_id, college_name, degree, graduation_year, company,
         designation, experience_years, expertise, bio, mentor_capacity, verified_at)
       VALUES ('alum-demo-ananya','alumapp-demo-ananya','Ananya Deshpande',$1,'COEP','College of Engineering, Pune','B.Tech CSE',2019,'Zoho',
         'Senior Systems Engineer',6,$2::jsonb,'Happy to help with backend careers and interview prep.',6,CURRENT_TIMESTAMP)`,
      [mentorEmail, JSON.stringify(['Backend Architecture', 'System Design', 'Interview Prep'])]
    );
  }

  // accepted mentorship request + room + welcome messages
  const hasReq = await q(`SELECT id FROM mentorship_requests WHERE student_id = 'std-demo-001' AND alumni_id = $1 LIMIT 1`, [alumniId]);
  if (hasReq.rowCount === 0) {
    await q(
      `INSERT INTO mentorship_requests (id, alumni_id, student_id, student_name, student_college, student_branch, message, status, responded_at)
       VALUES ('mreq-demo-1',$1,'std-demo-001','Aarav Sharma','IIT Bombay','Computer Science & Engineering',
         'Hello, I am preparing for backend + cloud roles. Could you guide me on projects and interview prep?', 'accepted', CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [alumniId]
    );
    await q(
      `INSERT INTO mentorship_rooms (id, alumni_id, student_id, request_id)
       VALUES ('mroom-demo-1',$1,'std-demo-001','mreq-demo-1')
       ON CONFLICT (id) DO NOTHING`,
      [alumniId]
    );
    await q(
      `UPDATE mentorship_requests SET room_id = 'mroom-demo-1' WHERE id = 'mreq-demo-1'`
    );
    const msgs = [
      { role: 'mentor', name: 'Ananya Deshpande', body: 'Welcome Aarav! This is our private mentorship room. Tell me a bit about the roles you are targeting.' },
      { role: 'student', name: 'Aarav Sharma', body: "Hi Ma'am! Targeting backend/cloud engineering roles for the 2027 placement season. Currently strengthening Docker and Kubernetes." },
      { role: 'mentor', name: 'Ananya Deshpande', body: 'Great start. Build one deployable project end-to-end — CI/CD, containerized, on a cloud free tier. That single project answers 70% of interview questions.' },
    ];
    let m = 0;
    for (const x of msgs) {
      m++;
      await q(
        `INSERT INTO mentorship_messages (id, room_id, sender_role, sender_name, body)
         VALUES ($1,'mroom-demo-1',$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [`msg-demo-${m}`, x.role, x.name, x.body]
      );
    }
    log('seeded accepted mentorship with a 3-message chat room');
  }

  // ── A fast-track referral opportunity from the mentor ─────────────────
  const hasFt = await q(`SELECT id FROM fast_track_jobs WHERE alumni_id = $1 LIMIT 1`, [alumniId]);
  if (hasFt.rowCount === 0) {
    await q(
      `INSERT INTO fast_track_jobs (id, alumni_id, alumni_name, title, company, type, stipend_or_salary, location, description, expiry_days)
       VALUES ('ftj-demo-1',$1,'Ananya Deshpande','Backend Engineer (Referral Fast-Track)','Zoho','Full-Time','₹10.0 - 14.0 LPA','Chennai / Remote',
         'Fast-track referral for backend engineers with strong REST + database fundamentals. Skips the standard application queue.', 21)
       ON CONFLICT (id) DO NOTHING`,
      [alumniId]
    );
    log('seeded 1 fast-track referral opportunity');
  }

  // ── A couple of realistic pending gov verification rows ───────────────
  const vrCount = await q(`SELECT count(*)::int AS n FROM verification_reviews WHERE status = 'pending'`);
  if (vrCount.rows[0].n < 2) {
    await q(
      `INSERT INTO verification_reviews (id, kind, submitted_value, level, confidence, matched_name, accreditation, student_id, student_name, status)
       VALUES ('vr-demo-1','institution','VJTI Mumbai','recognized',78,'VJTI Mumbai','NAAC A+','std-demo-001','Aarav Sharma','pending'),
              ('vr-demo-2','institution','Walchand College of Engineering, Sangli','unverified',44,null,null,null,null,'pending')
       ON CONFLICT (id) DO NOTHING`
    );
    log('seeded 2 realistic pending gov verification rows');
  }
}

async function main() {
  console.log('🧹 Cleaning demo-hostile test data…');
  await cleanup();
  console.log('🔧 Fixing bad seed data…');
  await fixBadSeedData();
  console.log('🎭 Seeding demo accounts & content…');
  await demoAccounts();

  // ── Recruiter ownership backfill: demo HR owns 3 open postings ─────────
  // Adds lifecycle data the industry portal now expects (posted_by/status).
  const hrJobs = [
    { t: 'Graduate Engineer Trainee — Cloud & DevOps', c: 'Persistent Systems', loc: 'Pune / Hybrid', pay: '₹8.0 - 12.0 LPA', typ: 'Full-Time', open: 12, dl: '2026-11-30' },
    { t: 'Software Intern — Full Stack (React + Node)', c: 'Persistent Systems', loc: 'Pune / Remote', pay: '₹40,000 / month', typ: 'Internship', open: 8, dl: '2026-10-31' },
    { t: 'Data Engineer — Early Careers', c: 'Persistent Systems', loc: 'Hyderabad', pay: '₹7.0 - 10.0 LPA', typ: 'Full-Time', open: 6, dl: '2026-12-15' },
  ];
  let ji = 0;
  for (const j of hrJobs) {
    ji++;
    await q(
      `INSERT INTO jobs (id, title, company, location, type, stipend_or_salary, openings, deadline, description,
         required_skills, min_cgpa, eligible_branches, source_platform, posted_by, posted_by_name, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Campus Direct','usr-demo-industry','Rahul Verma (HR)','open')
       ON CONFLICT (id) DO NOTHING`,
      [
        `job-demo-hr-${ji}`,
        j.t, j.c, j.loc, j.typ, j.pay, j.open, j.dl,
        `${j.t} at ${j.c}. Work with verified S.P.A.R.K. talent — apply with your competency passport.`,
        JSON.stringify([
          { name: 'Backend & REST APIs', weight: 0.25, minScore: 65 },
          { name: 'Frontend Web (React/TS)', weight: 0.25, minScore: 65 },
          { name: 'Relational Databases (SQL)', weight: 0.2, minScore: 60 },
          { name: 'Professional Communication', weight: 0.2, minScore: 60 },
        ]),
        6.5,
        JSON.stringify(['Computer Science & Engineering', 'Information Technology', 'AI & Data Science']),
      ]
    );
  }
  // One closed example so the lifecycle UI states are all visible in the demo
  await q(
    `UPDATE jobs SET status = 'filled' WHERE id = 'job-demo-hr-1' AND posted_by = 'usr-demo-industry'`
  );
  // Demo applications to the HR-owned internship so the ATS table has candidates
  const hrApplicants = [
    { sid: 'std-e2e-cand-1', name: 'Ishaan Kulkarni', score: 88, st: 'Shortlisted' },
    { sid: 'std-e2e-cand-2', name: 'Tanvi Deshmukh', score: 81, st: 'Applied' },
    { sid: 'std-e2e-cand-3', name: 'Rohan Patil', score: 76, st: 'Applied' },
  ];
  let ai2 = 0;
  for (const c of hrApplicants) {
    ai2++;
    await q(
      `INSERT INTO students (id, name, email, college, degree, branch, semester, cgpa, graduation_year, target_role, bio, readiness_score)
       VALUES ($1,$2,$3,'COEP Technological University','B.Tech','Computer Science & Engineering',6,$4,2027,'Full Stack Cloud Engineer','Demo candidate profile.',70)
       ON CONFLICT (id) DO NOTHING`,
      [c.sid, c.name, `${c.sid}@spark.test`, (7.2 + ai2 * 0.3).toFixed(2)]
    );
    await q(
      `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score, notes)
       VALUES ($1,'job-demo-hr-2',$2,'Persistent Systems',$3,$4,CURRENT_DATE - $5::int,$6,$7,'Demo application for recruiter ATS view.')
       ON CONFLICT (id) DO NOTHING`,
      [`app-demo-hr-${ai2}`, 'Software Intern — Full Stack (React + Node)', c.sid, c.name, ai2, c.st, c.score]
    );
  }
  log('backfilled demo recruiter ownership: 3 Persistent Systems postings + 3 ATS candidates');

  console.log('✅ Demo seed complete. Logins (password Demo@2026):');
  console.log('    demo.student@spark.ac.in   → student portal');
  console.log('    demo.college@spark.ac.in   → college portal');
  console.log('    demo.industry@spark.ac.in  → industry portal');
  console.log('    demo.gov@spark.ac.in       → government portal');
  console.log('    ananya.deshpande@alumni.coep.ac.in → alumni mentor portal');
  await pool.end();
}

main().catch((e) => { console.error('❌ demo seed failed:', e); process.exit(1); });
