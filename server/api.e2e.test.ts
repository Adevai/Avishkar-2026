import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

/**
 * End-to-end API tests via supertest.
 *
 * Requires a reachable PostgreSQL with the S.P.A.R.K. schema (PG* env or
 * defaults: localhost:5432/avishkar_db). Every describe block skips
 * gracefully when the DB is unavailable so unit-only CI runs stay green.
 */

// Silence normal startup logging during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

process.env.NODE_ENV = 'test';
process.env.START_SERVER = 'false';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-e2e-0123456789abcdef';

// Import AFTER env vars are set
const { app } = await import('./index');
const { pool, initDatabase } = await import('./db');

let dbAvailable = false;

beforeAll(async () => {
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
    // Run the REAL production schema init (idempotent: CREATE TABLE IF NOT EXISTS
    // + ALTER ADD COLUMN IF NOT EXISTS) so tests exercise the same shape as prod.
    await initDatabase();
    // Ensure deterministic schema bits the tests touch
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_reviews (
        id VARCHAR(64) PRIMARY KEY,
        kind VARCHAR(32) NOT NULL,
        submitted_value TEXT NOT NULL,
        level VARCHAR(16) NOT NULL,
        confidence INT NOT NULL,
        matched_name TEXT,
        accreditation TEXT,
        student_id VARCHAR(64),
        student_name TEXT,
        roll_number TEXT,
        details JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        reviewed_by VARCHAR(64),
        review_note TEXT,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(32) NOT NULL,
        avatar TEXT,
        password_hash VARCHAR(128),
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(128)');
  } catch (err) {
    console.error('[e2e] PostgreSQL unavailable — skipping DB-backed tests:', (err as Error)?.message);
    dbAvailable = false;
  }
});

afterAll(async () => {
  await pool.end().catch(() => {});
});

// Runtime skip: dbAvailable is set in beforeAll, which runs AFTER test collection,
// so the skip decision must happen inside the test body via ctx.skip().
const dbIt = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!dbAvailable) ctx.skip();
    await fn();
  });

// applications.student_id has a FK to students.id — make sure every referenced
// fixture student exists so the suite is self-sufficient on a fresh database.
const ensureStudent = async (sid: string, name: string) => {
  await pool.query(
    `INSERT INTO students (id, name, email, college, degree, branch, semester, cgpa, graduation_year, target_role)
     VALUES ($1, $2, $3, 'E2E Institute', 'B.Tech', 'Computer Engineering', 6, 7.5, 2026, 'Software Engineer')
     ON CONFLICT (id) DO NOTHING`,
    [sid, name, `${sid}@e2e.test`]
  );
};

// ── Health & root ────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  dbIt('reports healthy with DB latency and counts', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('latencyMs');
    expect(res.body).toHaveProperty('pool');
  });
});

