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

    for (const [id, jobId] of [
      [`app-e2e-sch1-${stamp}`, ownedJobId],
      [`app-e2e-sch2-${stamp}`, ownedJobId],
      [`app-e2e-schf-${stamp}`, foreignJobId],
    ] as const) {
      await pool.query(
        `INSERT INTO applications (id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score)
         VALUES ($1, $2, 'E2E Sched Role', 'E2E Corp', 'std-e2e-cand-s', 'E2E Candidate S', CURRENT_DATE, 'Applied', 75)
         ON CONFLICT (id) DO NOTHING`,
        [id, jobId]
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
    expect(otherView.body.slots.length).toBe(0);

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
    const notif = await pool.query(`SELECT title, message FROM notifications WHERE user_id = $1 AND title = 'Interview Cancelled' ORDER BY created_at DESC LIMIT 1`, [scheduled.studentId]);
    expect(notif.rows.length).toBe(1);
    expect(String(notif.rows[0].message)).toMatch(/cancelled by the recruiter/i);
    await pool.query(`DELETE FROM notifications WHERE user_id = $1 AND title = 'Interview Cancelled'`, [scheduled.studentId]);
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
