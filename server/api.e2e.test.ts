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