// ── LOGIN FLOW & JWT ─────────────────────────────────────────────────────────
describe('POST /api/login (JWT auth flow)', () => {
  const testEmail = `e2e-login-${Date.now()}@spark.test`;
  const testPassword = 'Sup3rSecret!2026';

  dbIt('rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/login').send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  dbIt('rejects unknown email with 401 and generic message', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: `nobody-${Date.now()}@nowhere.test`, password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  dbIt('issues a verifiable JWT on correct credentials', async () => {
    // Arrange: create a user with a real bcrypt hash via the register flow's hash
    const { hashPassword } = await import('./auth');
    const hash = await hashPassword(testPassword);
    await pool.query(
      `INSERT INTO users (id, name, email, role, password_hash)
       VALUES ($1, $2, $3, 'government', $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $4`,
      [`usr-e2e-${Date.now()}`, 'E2E Reviewer', testEmail, hash]
    );

    const res = await request(app)
      .post('/api/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.role).toBe('government');

    // Token must decode back to the right subject
    const { verifyToken } = await import('./auth');
    const payload = verifyToken(res.body.token);
    expect(payload).not.toBeNull();
    expect(payload!.email).toBe(testEmail);
    expect(payload!.role).toBe('government');
  });

  dbIt('rejects a wrong password with 401 (not 500)', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: testEmail, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  dbIt('blocks protected routes without a token', async () => {
    const res = await request(app).get('/api/verification-queue');
    expect(res.status).toBe(401);
  });

  dbIt('rejects garbage tokens with 401', async () => {
    const res = await request(app)
      .get('/api/verification-queue')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });
});

// ── INSTITUTION VERIFICATION ─────────────────────────────────────────────────
describe('POST /api/verify/institution', () => {
  it('verifies a premier registry institution with high confidence', async () => {
    const res = await request(app)
      .post('/api/verify/institution')
      .send({ name: 'COEP Technological University, Pune' });

    expect(res.status).toBe(200);
    const v = res.body.verification;
    expect(v.verified).toBe(true);
    expect(v.level).toBe('verified');
    expect(v.confidence).toBeGreaterThanOrEqual(95);
    expect(v.matchedName).toMatch(/COEP/i);
  });

  it('verifies via acronym ("IIT Bombay" → registry entry)', async () => {
    const res = await request(app)
      .post('/api/verify/institution')
      .send({ name: 'IIT Bombay' });
    const v = res.body.verification;
    expect(v.verified).toBe(true);
    expect(v.matchedName).toMatch(/IIT Bombay/i);
  });

  it('flags a made-up institution as unverified', async () => {
    const res = await request(app)
      .post('/api/verify/institution')
      .send({ name: 'XYZ Fake Institute of Nothing Important 42' });
    const v = res.body.verification;
    expect(v.verified).toBe(false);
    expect(v.level).toBe('unverified');
  });

  it('rejects empty payload with 400', async () => {
    const res = await request(app).post('/api/verify/institution').send({});
    expect(res.status).toBe(400);
  });
});

// ── SSE EVENT STREAM ─────────────────────────────────────────────────────────
describe('GET /api/events (Server-Sent Events)', () => {
  it('delivers targeted events only to the addressed user', async () => {
    const { emitEvent } = await import('./events');
    const http = (await import('http')).default;

    const server = http.createServer(app);
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as any).port;

    // Open two SSE connections and return a snapshot fn of each stream's body
    const collect = (userId: string) => {
      const chunks: string[] = [];
      const req = http.get(
        { host: '127.0.0.1', port, path: `/api/events?userId=${userId}` },
        res => {
          res.setEncoding('utf8');
          res.on('data', c => chunks.push(c));
        }
      );
      req.on('error', () => {});
      return () => chunks.join('');
    };

    const snapAlice = collect('alice-e2e');
    const snapBob = collect('bob-e2e');
    await new Promise(r => setTimeout(r, 300)); // let both streams open

    emitEvent({
      type: 'notification',
      title: 'Stage update',
      message: 'ALICE-ONLY-PAYLOAD',
      targetUserId: 'alice-e2e',
    });
    await new Promise(r => setTimeout(r, 500));

    const bodyAlice = snapAlice();
    const bodyBob = snapBob();
    server.close();
    server.closeAllConnections();

    expect(bodyAlice).toContain('event: connected');
    expect(bodyAlice).toContain('ALICE-ONLY-PAYLOAD');
    // Bob must NOT receive an event addressed to Alice
    expect(bodyBob).not.toContain('ALICE-ONLY-PAYLOAD');
    expect(bodyBob).toContain('event: connected'); // his stream is still healthy
  });

  it('streams the connected frame, a live event, and stays open', async () => {
    const { emitEvent } = await import('./events');

    // Manual HTTP request so we can control reading without killing the socket
    const { createServer } = await import('http');
    const server = createServer(app);
    await new Promise<void>(r => server.listen(0, r));
    const port = (server.address() as any).port;

    const chunks: string[] = [];
    const body = await new Promise<string>(resolve => {
      import('http').then(({ default: http }) => {
        const req = http.get(
          { host: '127.0.0.1', port, path: '/api/events?userId=sse-e2e' },
          res => {
            res.setEncoding('utf8');
            res.on('data', c => chunks.push(c));
            // Give the stream a moment, emit, then resolve shortly after
            setTimeout(() => {
              emitEvent({
                type: 'new_job',
                title: 'E2E Test Event',
                message: 'Live push received',
                data: { source: 'vitest' },
              });
              setTimeout(() => resolve(chunks.join('')), 400);
            }, 300);
          }
        );
        req.on('error', () => resolve(chunks.join('')));
      });
    });

    server.close();

    expect(body).toContain('event: connected');
    expect(body).toContain('event: spark');
    expect(body).toContain('"type":"new_job"');
    expect(body).toContain('E2E Test Event');
  });
});

// ── REVIEW QUEUE (protected) ─────────────────────────────────────────────────
describe('Verification review queue (government role)', () => {
  let token = '';

  beforeAll(async () => {
    if (!dbAvailable) return;
    const email = `e2e-reviewer-${Date.now()}@gov.test`;
    const { hashPassword } = await import('./auth');
    const hash = await hashPassword('Reviewer!2026');
    await pool.query(
      `INSERT INTO users (id, name, email, role, password_hash)
       VALUES ($1, $2, $3, 'government', $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $4`,
      [`usr-e2e-rv-${Date.now()}`, 'E2E Govt Reviewer', email, hash]
    );
    const res = await request(app).post('/api/login').send({ email, password: 'Reviewer!2026' });
    token = res.body.token;
  });

  dbIt('lists queue items for an authenticated reviewer', async () => {
    const res = await request(app)
      .get('/api/verification-queue?status=all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(res.body.counts).toHaveProperty('pending');
  });

  dbIt('creates + approves an institution review and flips the student flag', async () => {
    // Seed a student whose flag will be flipped on approval
    const studentId = `std-e2e-rv-${Date.now()}`;
    await pool.query(
      `INSERT INTO students (id, name, email, college, degree, branch, semester, cgpa,
        graduation_year, target_role, bio, readiness_score)
       VALUES ($1, 'E2E Student', $2, 'Some College', 'B.Tech', 'CSE', 7, 8.0, 2026, 'Engineer', '', 60)
       ON CONFLICT (id) DO NOTHING`,
      [studentId, `e2e-rv-${Date.now()}@spark.test`]
    ).catch(() => {});

    const ins = await pool.query(
      `INSERT INTO verification_reviews (id, kind, submitted_value, level, confidence, student_id, student_name)
       VALUES ($1, 'institution', 'Mystery Institute of Tech', 'recognized', 62, $2, 'E2E Student')
       RETURNING id`,
      [`vr-e2e-${Date.now()}`, studentId]
    );
    const reviewId = ins.rows[0].id;

    const approve = await request(app)
      .patch(`/api/verification-queue/${reviewId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved', reviewNote: 'Documents verified' });

    expect(approve.status).toBe(200);
    expect(approve.body.review.status).toBe('approved');
    expect(approve.body.review.reviewed_by).toBeDefined();

    // Student flag flipped
    const stu = await pool.query('SELECT institution_verified FROM students WHERE id = $1', [studentId]);
    if (stu.rows.length > 0) {
      expect(stu.rows[0].institution_verified).toBe(true);
    }
  });

  dbIt('rejects invalid status values with 400', async () => {
    const res = await request(app)
      .patch('/api/verification-queue/vr-nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'maybe' });
    expect(res.status).toBe(400);
  });
});

// ── REGISTRATION DUPLICATE GUARD (regression: silent account overwrite) ─────
describe('POST /api/register (duplicate account guard)', () => {
  const dupEmail = `e2e-dup-${Date.now()}@spark.test`;
  let userId = '';

  afterAll(async () => {
    if (!dbAvailable) return;
    await pool.query(`DELETE FROM otp_verifications WHERE LOWER(email) LIKE 'e2e-dup-%' OR LOWER(email) LIKE 'e2e-nootp-%'`).catch(() => {});
    await pool.query(`DELETE FROM students WHERE LOWER(email) LIKE 'e2e-dup-%'`).catch(() => {});
    await pool.query(`DELETE FROM users WHERE LOWER(email) LIKE 'e2e-dup-%'`).catch(() => {});
  });

  async function verifyFreshOtp(email: string): Promise<string | undefined> {
    await request(app).post('/api/auth/register-send-otp').send({ email, name: 'E2E Dup' });
    const otpRow = await pool.query(
      'SELECT otp FROM otp_verifications WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    const otp = otpRow.rows[0]?.otp as string | undefined;
    if (!otp) return undefined;
    const verify = await request(app).post('/api/auth/register-verify-otp').send({ email, otp });
    expect(verify.status).toBe(200);
    return otp;
  }

  dbIt('creates a fresh account through the full OTP flow', async () => {
    await verifyFreshOtp(dupEmail);

    const reg = await request(app).post('/api/register').send({
      role: 'student', name: 'E2E Dup', email: dupEmail, password: 'DupPass@2026',
      college: 'E2E College', degree: 'B.Tech', branch: 'CSE', semester: 3,
      cgpa: 7.5, graduationYear: 2027, targetRole: 'Full Stack Cloud Engineer',
    });
    expect(reg.status).toBe(200);
    expect(reg.body.success).toBe(true);
    userId = reg.body.user.id;

    const user = await pool.query('SELECT id, name FROM users WHERE LOWER(email) = $1', [dupEmail]);
    expect(user.rows.length).toBe(1);
    expect(user.rows[0].name).toBe('E2E Dup');
  });

  dbIt('rejects re-registration of the same email with 409 and leaves the original intact', async () => {
    await verifyFreshOtp(dupEmail);

    const reg = await request(app).post('/api/register').send({
      role: 'student', name: 'E2E Dup Impostor', email: dupEmail, password: 'Hijack@2026',
      college: 'E2E College', degree: 'B.Tech', branch: 'CSE', semester: 1,
      cgpa: 6.0, graduationYear: 2030, targetRole: 'Full Stack Cloud Engineer',
    });
    expect(reg.status).toBe(409);
    expect(String(reg.body.error)).toMatch(/already exists/i);

    // Original row untouched: same id, same name, password NOT replaced
    const user = await pool.query('SELECT id, name FROM users WHERE LOWER(email) = $1', [dupEmail]);
    expect(user.rows.length).toBe(1);
    expect(user.rows[0].id).toBe(userId);
    expect(user.rows[0].name).toBe('E2E Dup');
  });

  dbIt('still enforces the OTP gate before anything else (403 without OTP)', async () => {
    const reg = await request(app).post('/api/register').send({
      role: 'student', name: 'No Otp', email: `e2e-nootp-${Date.now()}@spark.test`, password: 'Whatever@1',
    });
    expect(reg.status).toBe(403);
  });
});

// ── PORTAL ROLE VERIFICATION MATRIX ────────────────────────────────────────
describe('Portal role verification matrix', () => {
  const stamp = Date.now();
  const gmailStudentEmail = `e2e-gmail-stu-${stamp}@gmail.com`;
  const acStudentEmail = `e2e-ac-stu-${stamp}@iitb.ac.in`;
  const collegeEmail = `e2e-college-${stamp}@spark-inst.test`;
  const industryEmail = `e2e-ind-${stamp}@tcs.test`;
  const freeIndEmail = `e2e-freeind-${stamp}@gmail.com`;
  const alumniEmail = `e2e-alum-${stamp}@spark.test`;
  let adminToken = '';
  let collegeToken = '';
  let alumniUserId = '';
  let alumniAppId = '';

  const registerViaOtp = async (payload: Record<string, any>): Promise<number> => {
    // Many registrations run back-to-back from one IP; keep the auth bucket
    // clear so we exercise the real flows, not the 429s.
    const { __resetAuthRateBucketsForTests } = await import('./index');
    __resetAuthRateBucketsForTests();
    const email = String(payload.email);
    await request(app).post('/api/auth/register-send-otp').send({ email, name: payload.name || 'E2E Verify' });
    const otpRow = await pool.query(
      'SELECT otp FROM otp_verifications WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    if (!otpRow.rows[0]?.otp) return 500; // SMTP-less env; OTP dispatch failed
    await request(app).post('/api/auth/register-verify-otp').send({ email, otp: otpRow.rows[0].otp });
    const reg = await request(app).post('/api/register').send(payload);
    return reg.status;
  };

  beforeAll(async () => {
    if (!dbAvailable) return;
    // This suite makes many OTP + login calls from the test IP; clear the
    // auth buckets so earlier describes don't starve later ones (and we don't
    // starve them).
    const { __resetAuthRateBucketsForTests } = await import('./index');
    const { __resetRateLimitsForTests } = await import('./rateLimit');
    __resetAuthRateBucketsForTests();
    __resetRateLimitsForTests();
    const { hashPassword } = await import('./auth');
    // Platform admin (government role) for the admin verification desk
    const adminHash = await hashPassword('Admin!2026');
    await pool.query(
      `INSERT INTO users (id, name, email, role, password_hash)
       VALUES ($1, 'E2E Gov Admin', $2, 'government', $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      [`usr-e2e-verify-admin-${stamp}`, `e2e-verify-admin-${stamp}@gov.test`, adminHash]
    );
    const adminLogin = await request(app).post('/api/login').send({ email: `e2e-verify-admin-${stamp}@gov.test`, password: 'Admin!2026' });
    adminToken = adminLogin.body.token;
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    const emails = [gmailStudentEmail, acStudentEmail, collegeEmail, industryEmail, freeIndEmail, alumniEmail, `e2e-verify-admin-${stamp}@gov.test`];
    for (const e of emails) {
      await pool.query(`DELETE FROM otp_verifications WHERE LOWER(email) = $1`, [e]).catch(() => {});
      await pool.query(`DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = $1)`, [e]).catch(() => {});
      await pool.query(`DELETE FROM students WHERE LOWER(email) = $1`, [e]).catch(() => {});
      await pool.query(`DELETE FROM alumni WHERE LOWER(email) = $1`, [e]).catch(() => {});
      await pool.query(`DELETE FROM alumni_applications WHERE LOWER(email) = $1`, [e]).catch(() => {});
      await pool.query(`DELETE FROM institutions WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = $1)`, [e]).catch(() => {});
      await pool.query(`DELETE FROM industries WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = $1)`, [e]).catch(() => {});
      await pool.query(`DELETE FROM users WHERE LOWER(email) = $1`, [e]).catch(() => {});
    }
  });

  dbIt('student with institutional domain + OTP auto-verifies', async () => {
    const status = await registerViaOtp({
      role: 'student', name: 'E2E AC Student', email: acStudentEmail, password: 'AcStu@2026',
      college: 'Indian Institute of Technology Bombay', degree: 'B.Tech', branch: 'CSE', semester: 4, cgpa: 8.2,
    });
    expect(status).toBe(200);
    const vs = await pool.query(`SELECT verification_status FROM users WHERE LOWER(email) = $1`, [acStudentEmail]);
    expect(vs.rows[0]?.verification_status).toBe('verified');
  });

  dbIt('student with personal gmail lands in PENDING_COLLEGE_APPROVAL and the TPO approves in one click', async () => {
    const status = await registerViaOtp({
      role: 'student', name: 'E2E Gmail Student', email: gmailStudentEmail, password: 'GmStu@2026',
      college: 'Some Local Engineering College', degree: 'B.Tech', branch: 'IT', semester: 3, cgpa: 7.4,
    });
    expect(status).toBe(200);
    const vs = await pool.query(`SELECT verification_status, id FROM users WHERE LOWER(email) = $1`, [gmailStudentEmail]);
    expect(vs.rows[0]?.verification_status).toBe('pending_college_approval');
  });

  dbIt('college registration requires a valid AISHE code and a matching email domain', async () => {
    const badAishe = await registerViaOtp({
      role: 'college', name: 'E2E College Bad', email: `e2e-college-bad-${stamp}@spark-inst.test`, password: 'Col@2026',
      aisheCode: 'COLLEGE-123', officialDomain: 'spark-inst.test',
    });
    expect(badAishe).toBe(400);

    const domainMismatch = await registerViaOtp({
      role: 'college', name: 'E2E College Wrong', email: collegeEmail, password: 'Col@2026',
      aisheCode: 'C-33915', officialDomain: 'different-domain.edu',
    });
    expect(domainMismatch).toBe(400);

    const good = await registerViaOtp({
      role: 'college', name: 'E2E College Good', email: collegeEmail, password: 'Col@2026',
      aisheCode: 'C-33915', officialDomain: 'spark-inst.test',
    });
    expect(good).toBe(200);
    const vs = await pool.query(`SELECT verification_status FROM users WHERE LOWER(email) = $1`, [collegeEmail]);
    expect(vs.rows[0]?.verification_status).toBe('verified');

    const colLogin = await request(app).post('/api/login').send({ email: collegeEmail, password: 'Col@2026' });
    collegeToken = colLogin.body.token;
    expect(collegeToken).toBeTruthy();
  });

  dbIt('college TPO sees the gmail student in its queue and approves with one click', async () => {
    const queue = await request(app).get('/api/verify/college-approvals').set('Authorization', `Bearer ${collegeToken}`);
    expect(queue.status).toBe(200);
    const pendingStudent = queue.body.students.find((s: any) => s.email === gmailStudentEmail);
    expect(pendingStudent).toBeTruthy();

    const approve = await request(app)
      .patch(`/api/verify/college-approvals/${pendingStudent.id}`)
      .set('Authorization', `Bearer ${collegeToken}`)
      .send({ decision: 'verified', kind: 'student' });
    expect(approve.status).toBe(200);
    const vs = await pool.query(`SELECT verification_status FROM users WHERE LOWER(email) = $1`, [gmailStudentEmail]);
    expect(vs.rows[0]?.verification_status).toBe('verified');
  });

  dbIt('industry blocks free mail domains and requires a valid CIN/GSTIN or certificate', async () => {
    const freeMail = await registerViaOtp({
      role: 'industry', name: 'E2E Free Ind', email: freeIndEmail, password: 'Ind@2026', company: 'Free Mail Corp',
    });
    expect(freeMail).toBe(400);

    const badCin = await registerViaOtp({
      role: 'industry', name: 'E2E Ind Bad Cin', email: `e2e-indbad-${stamp}@tcs.test`, password: 'Ind@2026',
      company: 'Bad CIN Corp', cinGstin: 'NOT-A-CIN',
    });
    expect(badCin).toBe(400);

    const goodCin = await registerViaOtp({
      role: 'industry', name: 'E2E Ind Good', email: industryEmail, password: 'Ind@2026',
      company: 'Good CIN Corp', cinGstin: 'L12345MH2020PLC123456',
    });
    expect(goodCin).toBe(200);
    const vs = await pool.query(`SELECT verification_status FROM users WHERE LOWER(email) = $1`, [industryEmail]);
    expect(vs.rows[0]?.verification_status).toBe('verified');

    // Startup fallback: no CIN but an incorporation document → pending admin
    const startupEmail = `e2e-startup-${stamp}@coolstartup.test`;
    const startup = await registerViaOtp({
      role: 'industry', name: 'E2E Startup', email: startupEmail, password: 'Ind@2026',
      company: 'Cool Startup', incorporationDocument: '/uploads/verify/udyam-cert.png',
    });
    expect(startup).toBe(200);
    const svs = await pool.query(`SELECT verification_status FROM users WHERE LOWER(email) = $1`, [startupEmail]);
    expect(svs.rows[0]?.verification_status).toBe('pending_admin_approval');
    await pool.query(`DELETE FROM industries WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = $1)`, [startupEmail]).catch(() => {});
    await pool.query(`DELETE FROM users WHERE LOWER(email) = $1`, [startupEmail]).catch(() => {});
  });

  dbIt('admin desk verifies a pending_admin_approval account', async () => {
    const startupEmail = `e2e-adminverify-${stamp}@cooltwo.test`;
    const startup = await registerViaOtp({
      role: 'industry', name: 'E2E AdminVerify', email: startupEmail, password: 'Ind@2026',
      company: 'Cool Two', incorporationDocument: '/uploads/verify/udyam-two.pdf',
    });
    expect(startup).toBe(200);

    const queue = await request(app).get('/api/verify/admin-queue').set('Authorization', `Bearer ${adminToken}`);
    expect(queue.status).toBe(200);
    const acct = queue.body.accounts.find((a: any) => a.email === startupEmail);
    expect(acct).toBeTruthy();

    const approve = await request(app)
      .patch(`/api/verify/admin-queue/${acct.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'verified', reviewNote: 'Udyam certificate looks legit.' });
    expect(approve.status).toBe(200);
    const vs = await pool.query(`SELECT verification_status FROM users WHERE LOWER(email) = $1`, [startupEmail]);
    expect(vs.rows[0]?.verification_status).toBe('verified');
    await pool.query(`DELETE FROM industries WHERE user_id = $1`, [acct.id]).catch(() => {});
    await pool.query(`DELETE FROM users WHERE id = $1`, [acct.id]).catch(() => {});
  });

  dbIt('alumni registers with grad year + enrollment + LinkedIn, stays pending until the college vouches, then the mentor profile unlocks', async () => {
    // Missing LinkedIn → 400
    const noLinkedin = await registerViaOtp({
      role: 'alumni', name: 'E2E Alum NoLink', email: `e2e-alumnl-${stamp}@spark.test`, password: 'Al@2026',
      college: 'E2E Institute', graduationYear: 2019, enrollmentNumber: 'B2019001',
    });
    expect(noLinkedin).toBe(400);

    // Missing enrollment → 400
    const noEnrollment = await registerViaOtp({
      role: 'alumni', name: 'E2E Alum NoEnr', email: `e2e-alumne-${stamp}@spark.test`, password: 'Al@2026',
      college: 'E2E Institute', graduationYear: 2019, linkedinUrl: 'https://linkedin.com/in/e2e-alum-ne',
    });
    expect(noEnrollment).toBe(400);

    // Good registration → pending application, no mentor record yet
    const ok = await registerViaOtp({
      role: 'alumni', name: 'E2E Alum', email: alumniEmail, password: 'Al@2026',
      college: 'E2E Institute', graduationYear: 2019, enrollmentNumber: 'B2019042',
      linkedinUrl: 'https://linkedin.com/in/e2e-alum-test', company: 'Mentor Corp',
    });
    expect(ok).toBe(200);
    const vs = await pool.query(`SELECT id, verification_status FROM users WHERE LOWER(email) = $1`, [alumniEmail]);
    alumniUserId = vs.rows[0]?.id;
    expect(vs.rows[0]?.verification_status).toBe('pending_college_approval');
    const appRow = await pool.query(`SELECT id FROM alumni_applications WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1`, [alumniEmail]);
    alumniAppId = appRow.rows[0]?.id;
    expect(alumniAppId).toBeTruthy();
    const noMentorYet = await pool.query(`SELECT id FROM alumni WHERE LOWER(email) = $1`, [alumniEmail]);
    expect(noMentorYet.rows.length).toBe(0);

    // Mentor profile is locked before approval
    const locked = await request(app)
      .patch('/api/alumni/mentor-profile')
      .send({ isMentor: true, techStack: ['React'] }); // unauthenticated → 401 first
    expect(locked.status).toBe(401);

    // College vouches → mentor record minted, user verified
    const vouch = await request(app)
      .patch(`/api/verify/college-approvals/${alumniAppId}`)
      .set('Authorization', `Bearer ${collegeToken}`)
      .send({ decision: 'verified', kind: 'alumni' });
    expect(vouch.status).toBe(200);

    const afterVs = await pool.query(`SELECT verification_status FROM users WHERE LOWER(email) = $1`, [alumniEmail]);
    expect(afterVs.rows[0]?.verification_status).toBe('verified');
    const mentorRow = await pool.query(`SELECT id FROM alumni WHERE LOWER(email) = $1`, [alumniEmail]);
    expect(mentorRow.rows.length).toBe(1);

    // Enable mentor profile with company/role/tech stack
    const alumLogin = await request(app).post('/api/login').send({ email: alumniEmail, password: 'Al@2026' });
    const alumToken = alumLogin.body.token;
    const enable = await request(app)
      .patch('/api/alumni/mentor-profile')
      .set('Authorization', `Bearer ${alumToken}`)
      .send({ isMentor: true, mentorCapacity: 8, techStack: ['React', 'Kubernetes'], currentCompany: 'Mentor Corp HQ', currentRole: 'Staff Engineer' });
    expect(enable.status).toBe(200);
    expect(enable.body.profile.is_mentor).toBe(true);
    expect(enable.body.profile.mentor_tech_stack).toEqual(['React', 'Kubernetes']);
  });
});

// ── JOB OWNERSHIP + LIFECYCLE + PAGINATION ───────────────────────────────────
describe('Job ownership, lifecycle & pagination', () => {
  let recruiterToken = '';
  let otherToken = '';
  let ownedJobId = '';
  const jobIds: string[] = [];

  beforeAll(async () => {
    if (!dbAvailable) return;
    const { hashPassword } = await import('./auth');
    const stamp = Date.now();
    for (const [suffix, name] of [[`own-${stamp}`, 'E2E Recruiter Own'], [`other-${stamp}`, 'E2E Recruiter Other']] as const) {
      const email = `e2e-rec-${suffix}@corp.test`;
      const hash = await hashPassword('Recruiter!2026');
      await pool.query(
        `INSERT INTO users (id, name, email, role, password_hash)
         VALUES ($1, $2, $3, 'industry', $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = $4`,
        [`usr-e2e-rec-${suffix}`, name, email, hash]
      );
      const res = await request(app).post('/api/login').send({ email, password: 'Recruiter!2026' });
      if (suffix.startsWith('own')) recruiterToken = res.body.token;
      else otherToken = res.body.token;
    }
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    for (const id of jobIds) {
      await pool.query(`DELETE FROM applications WHERE job_id = $1`, [id]).catch(() => {});
      await pool.query(`DELETE FROM jobs WHERE id = $1`, [id]).catch(() => {});
    }
    await pool.query(`DELETE FROM users WHERE email LIKE 'e2e-rec-own-%@corp.test' OR email LIKE 'e2e-rec-other-%@corp.test'`).catch(() => {});
    await pool.query(`DELETE FROM students WHERE email LIKE 'e2e-cand-%@spark.test'`).catch(() => {});
  });

  async function postJob(token: string, title: string): Promise<string> {
    const res = await request(app).post('/api/jobs').set('Authorization', `Bearer ${token}`).send({
      title, company: 'E2E Corp', location: 'Pune', type: 'Internship',
      stipendOrSalary: '₹30,000 / month', openings: 2, description: 'E2E role',
      requiredSkills: [{ name: 'React.js', weight: 0.5, minScore: 60 }],
      minCgpa: 6.0, eligibleBranches: ['Computer Science & Engineering'],
    });
    expect(res.status).toBe(200);
    jobIds.push(res.body.job.id);
    return res.body.job.id;
  }

  dbIt('POST /jobs records the recruiter as owner', async () => {
    ownedJobId = await postJob(recruiterToken, 'E2E Owned Role A');
    const row = await pool.query('SELECT posted_by, posted_by_name, status FROM jobs WHERE id = $1', [ownedJobId]);
    expect(row.rows[0].status).toBe('open');
    expect(row.rows[0].posted_by).toBeTruthy();
    expect(row.rows[0].posted_by_name).toBe('E2E Recruiter Own');
  });

  dbIt('GET /jobs?mine=1 returns only own postings (and 401 without auth)', async () => {
    await postJob(recruiterToken, 'E2E Owned Role B');
    const unauth = await request(app).get('/api/jobs?mine=1');
    expect(unauth.status).toBe(401);

    const mine = await request(app).get('/api/jobs?mine=1').set('Authorization', `Bearer ${recruiterToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.total).toBe(2);
    expect(mine.body.jobs.every((j: any) => j.title.startsWith('E2E Owned'))).toBe(true);
    // And the other recruiter sees none of them
    const theirs = await request(app).get('/api/jobs?mine=1').set('Authorization', `Bearer ${otherToken}`);
    expect(theirs.body.total).toBe(0);
  });

  dbIt('public board hides closed jobs by default, includes them with includeUnavailable=1; pagination envelope is correct', async () => {
    const paged = await request(app).get('/api/jobs?page=1&limit=5&q=E2E');
    expect(paged.status).toBe(200);
    expect(paged.body).toHaveProperty('totalPages');
    expect(paged.body.jobs.length).toBeLessThanOrEqual(5);
    expect(paged.body.jobs.some((j: any) => j.id === ownedJobId)).toBe(true);

    await request(app).patch(`/api/jobs/${ownedJobId}/status`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'closed' });
    // Default board hides it
    const after = await request(app).get('/api/jobs?q=E2E');
    expect(after.body.jobs.some((j: any) => j.id === ownedJobId)).toBe(false);
    // Student board (includeUnavailable) still sees it, with status for the badge
    const incl = await request(app).get('/api/jobs?q=E2E&includeUnavailable=1');
    const closedRow = incl.body.jobs.find((j: any) => j.id === ownedJobId);
    expect(closedRow).toBeTruthy();
    expect(closedRow.status).toBe('closed');
    // Owner still sees it in their manage view
    const mineAfter = await request(app).get('/api/jobs?mine=1').set('Authorization', `Bearer ${recruiterToken}`);
    const closed = mineAfter.body.jobs.find((j: any) => j.id === ownedJobId);
    expect(closed.status).toBe('closed');
  });

  dbIt('non-owner cannot edit/close/fill/delete a job (403)', async () => {
    const target = jobIds[1]; // Owned Role B, still open
    const patch = await request(app).patch(`/api/jobs/${target}`).set('Authorization', `Bearer ${otherToken}`).send({ title: 'Hacked' });
    expect(patch.status).toBe(403);
    const status = await request(app).patch(`/api/jobs/${target}/status`).set('Authorization', `Bearer ${otherToken}`).send({ status: 'filled' });
    expect(status.status).toBe(403);
    const del = await request(app).delete(`/api/jobs/${target}`).set('Authorization', `Bearer ${otherToken}`);
    expect(del.status).toBe(403);
  });

  dbIt('owner can edit a job; DELETE is blocked with applicants (409) and allowed without', async () => {
    const target = jobIds[1];
    const edit = await request(app).patch(`/api/jobs/${target}`).set('Authorization', `Bearer ${recruiterToken}`).send({ openings: 9, description: 'Updated by owner' });
    expect(edit.status).toBe(200);
    expect(edit.body.job.openings).toBe(9);

    // Applicant exists → 409, job preserved
    await ensureStudent('std-e2e-cand-x', 'E2E Candidate');
    await pool.query(
      `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score)
       VALUES ($1, $2, 'E2E Owned Role B', 'E2E Corp', 'std-e2e-cand-x', 'E2E Candidate', CURRENT_DATE, 'Applied', 70)
       ON CONFLICT (id) DO NOTHING`,
      [`app-e2e-${Date.now()}`, target]
    );
    const delBlocked = await request(app).delete(`/api/jobs/${target}`).set('Authorization', `Bearer ${recruiterToken}`);
    expect(delBlocked.status).toBe(409);
    await pool.query(`DELETE FROM applications WHERE job_id = $1`, [target]);

    // Fill → allowed; then delete (no applicants now) → 200
    const fill = await request(app).patch(`/api/jobs/${target}/status`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'filled' });
    expect(fill.status).toBe(200);
    const del = await request(app).delete(`/api/jobs/${target}`).set('Authorization', `Bearer ${recruiterToken}`);
    expect(del.status).toBe(200);
  });

  dbIt('GET /applications?mine=1 scopes candidates to the recruiter own jobs', async () => {
    // Re-open role A and attach a candidate to it
    await request(app).patch(`/api/jobs/${ownedJobId}/status`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'open' });
    await ensureStudent('std-e2e-cand-y', 'E2E Candidate Y');
    await pool.query(
      `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score)
       VALUES ($1, $2, 'E2E Owned Role A', 'E2E Corp', 'std-e2e-cand-y', 'E2E Candidate Y', CURRENT_DATE, 'Applied', 84)
       ON CONFLICT (id) DO NOTHING`,
      [`app-e2e-mine-${Date.now()}`, ownedJobId]
    );
    const mine = await request(app).get('/api/applications?mine=1').set('Authorization', `Bearer ${recruiterToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.some((a: any) => a.jobId === ownedJobId)).toBe(true);
    const other = await request(app).get('/api/applications?mine=1').set('Authorization', `Bearer ${otherToken}`);
    expect(other.body.some((a: any) => a.jobId === ownedJobId)).toBe(false);
  });

  dbIt('bulk-status: owner shortlists candidates; non-owner and foreign jobs are untouched', async () => {
    // Two candidates on owned role A, one on a foreign job
    const c1 = `app-e2e-bs1-${Date.now()}`;
    const c2 = `app-e2e-bs2-${Date.now()}`;
    const cForeign = `app-e2e-bsf-${Date.now()}`;
    const foreignJobId = `job-e2e-foreign-${Date.now()}`;
    await pool.query(
      `INSERT INTO jobs (id, title, company, location, type, stipend_or_salary, description, required_skills, eligible_branches, posted_by)
       VALUES ($1, 'E2E Foreign Job', 'Elsewhere Corp', 'Mumbai', 'Internship', '₹10k', '', '[]'::jsonb, '[]'::jsonb, 'usr-someone-else')
       ON CONFLICT (id) DO NOTHING`,
      [foreignJobId]
    );
    jobIds.push(foreignJobId);
    await ensureStudent('std-e2e-cand-z', 'E2E Candidate Z');
    for (const [id, jobId] of [[c1, ownedJobId], [c2, ownedJobId], [cForeign, foreignJobId]] as const) {
      await pool.query(
        `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score)
         VALUES ($1, $2, 'E2E Role', 'E2E Corp', 'std-e2e-cand-z', 'E2E Candidate Z', CURRENT_DATE, 'Applied', 70)
         ON CONFLICT (id) DO NOTHING`,
        [id, jobId]
      );
    }

    // Reject the foreign one first so it does not appear in later scoping asserts
    await pool.query(`DELETE FROM applications WHERE id = $1`, [cForeign]);

    const res = await request(app)
      .patch('/api/applications/bulk-status')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ ids: [c1, c2], status: 'Shortlisted' });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);

    const rows = await pool.query(`SELECT id, status FROM applications WHERE id = ANY($1)`, [[c1, c2]]);
    expect(rows.rows.every(r => r.status === 'Shortlisted')).toBe(true);

    // Non-owner cannot move them
    const forbidden = await request(app)
      .patch('/api/applications/bulk-status')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ ids: [c1], status: 'Rejected' });
    expect(forbidden.body.updated).toBe(0);

    // Invalid status rejected
    const bad = await request(app)
      .patch('/api/applications/bulk-status')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ ids: [c1], status: 'Maybe' });
    expect(bad.status).toBe(400);

    await pool.query(`DELETE FROM applications WHERE id = ANY($1)`, [[c1, c2]]);
  });

  dbIt('closed jobs reject new applications with 409', async () => {
    await request(app).patch(`/api/jobs/${ownedJobId}/status`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'closed' });
    const res = await request(app).post('/api/applications').send({
      jobId: ownedJobId, jobTitle: 'E2E Owned Role A', company: 'E2E Corp',
      studentId: 'std-e2e-cand-z', studentName: 'E2E Candidate Z', aiMatchScore: 85,
    });
    expect(res.status).toBe(409);
    expect(String(res.body.error)).toMatch(/no longer accepting/i);
    await request(app).patch(`/api/jobs/${ownedJobId}/status`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'open' });
  });
});

// ── ANALYTICS (REAL SQL AGGREGATES) ─────────────────────────────────────────
describe('GET /api/analytics (live aggregates, no mock data)', () => {
  dbIt('computes department/region/skill stats from the live tables', async () => {
    const res = await request(app).get('/api/analytics');
    expect(res.status).toBe(200);

    const studentsTotal = await pool.query('SELECT count(*)::int AS n FROM students');
    const sumDepts = res.body.collegeDepartmentStats.reduce((s: number, d: any) => s + d.totalStudents, 0);
    expect(sumDepts).toBe(studentsTotal.rows[0].n);
    expect(res.body.collegeDepartmentStats.length).toBeGreaterThan(0);
    for (const d of res.body.collegeDepartmentStats) {
      expect(d.department).toBeTruthy();
      expect(typeof d.placementPercentage).toBe('number');
      expect(d.topSkillGap).toBeTruthy();
    }

    const sumRegions = res.body.govtRegionalStats.reduce((s: number, r: any) => s + r.totalStudents, 0);
    expect(sumRegions).toBe(studentsTotal.rows[0].n);
    for (const r of res.body.govtRegionalStats) {
      expect(r.tierDistribution.tier1 + r.tierDistribution.tier2 + r.tierDistribution.tier3).toBe(r.totalStudents);
    }

    expect(Array.isArray(res.body.emergingSkillTrends)).toBe(true);
    for (const t of res.body.emergingSkillTrends) {
      expect(typeof t.industryDemandGrowth).toBe('number');
      expect(typeof t.academicSupplyCount).toBe('number');
      expect(t.gapIndex).toBeGreaterThanOrEqual(0);
      expect(t.gapIndex).toBeLessThanOrEqual(99);
    }
  });
});

// ── AUTH RATE LIMITING ──────────────────────────────────────────────────────
describe('Auth rate limiting (brute-force guard)', () => {
  dbIt('locks out an IP+email after repeated failed logins (429)', async () => {
    const email = `e2e-ratelimit-${Date.now()}@spark.test`;
    let saw429 = false;
    for (let i = 0; i < 12; i++) {
      const res = await request(app).post('/api/login').send({ email, password: 'WrongPassword!1' });
      if (res.status === 429) {
        saw429 = true;
        expect(String(res.body.error)).toMatch(/too many login attempts/i);
        break;
      }
      expect(res.status).toBe(401);
    }
    expect(saw429).toBe(true);
  });
});

// ── PRODUCTION HARDENING & PRODUCT EXPANSION (Batch 5) ───────────────────
describe('Refresh tokens, revocation, offers, windows, collaborators, calendar', () => {
  let recruiterToken = '';
  let otherToken = '';
  let ownedJobId = '';
  const jobIds: string[] = [];
  const appIds: string[] = [];
  let studentToken = '';
  let studentUserId = '';
  let studentId = '';

  beforeAll(async () => {
    if (!dbAvailable) return;
    // Verification-matrix suite burned auth buckets (OTP+logins from one IP);
    // clear them so these login/refresh flows are not 429'd.
    const { __resetAuthRateBucketsForTests } = await import('./index');
    const { __resetRateLimitsForTests } = await import('./rateLimit');
    __resetAuthRateBucketsForTests();
    __resetRateLimitsForTests();
    const { hashPassword } = await import('./auth');
    const stamp = Date.now();
    for (const [suffix, name] of [[`own-${stamp}`, 'E2E Batch5 Own'], [`other-${stamp}`, 'E2E Batch5 Other']] as const) {
      const email = `e2e-rec-${suffix}@corp.test`;
      const hash = await hashPassword('Recruiter!2026');
      await pool.query(
        `INSERT INTO users (id, name, email, role, password_hash)
         VALUES ($1, $2, $3, 'industry', $4) ON CONFLICT (email) DO UPDATE SET password_hash = $4`,
        [`usr-e2e-rec-${suffix}`, name, email, hash]
      );
      const res = await request(app).post('/api/login').send({ email, password: 'Recruiter!2026' });
      if (suffix.startsWith('own')) recruiterToken = res.body.token;
      else otherToken = res.body.token;
    }
    const posted = await request(app).post('/api/jobs').set('Authorization', `Bearer ${recruiterToken}`).send({
      title: 'E2E Batch5 Role', company: 'E2E Corp', location: 'Pune', type: 'Internship',
      stipendOrSalary: '₹30,000 / month', openings: 3, description: 'E2E',
      requiredSkills: [{ name: 'React.js', weight: 0.5, minScore: 60 }],
      minCgpa: 6.0, eligibleBranches: ['Computer Science & Engineering'],
    });
    ownedJobId = posted.body.job.id;
    jobIds.push(ownedJobId);

    // Student with linked account + application
    studentUserId = `usr-e2e-b5-${stamp}`;
    studentId = `std-e2e-b5-${stamp}`;
    const hash = await hashPassword('Batch5!2026');
    await pool.query(
      `INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, 'E2E B5 Student', $2, 'student', $3)`,
      [studentUserId, `e2e-b5-${stamp}@spark.test`, hash]
    );
    await pool.query(
      `INSERT INTO students (id, user_id, name, email, college, degree, branch, semester, cgpa, graduation_year, target_role)
       VALUES ($1, $2, 'E2E B5 Student', $3, 'E2E Institute', 'B.Tech', 'Computer Science & Engineering', 7, 8.0, 2026, 'Developer')`,
      [studentId, studentUserId, `e2e-b5-${stamp}@spark.test`]
    );
    const appId = `app-e2e-b5-${stamp}`;
    await pool.query(
      `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score)
       VALUES ($1, $2, 'E2E Batch5 Role', 'E2E Corp', $3, 'E2E B5 Student', CURRENT_DATE, 'Applied', 80)`,
      [appId, ownedJobId, studentId]
    );
    appIds.push(appId);
    const slogin = await request(app).post('/api/login').send({ email: `e2e-b5-${stamp}@spark.test`, password: 'Batch5!2026' });
    studentToken = slogin.body.token;
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    await pool.query(`DELETE FROM interview_slots WHERE job_id = ANY($1)`, [jobIds]).catch(() => {});
    await pool.query(`DELETE FROM interview_windows WHERE job_id = ANY($1)`, [jobIds]).catch(() => {});
    await pool.query(`DELETE FROM offers WHERE application_id = ANY($1)`, [appIds]).catch(() => {});
    await pool.query(`DELETE FROM applications WHERE id = ANY($1)`, [appIds]).catch(() => {});
    for (const id of jobIds) {
      await pool.query(`DELETE FROM job_collaborators WHERE job_id = $1`, [id]).catch(() => {});
      await pool.query(`DELETE FROM jobs WHERE id = $1`, [id]).catch(() => {});
    }
    await pool.query(`DELETE FROM students WHERE id = $1`, [studentId]).catch(() => {});
    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [studentUserId, studentUserId]).catch(() => {});
    await pool.query(`DELETE FROM users WHERE email LIKE 'e2e-rec-own-%@corp.test' OR email LIKE 'e2e-rec-other-%@corp.test'`).catch(() => {});
  });

  dbIt('refresh token rotation issues a new access token for the same user', async () => {
    const login = await request(app).post('/api/login').send({ email: 'e2e-b5-x@spark.test', password: 'x' });
    expect(login.status).toBe(401); // sanity: wrong creds rejected

    const good = await request(app).post('/api/login').send({ email: 'e2e-rec-own-x@corp.test', password: 'x' });
    expect(good.status).toBe(401);

    // Real rotation: login the student and refresh
    const stamp = Date.now();
    const email = `e2e-refresh-${stamp}@spark.test`;
    const { hashPassword } = await import('./auth');
    const hash = await hashPassword('Refresh!2026');
    await pool.query(`INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, 'E2E Refresh', $2, 'student', $3)`,
      [`usr-e2e-refresh-${stamp}`, email, hash]);
    try {
      const l = await request(app).post('/api/login').send({ email, password: 'Refresh!2026' });
      expect(l.status).toBe(200);
      expect(l.body.refreshToken).toBeTruthy();
      const r = await request(app).post('/api/auth/refresh').send({ refreshToken: l.body.refreshToken });
      expect(r.status).toBe(200);
      expect(r.body.token).toBeTruthy();
      expect(r.body.refreshToken).toBeTruthy();
      const me = await request(app).get('/api/me/job-alerts').set('Authorization', `Bearer ${r.body.token}`);
      expect(me.status).toBe(200);
    } finally {
      await pool.query(`DELETE FROM users WHERE id = $1`, [`usr-e2e-refresh-${stamp}`]).catch(() => {});
    }
  });

  dbIt('logout bumps token_version so the old JWT is revoked (401 after logout)', async () => {
    const stamp = Date.now();
    const email = `e2e-revoke-${stamp}@spark.test`;
    const { hashPassword } = await import('./auth');
    const hash = await hashPassword('Revoke!2026');
    await pool.query(`INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, 'E2E Revoke', $2, 'student', $3)`,
      [`usr-e2e-revoke-${stamp}`, email, hash]);
    try {
      const l = await request(app).post('/api/login').send({ email, password: 'Revoke!2026' });
      const token = l.body.token;
      const before = await request(app).get('/api/me/job-alerts').set('Authorization', `Bearer ${token}`);
      expect(before.status).toBe(200);

      const out = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
      expect(out.status).toBe(200);

      const after = await request(app).get('/api/me/job-alerts').set('Authorization', `Bearer ${token}`);
      expect(after.status).toBe(401);
    } finally {
      await pool.query(`DELETE FROM users WHERE id = $1`, [`usr-e2e-revoke-${stamp}`]).catch(() => {});
    }
  });

  dbIt('offer lifecycle: extend → student sees it → accept → application updated', async () => {
    const appId = appIds[0];
    const extend = await request(app).post(`/api/applications/${appId}/offer`).set('Authorization', `Bearer ${recruiterToken}`)
      .send({ salaryText: '₹8 LPA', deadlineDays: 7 });
    expect(extend.status).toBe(201);
    expect(extend.body.deadline).toBeTruthy();

    const dup = await request(app).post(`/api/applications/${appId}/offer`).set('Authorization', `Bearer ${recruiterToken}`).send({});
    expect(dup.status).toBe(409);

    const forbidden = await request(app).post(`/api/applications/${appId}/offer`).set('Authorization', `Bearer ${otherToken}`).send({});
    expect(forbidden.status).toBe(403);

    const mine = await request(app).get('/api/me/offers').set('Authorization', `Bearer ${studentToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.offers.length).toBe(1);
    expect(mine.body.offers[0].status).toBe('pending');
    expect(mine.body.offers[0].salaryText).toBe('₹8 LPA');

    const bad = await request(app).post(`/api/offers/${mine.body.offers[0].id}/respond`).set('Authorization', `Bearer ${studentToken}`).send({ decision: 'maybe' });
    expect(bad.status).toBe(400);

    const accept = await request(app).post(`/api/offers/${mine.body.offers[0].id}/respond`).set('Authorization', `Bearer ${studentToken}`).send({ decision: 'accepted' });
    expect(accept.status).toBe(200);

    const again = await request(app).post(`/api/offers/${mine.body.offers[0].id}/respond`).set('Authorization', `Bearer ${studentToken}`).send({ decision: 'declined' });
    expect(again.status).toBe(409);

    const appRow = await pool.query('SELECT status FROM applications WHERE id = $1', [appId]);
    expect(appRow.rows[0].status).toBe('Offer Accepted');
  });

  dbIt('self-scheduling: window create → capacity enforcement → booking creates slot', async () => {
    const start = new Date(Date.now() + 3 * 86_400_000);
    const end = new Date(start.getTime() + 2 * 3_600_000);
    const create = await request(app).post(`/api/jobs/${ownedJobId}/windows`).set('Authorization', `Bearer ${recruiterToken}`)
      .send({ startAt: start.toISOString(), endAt: end.toISOString(), slotMinutes: 30, capacity: 1 });
    expect(create.status).toBe(201);
    const windowId = create.body.windowId;

    const list = await request(app).get(`/api/jobs/${ownedJobId}/windows`);
    expect(list.status).toBe(200);
    expect(list.body.windows.some((w: any) => w.id === windowId)).toBe(true);

    const book1 = await request(app).post(`/api/windows/${windowId}/book`).set('Authorization', `Bearer ${studentToken}`);
    expect(book1.status).toBe(201);
    expect(book1.body.scheduledAt).toBeTruthy();

    // Second booking attempt by a fresh student would exceed capacity=1 —
    // same student double-booking is caught first.
    const dup = await request(app).post(`/api/windows/${windowId}/book`).set('Authorization', `Bearer ${studentToken}`);
    expect(dup.status).toBe(409);

    // Non-applicant student cannot book
    const stamp = Date.now();
    const { hashPassword } = await import('./auth');
    const hash = await hashPassword('NoApp!2026');
    await pool.query(`INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, 'E2E NoApp', $2, 'student', $3)`,
      [`usr-e2e-noapp-${stamp}`, `e2e-noapp-${stamp}@spark.test`, hash]);
    try {
      const l = await request(app).post('/api/login').send({ email: `e2e-noapp-${stamp}@spark.test`, password: 'NoApp!2026' });
      const noApp = await request(app).post(`/api/windows/${windowId}/book`).set('Authorization', `Bearer ${l.body.token}`);
      expect(noApp.status).toBe(409);
    } finally {
      await pool.query(`DELETE FROM users WHERE id = $1`, [`usr-e2e-noapp-${stamp}`]).catch(() => {});
    }
  });

  dbIt('collaborators: owner adds teammate, teammate gains schedule access', async () => {
    // Find the "other" recruiter email from the fixtures created in beforeAll
    const otherUser = await pool.query(`SELECT id, email FROM users WHERE name = 'E2E Batch5 Other' LIMIT 1`);
    expect(otherUser.rows.length).toBe(1);

    // While NOT a collaborator, the other recruiter cannot manage the job
    const before = await request(app).patch(`/api/jobs/${ownedJobId}`).set('Authorization', `Bearer ${otherToken}`).send({ description: 'Should fail' });
    expect(before.status).toBe(403);

    const add = await request(app).post(`/api/jobs/${ownedJobId}/collaborators`).set('Authorization', `Bearer ${recruiterToken}`)
      .send({ email: otherUser.rows[0].email });
    expect(add.status).toBe(200);

    // Now a collaborator, they can manage the job
    const edit = await request(app).patch(`/api/jobs/${ownedJobId}`).set('Authorization', `Bearer ${otherToken}`).send({ description: 'Updated by collaborator' });
    expect(edit.status).toBe(200);
  });

  dbIt('calendar feed: token works unauthenticated, contains booked slots, rotates to revoke', async () => {
    const tok1 = await request(app).get('/api/me/calendar-token').set('Authorization', `Bearer ${studentToken}`);
    expect(tok1.status).toBe(200);
    expect(tok1.body.url).toMatch(/^\/api\/calendar\/[0-9a-f]+\.ics$/);

    const feed1 = await request(app).get(tok1.body.url);
    expect(feed1.status).toBe(200);
    expect(feed1.text).toContain('BEGIN:VCALENDAR');
    expect(feed1.text).toContain('X-WR-CALNAME:S.P.A.R.K. Interviews');

    const rot = await request(app).post('/api/me/calendar-token/rotate').set('Authorization', `Bearer ${studentToken}`);
    expect(rot.status).toBe(200);
    expect(rot.body.url).not.toBe(tok1.body.url);

    const old = await request(app).get(tok1.body.url);
    expect(old.status).toBe(404);
  });

  dbIt('talent invite: persists a real notification for the student', async () => {
    const invite = await request(app).post('/api/talent/invite').set('Authorization', `Bearer ${recruiterToken}`)
      .send({ studentId, message: 'Impressive portfolio!' });
    expect(invite.status).toBe(200);
    expect(invite.body.studentName).toBe('E2E B5 Student');

    const notif = await pool.query(`SELECT title FROM notifications WHERE user_id = $1 AND title = 'Direct Interview Invitation'`, [studentUserId]);
    expect(notif.rows.length).toBe(1);
    await pool.query(`DELETE FROM notifications WHERE user_id = $1 AND title = 'Direct Interview Invitation'`, [studentUserId]);

    const unauth = await request(app).post('/api/talent/invite').send({ studentId });
    expect(unauth.status).toBe(401);
  });

  dbIt('NIRF export: CSV with real student rows', async () => {
    const res = await request(app).get('/api/college/nirf-export').set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Name,Email,College,Branch');
    expect(res.text).toContain('E2E B5 Student');
  });

  dbIt('signed resume URL: valid HMAC serves file, tampered sig is 403', async () => {
    // Upload a resume for the student first
    const up = await request(app).post(`/api/students/${studentId}/upload-resume`)
      .attach('resume', Buffer.from('%PDF-1.4 test resume content'), { filename: 'test-resume.pdf', contentType: 'application/pdf' });
    expect([200, 201]).toContain(up.status);

    const urlRes = await request(app).get(`/api/students/${studentId}/resume-url`).set('Authorization', `Bearer ${recruiterToken}`);
    expect(urlRes.status).toBe(200);
    expect(urlRes.body.url).toContain('sig=');

    const dl = await request(app).get(urlRes.body.url);
    expect(dl.status).toBe(200);

    const tampered = await request(app).get(urlRes.body.url.replace(/sig=.{8}/, 'sig=deadbeef'));
    expect(tampered.status).toBe(403);
  });

  dbIt('/metrics exposes counters; every response carries an X-Request-Id', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body.requestsTotal).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('uptimeSeconds');
  });
});

