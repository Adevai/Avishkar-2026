import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

/**
 * Alumni Network E2E — the full mentorship lifecycle:
 *
 *   application → university desk approval → directory inclusion
 *   → mentorship request → accept (room provisioning)
 *   → 1-on-1 chat → fast-track referral → student apply
 *
 * Requires a reachable PostgreSQL (PG* env or localhost defaults). Skips
 * gracefully at runtime when the DB is unavailable so unit-only CI stays green.
 */

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

process.env.NODE_ENV = 'test';
process.env.START_SERVER = 'false';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-e2e-0123456789abcdef';

const { app } = await import('./index');
const { pool, initDatabase } = await import('./db');

let dbAvailable = false;

beforeAll(async () => {
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
    await initDatabase();
  } catch (err) {
    console.error('[alumni-e2e] PostgreSQL unavailable — skipping DB tests:', (err as Error)?.message);
    dbAvailable = false;
  }
});

afterAll(async () => {
  await pool.end().catch(() => {});
});

const dbIt = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!dbAvailable) ctx.skip();
    await fn();
  });

// Deterministic test fixtures
const RUN = Date.now().toString(36);
const ALUMNI_EMAIL = `alumni-e2e-${RUN}@spark.test`;
const ALUMNI_NAME = 'Ananya Deshpande';
const STUDENT_EMAIL = `student-e2e-${RUN}@spark.test`;
const STUDENT_ID = `std-e2e-al-${RUN}`;
const COLLEGE_CODE = 'COEP';