// ── JOB-ALERTS PREFERENCE TOGGLE ─────────────────────────────────────────────
describe('Job-alerts preference (GET/PATCH /me/job-alerts)', () => {
  let token = '';
  let email = '';

  beforeAll(async () => {
    if (!dbAvailable) return;
    email = `e2e-alerts-${Date.now()}@spark.test`;
    const { hashPassword } = await import('./auth');
    const hash = await hashPassword('Alerts!2026');
    await pool.query(
      `INSERT INTO users (id, name, email, role, password_hash)
       VALUES ($1, 'E2E Alerts User', $2, 'student', $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      [`usr-e2e-alerts-${Date.now()}`, email, hash]
    );
    const res = await request(app).post('/api/login').send({ email, password: 'Alerts!2026' });
    token = res.body.token;
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    await pool.query(`DELETE FROM users WHERE email = $1`, [email]).catch(() => {});
  });

  dbIt('defaults to enabled and flips on demand (401 without auth)', async () => {
    const unauth = await request(app).get('/api/me/job-alerts');
    expect(unauth.status).toBe(401);

    const initial = await request(app).get('/api/me/job-alerts').set('Authorization', `Bearer ${token}`);
    expect(initial.status).toBe(200);
    expect(initial.body.jobAlertsEnabled).toBe(true);

    const off = await request(app).patch('/api/me/job-alerts').set('Authorization', `Bearer ${token}`).send({ enabled: false });
    expect(off.status).toBe(200);
    expect(off.body.jobAlertsEnabled).toBe(false);

    const confirm = await request(app).get('/api/me/job-alerts').set('Authorization', `Bearer ${token}`);
    expect(confirm.body.jobAlertsEnabled).toBe(false);

    // Invalid payload
    const bad = await request(app).patch('/api/me/job-alerts').set('Authorization', `Bearer ${token}`).send({ enabled: 'yes' });
    expect(bad.status).toBe(400);

    await request(app).patch('/api/me/job-alerts').set('Authorization', `Bearer ${token}`).send({ enabled: true });
  });
});

// ── INTERVIEW SLOT SCHEDULING ───────────────────────────────────────────────
describe('Interview scheduling (POST /applications/schedule-interviews)', () => {
  let recruiterToken = '';
  let otherToken = '';
  let ownedJobId = '';
  let schedStuUserId = '';
  const jobIds: string[] = [];
  const appIds: string[] = [];

  beforeAll(async () => {
    if (!dbAvailable) return;
    const { hashPassword } = await import('./auth');
    const stamp = Date.now();
    for (const [suffix, name] of [[`own-${stamp}`, 'E2E Sched Own'], [`other-${stamp}`, 'E2E Sched Other']] as const) {
      const email = `e2e-rec-${suffix}@corp.test`;
      const hash = await hashPassword('Recruiter!2026');
      await pool.query(
        `INSERT INTO users (id, name, email, role, password_hash)
         VALUES ($1, $2, $3, 'industry', $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = $4`,
        [`usr-e2e-rec-${suffix}`, name, email, hash]
      );
      const res = await request(app).post('/api/login').send({ email, password: 'Recruiter!2026' });
      if (suffix.startsWith('own')) recruiterToken = res.body.token;
      else otherToken = res.body.token;
    }
    const posted = await request(app).post('/api/jobs').set('Authorization', `Bearer ${recruiterToken}`).send({
      title: 'E2E Sched Role', company: 'E2E Corp', location: 'Pune', type: 'Internship',
      stipendOrSalary: '₹30,000 / month', openings: 2, description: 'E2E scheduling role',
      requiredSkills: [{ name: 'React.js', weight: 0.5, minScore: 60 }],
      minCgpa: 6.0, eligibleBranches: ['Computer Science & Engineering'],
    });
    ownedJobId = posted.body.job.id;
    jobIds.push(ownedJobId);

    const foreignJobId = `job-e2e-sched-foreign-${stamp}`;
    await pool.query(
      `INSERT INTO jobs (id, title, company, location, type, stipend_or_salary, description, required_skills, eligible_branches, posted_by)
       VALUES ($1, 'E2E Sched Foreign', 'Elsewhere Corp', 'Mumbai', 'Internship', '₹10k', '', '[]'::jsonb, '[]'::jsonb, 'usr-someone-else')
       ON CONFLICT (id) DO NOTHING`,
      [foreignJobId]
    );
    jobIds.push(foreignJobId);
    // A linked login account so cancel/complete notifications land in users-keyed rows.
    const stuUserId = `usr-e2e-sched-stu-${stamp}`;
    const stuEmail = `e2e-sched-stu-${stamp}@spark.test`;
    schedStuUserId = stuUserId;
    const stuHash = await hashPassword('SchedStu!2026');
    await pool.query(
      `INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, 'E2E Sched Student', $2, 'student', $3)`,
      [stuUserId, stuEmail, stuHash]
    );
    await ensureStudent('std-e2e-cand-s', 'E2E Candidate S');
    await pool.query(
      `INSERT INTO students (id, user_id, name, email, college, degree, branch, semester, cgpa, graduation_year, target_role)
       VALUES ($1, $2, 'E2E Sched Student', $3, 'E2E Institute', 'B.Tech', 'Computer Engineering', 6, 7.9, 2026, 'Software Engineer')`,
      [`std-e2e-sched-stu-${stamp}`, stuUserId, stuEmail]
    );

    for (const [id, jobId] of [
      [`app-e2e-sch1-${stamp}`, ownedJobId],
      [`app-e2e-sch2-${stamp}`, ownedJobId],
      [`app-e2e-schf-${stamp}`, foreignJobId],
    ] as const) {
      await pool.query(
        `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score)
         VALUES ($1, $2, 'E2E Sched Role', 'E2E Corp', $3, 'E2E Sched Student', CURRENT_DATE, 'Applied', 75)
         ON CONFLICT (id) DO NOTHING`,
        [id, jobId, `std-e2e-sched-stu-${stamp}`]
      );
      appIds.push(id);
    }
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    await pool.query(`DELETE FROM interview_slots WHERE application_id = ANY($1)`, [appIds]).catch(() => {});
    await pool.query(`DELETE FROM applications WHERE id = ANY($1)`, [appIds]).catch(() => {});
    for (const id of jobIds) {
      await pool.query(`DELETE FROM applications WHERE job_id = $1`, [id]).catch(() => {});
      await pool.query(`DELETE FROM jobs WHERE id = $1`, [id]).catch(() => {});
    }
    await pool.query(`DELETE FROM users WHERE email LIKE 'e2e-rec-own-%@corp.test' OR email LIKE 'e2e-rec-other-%@corp.test'`).catch(() => {});
  });

  dbIt('401 without auth; 400 on missing ids or past dates', async () => {
    const unauth = await request(app)
      .post('/api/applications/schedule-interviews')
      .send({ ids: [appIds[0]], scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(unauth.status).toBe(401);

    const auth = { Authorization: `Bearer ${recruiterToken}` };
    const noIds = await request(app).post('/api/applications/schedule-interviews').set(auth).send({ scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(noIds.status).toBe(400);
    const past = await request(app).post('/api/applications/schedule-interviews').set(auth).send({ ids: [appIds[0]], scheduledAt: '2020-01-01T10:00:00Z' });
    expect(past.status).toBe(400);
    const badDate = await request(app).post('/api/applications/schedule-interviews').set(auth).send({ ids: [appIds[0]], scheduledAt: 'not-a-date' });
    expect(badDate.status).toBe(400);
  });

  dbIt('owner books real slots: rows inserted, status advanced, stage_history noted', async () => {
    const c1 = appIds[0];
    const c2 = appIds[1];
    const when = new Date(Date.now() + 24 * 3_600_000).toISOString();
    const res = await request(app)
      .post('/api/applications/schedule-interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ ids: [c1, c2], scheduledAt: when, durationMinutes: 60, mode: 'in-person', meetingUrl: 'https://meet.example.com/e2e', notes: 'Bring your portfolio' });
    expect(res.status).toBe(201);
    expect(res.body.scheduled).toBe(2);
    expect(res.body.slots.length).toBe(2);

    const slots = await pool.query(`SELECT * FROM interview_slots WHERE application_id = ANY($1) ORDER BY id`, [[c1, c2]]);
    expect(slots.rows.length).toBe(2);
    expect(slots.rows.every(s => s.status === 'scheduled')).toBe(true);
    expect(slots.rows.every(s => s.duration_minutes === 60)).toBe(true);
    expect(slots.rows.every(s => s.mode === 'in-person')).toBe(true);
    expect(slots.rows.every(s => s.meeting_url === 'https://meet.example.com/e2e')).toBe(true);
    expect(slots.rows.every(s => s.job_id === ownedJobId)).toBe(true);
    expect(new Date(slots.rows[0].scheduled_at).toISOString()).toBe(when);

    const apps = await pool.query(`SELECT id, status, stage_history FROM applications WHERE id = ANY($1)`, [[c1, c2]]);
    expect(apps.rows.every(a => a.status === 'Interview Scheduled')).toBe(true);
    const lastStage = apps.rows[0].stage_history[apps.rows[0].stage_history.length - 1];
    expect(lastStage.stage).toBe('Interview Scheduled');
    expect(String(lastStage.note)).toMatch(/Interview booked/i);
  });

  dbIt('non-owner gets 403; foreign-job applications are never booked', async () => {
    const forbidden = await request(app)
      .post('/api/applications/schedule-interviews')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ ids: [appIds[0]], scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(forbidden.status).toBe(403);

    const foreignOnly = await request(app)
      .post('/api/applications/schedule-interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ ids: [appIds[2]], scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(foreignOnly.status).toBe(403);

    // Mixed selection: only the owned one is booked
    const mixed = await request(app)
      .post('/api/applications/schedule-interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ ids: [appIds[2], appIds[0]], scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(mixed.status).toBe(201);
    expect(mixed.body.scheduled).toBe(1);
    const foreignSlots = await pool.query(`SELECT count(*)::int AS n FROM interview_slots WHERE application_id = $1`, [appIds[2]]);
    expect(foreignSlots.rows[0].n).toBe(0);
  });

  dbIt('GET /jobs/:jobId/interview-slots is owner-only and lists booked slots', async () => {
    const otherView = await request(app).get(`/api/jobs/${ownedJobId}/interview-slots`).set('Authorization', `Bearer ${otherToken}`);
    expect(otherView.status).toBe(403);

    const mine = await request(app).get(`/api/jobs/${ownedJobId}/interview-slots`).set('Authorization', `Bearer ${recruiterToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.slots.length).toBe(3); // 2 from the first booking + 1 from the mixed one
    expect(mine.body.slots.every((s: any) => s.jobId === ownedJobId)).toBe(true);
    expect(mine.body.slots[0]).toHaveProperty('scheduledAt');
  });

  dbIt('PATCH /interview-slots/:slotId: owner completes/cancels; non-owner 404; bad status 400', async () => {
    const slotRes = await pool.query(`SELECT id FROM interview_slots WHERE job_id = $1 LIMIT 1`, [ownedJobId]);
    const slotId = slotRes.rows[0].id;

    const bad = await request(app).patch(`/api/interview-slots/${slotId}`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'postponed' });
    expect(bad.status).toBe(400);

    const notMine = await request(app).patch(`/api/interview-slots/${slotId}`).set('Authorization', `Bearer ${otherToken}`).send({ status: 'completed' });
    expect(notMine.status).toBe(404);

    const ok = await request(app).patch(`/api/interview-slots/${slotId}`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'completed' });
    expect(ok.status).toBe(200);
    const row = await pool.query(`SELECT status FROM interview_slots WHERE id = $1`, [slotId]);
    expect(row.rows[0].status).toBe('completed');
  });

  dbIt('GET /recruiter/interview-slots: owner sees all slots with counts; non-owner sees none; cancel notifies the student', async () => {
    const otherView = await request(app).get('/api/recruiter/interview-slots').set('Authorization', `Bearer ${otherToken}`);
    expect(otherView.status).toBe(200);
    expect(otherView.body.slots.length).toBe(0); // data-only candidates never notified

    const mine = await request(app).get('/api/recruiter/interview-slots').set('Authorization', `Bearer ${recruiterToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.slots.length).toBe(3); // 2 from the first booking + 1 from the mixed one
    expect(mine.body.counts.scheduled + mine.body.counts.completed + mine.body.counts.cancelled).toBe(3);
    expect(mine.body.slots.every((s: any) => s.jobTitle === 'E2E Sched Role')).toBe(true);
    expect(mine.body.slots[0]).toHaveProperty('applicationStatus');

    // Cancel one scheduled slot → student notified in real time
    const scheduled = mine.body.slots.find((s: any) => s.status === 'scheduled');
    expect(scheduled).toBeTruthy();
    const cancel = await request(app).patch(`/api/interview-slots/${scheduled.id}`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'cancelled' });
    expect(cancel.status).toBe(200);
    // Notification goes to the student's linked login account (users.id).
    const notif = await pool.query(`SELECT title, message FROM notifications WHERE user_id = $1 AND title = 'Interview Cancelled' ORDER BY created_at DESC LIMIT 1`, [schedStuUserId]);
    expect(notif.rows.length).toBe(1);
    expect(String(notif.rows[0].message)).toMatch(/cancelled by the recruiter/i);
    await pool.query(`DELETE FROM notifications WHERE user_id = $1 AND title = 'Interview Cancelled'`, [schedStuUserId]);
  });

  dbIt('GET /me/interview-slots: student sees only their own booked slots with full details', async () => {
    // A student with a linked login account, their application, and a real booking.
    const stamp = Date.now();
    const email = `e2e-slotviewer-${stamp}@spark.test`;
    const userId = `usr-e2e-slotviewer-${stamp}`;
    const studentId = `std-e2e-slotviewer-${stamp}`;
    const appId = `app-e2e-slotview-${stamp}`;
    const { hashPassword } = await import('./auth');
    const hash = await hashPassword('SlotView!2026');
    await pool.query(
      `INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, 'E2E Slot Viewer', $2, 'student', $3)`,
      [userId, email, hash]
    );
    await pool.query(
      `INSERT INTO students (id, user_id, name, email, college, degree, branch, semester, cgpa, graduation_year, target_role)
       VALUES ($1, $2, 'E2E Slot Viewer', $3, 'E2E Institute', 'B.Tech', 'Computer Science & Engineering', 7, 8.1, 2026, 'Backend Developer')`,
      [studentId, userId, email]
    );
    await pool.query(
      `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score)
       VALUES ($1, $2, 'E2E Sched Role', 'E2E Corp', $3, 'E2E Slot Viewer', CURRENT_DATE, 'Applied', 81)`,
      [appId, ownedJobId, studentId]
    );

    try {
      const when = new Date(Date.now() + 48 * 3_600_000).toISOString();
      const book = await request(app)
        .post('/api/applications/schedule-interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ ids: [appId], scheduledAt: when, mode: 'online', meetingUrl: 'https://meet.example.com/slotview' });
      expect(book.status).toBe(201);

      const unauth = await request(app).get('/api/me/interview-slots');
      expect(unauth.status).toBe(401);

      const login = await request(app).post('/api/login').send({ email, password: 'SlotView!2026' });
      expect(login.status).toBe(200);
      const studentToken = login.body.token;

      const mine = await request(app).get('/api/me/interview-slots').set('Authorization', `Bearer ${studentToken}`);
      expect(mine.status).toBe(200);
      expect(mine.body.slots.length).toBe(1);
      const slot = mine.body.slots[0];
      expect(slot.jobTitle).toBe('E2E Sched Role');
      expect(slot.company).toBe('E2E Corp');
      expect(slot.mode).toBe('online');
      expect(slot.meetingUrl).toBe('https://meet.example.com/slotview');
      expect(slot.status).toBe('scheduled');
      expect(slot.applicationId).toBe(appId);
      expect(new Date(slot.scheduledAt).toISOString()).toBe(when);

      // Add-to-Calendar: the slot's student can download the .ics invite
      const ics = await request(app).get(`/api/interview-slots/${slot.id}/ics`).set('Authorization', `Bearer ${studentToken}`);
      expect(ics.status).toBe(200);
      expect(ics.headers['content-type']).toMatch(/text\/calendar/);
      expect(ics.text).toContain('BEGIN:VCALENDAR');
      expect(ics.text).toContain('SUMMARY:Interview — E2E Sched Role @ E2E Corp');
      expect(ics.text).toContain('UID:');
      // A different student account sees none of them
      const otherStamp = Date.now() + 1;
      const otherEmail = `e2e-slotviewer-${otherStamp}@spark.test`;
      const otherHash = await hashPassword('SlotView!2026');
      await pool.query(
        `INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, 'E2E Slot Other', $2, 'student', $3)`,
        [`usr-e2e-slotother-${otherStamp}`, otherEmail, otherHash]
      );
      try {
        const otherLogin = await request(app).post('/api/login').send({ email: otherEmail, password: 'SlotView!2026' });
        const otherSlots = await request(app).get('/api/me/interview-slots').set('Authorization', `Bearer ${otherLogin.body.token}`);
        expect(otherSlots.body.slots.length).toBe(0);

        // A stranger cannot download someone else's invite
        const strangerIcs = await request(app).get(`/api/interview-slots/${slot.id}/ics`).set('Authorization', `Bearer ${otherLogin.body.token}`);
        expect(strangerIcs.status).toBe(403);
      } finally {
        await pool.query(`DELETE FROM users WHERE id = $1`, [`usr-e2e-slotother-${otherStamp}`]).catch(() => {});
      }
    } finally {
      // application delete cascades interview_slots
      await pool.query(`DELETE FROM applications WHERE id = $1`, [appId]).catch(() => {});
      await pool.query(`DELETE FROM students WHERE id = $1`, [studentId]).catch(() => {});
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => {});
    }
  });
});

// ── RECRUITER FUNNEL ANALYTICS ──────────────────────────────────────────────
describe('Recruiter funnel (GET /recruiter/funnel)', () => {
  let recruiterToken = '';
  let otherToken = '';
  const jobIds: string[] = [];

  beforeAll(async () => {
    if (!dbAvailable) return;
    const { hashPassword } = await import('./auth');
    const stamp = Date.now();
    for (const [suffix, name] of [[`own-${stamp}`, 'E2E Funnel Own'], [`other-${stamp}`, 'E2E Funnel Other']] as const) {
      const email = `e2e-rec-${suffix}@corp.test`;
      const hash = await hashPassword('Recruiter!2026');
      await pool.query(
        `INSERT INTO users (id, name, email, role, password_hash)
         VALUES ($1, $2, $3, 'industry', $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = $4`,
        [`usr-e2e-rec-${suffix}`, name, email, hash]
      );
      const res = await request(app).post('/api/login').send({ email, password: 'Recruiter!2026' });
      if (suffix.startsWith('own')) recruiterToken = res.body.token;
      else otherToken = res.body.token;
    }
    for (const title of ['E2E Funnel Role A', 'E2E Funnel Role B']) {
      const res = await request(app).post('/api/jobs').set('Authorization', `Bearer ${recruiterToken}`).send({
        title, company: 'E2E Corp', location: 'Pune', type: 'Internship',
        stipendOrSalary: '₹30,000 / month', openings: 5, description: 'E2E funnel role',
        requiredSkills: [{ name: 'React.js', weight: 0.5, minScore: 60 }],
        minCgpa: 6.0, eligibleBranches: ['Computer Science & Engineering'],
      });
      jobIds.push(res.body.job.id);
    }

    // Role A: 6 applicants across the whole funnel; Role B: 1 interviewed
    await ensureStudent('std-e2e-cand-f', 'E2E Candidate F');
    const rows: [string, string, string][] = [
      [`app-e2e-fn1-${stamp}`, jobIds[0], 'Applied'],
      [`app-e2e-fn2-${stamp}`, jobIds[0], 'Applied'],
      [`app-e2e-fn3-${stamp}`, jobIds[0], 'Shortlisted'],
      [`app-e2e-fn4-${stamp}`, jobIds[0], 'Interview Scheduled'],
      [`app-e2e-fn5-${stamp}`, jobIds[0], 'Offer Extended'],
      [`app-e2e-fn6-${stamp}`, jobIds[0], 'Rejected'],
      [`app-e2e-fn7-${stamp}`, jobIds[1], 'Interview Scheduled'],
    ];
    for (const [id, jobId, status] of rows) {
      await pool.query(
        `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score)
         VALUES ($1, $2, 'E2E Funnel Role', 'E2E Corp', 'std-e2e-cand-f', 'E2E Candidate F', CURRENT_DATE, $3, 80)
         ON CONFLICT (id) DO NOTHING`,
        [id, jobId, status]
      );
    }
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    for (const id of jobIds) {
      await pool.query(`DELETE FROM interview_slots WHERE job_id = $1`, [id]).catch(() => {});
      await pool.query(`DELETE FROM applications WHERE job_id = $1`, [id]).catch(() => {});
      await pool.query(`DELETE FROM jobs WHERE id = $1`, [id]).catch(() => {});
    }
    await pool.query(`DELETE FROM users WHERE email LIKE 'e2e-rec-own-%@corp.test' OR email LIKE 'e2e-rec-other-%@corp.test'`).catch(() => {});
  });

  dbIt('401 without auth', async () => {
    const res = await request(app).get('/api/recruiter/funnel');
    expect(res.status).toBe(401);
  });

  dbIt('returns per-posting funnel counts and weekly trend for the owner only', async () => {
    const mine = await request(app).get('/api/recruiter/funnel').set('Authorization', `Bearer ${recruiterToken}`);
    expect(mine.status).toBe(200);
    const a = mine.body.postings.find((p: any) => p.jobId === jobIds[0]);
    const b = mine.body.postings.find((p: any) => p.jobId === jobIds[1]);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();

    expect(a.applied).toBe(6);
    expect(a.shortlisted).toBe(3); // Shortlisted + Interview Scheduled + Offer Extended
    expect(a.interviewed).toBe(2); // Interview Scheduled + Offer Extended
    expect(a.offers).toBe(1);
    expect(a.rejected).toBe(1);
    expect(a.conversionPct).toBe(16.7); // 1/6 rounded to 1dp

    expect(b.applied).toBe(1);
    expect(b.interviewed).toBe(1);
    expect(b.offers).toBe(0);
    expect(b.conversionPct).toBe(0);

    const trendTotal = mine.body.weeklyTrend.reduce((sum: number, w: any) => sum + w.applications, 0);
    expect(trendTotal).toBe(7);
    expect(mine.body.weeklyTrend.every((w: any) => /^\d{4}-\d{2}-\d{2}$/.test(w.week))).toBe(true);

    // Drill-down: each posting carries its own weekly trend, summing to its totals
    expect(Array.isArray(a.weeklyTrend)).toBe(true);
    expect(a.weeklyTrend.reduce((s: number, w: any) => s + w.applications, 0)).toBe(6);
    expect(b.weeklyTrend.reduce((s: number, w: any) => s + w.applications, 0)).toBe(1);

    // The other recruiter's funnel must not include these postings
    const theirs = await request(app).get('/api/recruiter/funnel').set('Authorization', `Bearer ${otherToken}`);
    expect(theirs.body.postings.some((p: any) => jobIds.includes(p.jobId))).toBe(false);
  });
});