describe('Alumni Network — full mentorship lifecycle', () => {
  let studentUserId = '';

  beforeAll(async () => {
    if (!dbAvailable) return;
    // Seed a student user + profile so the mentorship request has a real student
    studentUserId = `usr-e2e-stu-${RUN}`;
    await pool.query(
      `INSERT INTO users (id, name, email, role) VALUES ($1, 'E2E Student', $2, 'student')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
      [studentUserId, STUDENT_EMAIL]
    ).catch(() => {});
    await pool.query(
      `INSERT INTO students (id, user_id, name, email, college, degree, branch, semester, cgpa,
        graduation_year, target_role, bio, readiness_score)
       VALUES ($1, $2, 'E2E Student', $3, 'COEP Technological University, Pune', 'B.Tech', 'CSE', 7, 8.4, 2026, 'Cloud Engineer', '', 62)
       ON CONFLICT (id) DO NOTHING`,
      [STUDENT_ID, studentUserId, STUDENT_EMAIL]
    ).catch(() => {});
  });

  dbIt('rejects an application missing required fields', async () => {
    const res = await request(app).post('/api/alumni/apply').send({ workflow: 'alumni' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  dbIt('rejects an invalid workflow', async () => {
    const res = await request(app).post('/api/alumni/apply').send({
      workflow: 'wizard', fullName: ALUMNI_NAME, email: ALUMNI_EMAIL,
      collegeId: COLLEGE_CODE, collegeName: 'COEP', degree: 'B.Tech',
      graduationYear: 2019, company: 'Zoho', designation: 'SDE',
    });
    expect(res.status).toBe(400);
  });

  dbIt('accepts a valid alumni application and provisions a login user', async () => {
    const res = await request(app).post('/api/alumni/apply').send({
      workflow: 'alumni',
      fullName: ALUMNI_NAME,
      email: ALUMNI_EMAIL,
      phone: '+91 98220 12345',
      collegeId: COLLEGE_CODE,
      collegeName: 'COEP Technological University, Pune',
      degree: 'B.Tech',
      graduationYear: 2019,
      company: 'Zoho',
      designation: 'Senior Systems Engineer',
      experienceYears: 6,
      expertise: ['Cloud', 'Backend', 'System Design'],
      bio: 'Happy to help with backend careers and interview prep.',
      credentialDocName: 'degree_certificate.pdf',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // User row provisioned with role 'alumni'
    const u = await pool.query(`SELECT role FROM users WHERE LOWER(email) = $1`, [ALUMNI_EMAIL]);
    expect(u.rows.length).toBe(1);
    expect(u.rows[0].role).toBe('alumni');

    // Application lands in the college's pending queue
    const queue = await request(app)
      .get(`/api/alumni/applications?collegeId=${COLLEGE_CODE}`);
    expect(queue.status).toBe(200);
    const mine = queue.body.find((a: any) => a.email === ALUMNI_EMAIL);
    expect(mine).toBeDefined();
    expect(mine.status).toBe('pending');
    expect(mine.credentialDocName).toBe('degree_certificate.pdf');
  });

  dbIt('blocks duplicate pending applications for the same email', async () => {
    const res = await request(app).post('/api/alumni/apply').send({
      workflow: 'alumni', fullName: ALUMNI_NAME, email: ALUMNI_EMAIL,
      collegeId: COLLEGE_CODE, collegeName: 'COEP', degree: 'B.Tech',
      graduationYear: 2019, company: 'Zoho', designation: 'SDE',
    });
    expect(res.status).toBe(409);
  });

  dbIt('pre-approval /alumni/me reports pending review', async () => {
    const res = await request(app).get(`/api/alumni/me?email=${encodeURIComponent(ALUMNI_EMAIL)}`);
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(false);
    expect(res.body.applicationStatus).toBe('pending');
    expect(res.body.message).toMatch(/awaiting review/i);
  });

  dbIt('university desk approves → alumni minted and visible in directory', async () => {
    const queue = await request(app).get(`/api/alumni/applications?collegeId=${COLLEGE_CODE}`);
    const mine = queue.body.find((a: any) => a.email === ALUMNI_EMAIL);
    expect(mine).toBeDefined();

    const review = await request(app)
      .patch(`/api/alumni/applications/${mine.id}/review`)
      .send({ decision: 'approved', reviewNote: 'Verified against 2019 CSE batch records.' });
    expect(review.status).toBe(200);
    expect(review.body.status).toBe('approved');
    expect(review.body.alumniId).toBeDefined();

    // Directory inclusion
    const dir = await request(app).get('/api/alumni/directory');
    const entry = dir.body.find((a: any) => a.email === ALUMNI_EMAIL);
    expect(entry).toBeDefined();
    expect(entry.company).toBe('Zoho');
    expect(entry.collegeId).toBe(COLLEGE_CODE);

    // /alumni/me now resolves the mentor profile
    const me = await request(app).get(`/api/alumni/me?email=${encodeURIComponent(ALUMNI_EMAIL)}`);
    expect(me.body.found).toBe(true);
    expect(me.body.profile.id).toBe(review.body.alumniId);
    expect(me.body.profile.mentorCapacity).toBe(5);

    // Desk cannot approve the same application twice
    const again = await request(app)
      .patch(`/api/alumni/applications/${mine.id}/review`)
      .send({ decision: 'approved' });
    expect(again.status).toBe(409);
  });

  dbIt('student sends a mentorship request; mentor sees it in inbox', async () => {
    const me = await request(app).get(`/api/alumni/me?email=${encodeURIComponent(ALUMNI_EMAIL)}`);
    const alumniId = me.body.profile.id;

    const send = await request(app).post('/api/mentorship/request').send({
      alumniId,
      studentId: STUDENT_ID,
      studentName: 'E2E Student',
      studentCollege: 'COEP Technological University, Pune',
      studentBranch: 'CSE',
      message: 'Could you guide me on backend interview preparation?',
    });
    expect(send.status).toBe(201);

    // Duplicate guard
    const dup = await request(app).post('/api/mentorship/request').send({
      alumniId, studentId: STUDENT_ID, message: 'again',
    });
    expect(dup.status).toBe(409);

    const inbox = await request(app).get(`/api/mentorship/requests?alumniId=${alumniId}`);
    expect(inbox.status).toBe(200);
    const req = inbox.body.find((r: any) => r.studentId === STUDENT_ID);
    expect(req).toBeDefined();
    expect(req.status).toBe('pending');
  });

  dbIt('mentor accepts → private room provisioned with welcome message', async () => {
    const me = await request(app).get(`/api/alumni/me?email=${encodeURIComponent(ALUMNI_EMAIL)}`);
    const alumniId = me.body.profile.id;

    const inbox = await request(app).get(`/api/mentorship/requests?alumniId=${alumniId}`);
    const req = inbox.body.find((r: any) => r.studentId === STUDENT_ID && r.status === 'pending');
    expect(req).toBeDefined();

    const accept = await request(app)
      .patch(`/api/mentorship/requests/${req.id}`)
      .send({ decision: 'accepted' });
    expect(accept.status).toBe(200);
    expect(accept.body.status).toBe('accepted');
    expect(accept.body.roomId).toBeDefined();

    // Room exists and both parties can list it
    const rooms = await request(app).get(`/api/mentorship/rooms?userId=${alumniId}`);
    expect(rooms.body.some((r: any) => r.id === accept.body.roomId)).toBe(true);
    const stuRooms = await request(app).get(`/api/mentorship/rooms?userId=${STUDENT_ID}`);
    expect(stuRooms.body.some((r: any) => r.id === accept.body.roomId)).toBe(true);

    // Welcome message seeded
    const msgs = await request(app).get(`/api/mentorship/rooms/${accept.body.roomId}/messages`);
    expect(msgs.status).toBe(200);
    expect(msgs.body.length).toBeGreaterThanOrEqual(1);
    expect(msgs.body[0].body).toMatch(/private mentorship room/i);
  });

  dbIt('both parties exchange messages in the room', async () => {
    const me = await request(app).get(`/api/alumni/me?email=${encodeURIComponent(ALUMNI_EMAIL)}`);
    const alumniId = me.body.profile.id;
    const rooms = await request(app).get(`/api/mentorship/rooms?userId=${alumniId}`);
    const roomId = rooms.body[0].id;

    const m1 = await request(app).post(`/api/mentorship/rooms/${roomId}/messages`).send({
      senderRole: 'student', senderName: 'E2E Student',
      body: 'What DSA topics should I prioritize for product companies?',
    });
    expect(m1.status).toBe(201);

    const m2 = await request(app).post(`/api/mentorship/rooms/${roomId}/messages`).send({
      senderRole: 'mentor', senderName: ALUMNI_NAME,
      body: 'Focus on graphs, DP and system design basics. Happy to do a mock!',
    });
    expect(m2.status).toBe(201);

    const msgs = await request(app).get(`/api/mentorship/rooms/${roomId}/messages`);
    const bodies = msgs.body.map((m: any) => m.body);
    expect(bodies.some((b: string) => b.includes('DSA topics'))).toBe(true);
    expect(bodies.some((b: string) => b.includes('graphs, DP'))).toBe(true);

    // Invalid sender role rejected
    const bad = await request(app).post(`/api/mentorship/rooms/${roomId}/messages`).send({
      senderRole: 'admin', senderName: 'X', body: 'nope',
    });
    expect(bad.status).toBe(400);
  });

  dbIt('fast-track referral reaches the mentee and accepts their apply', async () => {
    const me = await request(app).get(`/api/alumni/me?email=${encodeURIComponent(ALUMNI_EMAIL)}`);
    const alumniId = me.body.profile.id;

    const post = await request(app).post('/api/mentorship/fast-track').send({
      alumniId, alumniName: ALUMNI_NAME,
      title: 'Backend Engineer Intern',
      company: 'Zoho',
      type: 'Internship',
      stipendOrSalary: '₹40,000/month',
      location: 'Chennai',
      description: 'Referral fast-track for my mentee — mention my name in the application.',
      expiryDays: 10,
    });
    expect(post.status).toBe(201);

    // Visible to the mentee specifically
    const ft = await request(app).get(`/api/mentorship/fast-track?studentId=${STUDENT_ID}`);
    expect(ft.status).toBe(200);
    const mine = ft.body.find((j: any) => j.alumniId === alumniId && j.title === 'Backend Engineer Intern');
    expect(mine).toBeDefined();

    // Mentee applies
    const apply = await request(app).post(`/api/mentorship/fast-track/${mine.id}/apply`).send({
      studentId: STUDENT_ID,
    });
    expect(apply.status).toBe(200);
    expect(apply.body.success).toBe(true);

    const after = await request(app).get(`/api/mentorship/fast-track?studentId=${STUDENT_ID}`);
    const mineAfter = after.body.find((j: any) => j.id === mine.id);
    expect(mineAfter.applicantIds).toContain(STUDENT_ID);

    // Second apply is idempotent
    const again = await request(app).post(`/api/mentorship/fast-track/${mine.id}/apply`).send({
      studentId: STUDENT_ID,
    });
    expect(again.body.alreadyApplied).toBe(true);
  });

  dbIt('rejecting an application does NOT mint an alumni record', async () => {
    const email = `alumni-rej-${RUN}@spark.test`;
    await request(app).post('/api/alumni/apply').send({
      workflow: 'alumni', fullName: 'Reject Me', email,
      collegeId: COLLEGE_CODE, collegeName: 'COEP', degree: 'B.Tech',
      graduationYear: 2020, company: 'X', designation: 'Y',
    });
    const queue = await request(app).get(`/api/alumni/applications?collegeId=${COLLEGE_CODE}`);
    const mine = queue.body.find((a: any) => a.email === email);

    const rej = await request(app)
      .patch(`/api/alumni/applications/${mine.id}/review`)
      .send({ decision: 'rejected', reviewNote: 'Graduation year not on record.' });
    expect(rej.status).toBe(200);
    expect(rej.body.status).toBe('rejected');

    const dir = await request(app).get('/api/alumni/directory');
    expect(dir.body.some((a: any) => a.email === email)).toBe(false);

    const me = await request(app).get(`/api/alumni/me?email=${encodeURIComponent(email)}`);
    expect(me.body.found).toBe(false);
    expect(me.body.applicationStatus).toBe('rejected');
  });

  dbIt('directory search filters by query', async () => {
    const res = await request(app).get('/api/alumni/directory?q=Zoho');
    expect(res.status).toBe(200);
    expect(res.body.some((a: any) => a.email === ALUMNI_EMAIL)).toBe(true);

    const empty = await request(app).get('/api/alumni/directory?q=NonexistentCorpXYZ');
    expect(empty.body.length).toBe(0);
  });
});
