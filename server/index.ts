import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { router } from './routes';
import { initDatabase, pool } from './db';
import { seedDatabase } from './seed';
import { generateLargeSeed } from './seedGenerator';
import { seedAlumniNetwork } from './alumniSeed';
import { seedAlumniActivity } from './alumniActivitySeed';
import { startJobSyncScheduler } from './jobSync';
import { startJobAlertScheduler } from './jobAlerts';
import { startInterviewReminderScheduler } from './jobAlerts';
import { startOutboxWorker } from './emailOutbox';
import { startHeartbeat, connectedClients } from './events';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config();

export const app = express();
// Guard against PORT=0 in .env (binds to a random ephemeral port — health
// checks and the Vite proxy both expect a real, fixed port).
const PORT = (() => {
  const p = parseInt(process.env.PORT || '5000', 10);
  return Number.isFinite(p) && p > 0 ? p : 5000;
})();
const NODE_ENV = process.env.NODE_ENV || 'development';

// Behind nginx/Render/Heroku etc., trust the first proxy so req.ip reflects
// the real client — otherwise the in-memory rate limiter buckets everyone
// under the proxy IP.
app.set('trust proxy', 1);

// ── CORS: locked down in production via comma-separated allowed origins ──────
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin/no-origin requests (curl, health checks, same-host frontend)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

// ── Security headers (helmet-equivalent, dependency-free) ────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Basic CSP: API responses shouldn't embed remote content; frontend is served
    // by static hosting/CDN with its own headers.
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
  }
  next();
});

// ── Body limits & logging (silenced under test) ─────────────────────────────
app.use(express.json({ limit: '10mb' }));

// Request-ID + counters: every log line can be traced, and /metrics exposes
// liveness/traffic data for uptime monitors without external deps.
const metrics = { requests: 0, errors: 0, startedAt: Date.now() };
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  metrics.requests += 1;
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 500) metrics.errors += 1;
    return originalJson(body);
  };
  next();
});

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Simple in-memory rate limiter for auth endpoints (OTP abuse protection) ──
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 20; // 20 requests per window per IP per endpoint group

// Test-only reset so an isolated suite run (many OTP/login calls from one IP)
// can clear the bucket between describes without weakening production limits.
export function __resetAuthRateBucketsForTests() {
  rateBuckets.clear();
}

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = `${req.ip}-${req.baseUrl || req.path}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many requests. Please wait before trying again.',
      retryAfterMinutes: Math.ceil((bucket.resetAt - now) / 60000),
    });
  }
  next();
}

// Apply rate limiting specifically to OTP/auth endpoints
app.use('/api/auth', rateLimit);

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api', router);

// Root greeting (before static/SPA so it always wins for browsers hitting "/")
app.get('/', (req, res) => {
  res.json({
    name: 'S.P.A.R.K. — Smart Platform for Academia–Industry Readiness and Knowledge Backend',
    version: '1.2.0',
    environment: NODE_ENV,
    database: 'PostgreSQL',
    status: 'online',
    endpoints: [
      '/api/health',
      '/api/events',
      '/api/login',
      '/api/verify/institution',
      '/api/jobs',
      '/api/students',
      '/api/assessments',
      '/api/applications',
      '/api/mous',
      '/api/problems',
      '/api/notifications',
      '/api/verification-queue',
      '/api/copilot'
    ]
  });
});

// ── Production static serving: the Express host serves the built frontend ────
// ESM-safe dirname: __dirname is undefined under tsx/ESM, so derive the server
// directory from the entry script path (works under tsx, ts-node, and CJS).
const serverDir = process.argv[1] ? path.dirname(process.argv[1]) : process.cwd();
const distDir = path.resolve(serverDir, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      // HTML never cached so new deploys are picked up instantly
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));
  // SPA fallback — regex (not '*') so Express 5's path-to-regexp accepts it,
  // and /api/* always falls through to the 404 JSON handler below.
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// ── Metrics for uptime monitoring (no external deps) ───────────────────────
app.get('/api/metrics', (req, res) => {
  const uptimeS = Math.floor((Date.now() - metrics.startedAt) / 1000);
  res.json({
    status: 'ok',
    uptimeSeconds: uptimeS,
    requestsTotal: metrics.requests,
    errors5xx: metrics.errors,
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / 1048576),
      heapMb: Math.round(process.memoryUsage().heapUsed / 1048576),
    },
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for unknown API routes
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler (keeps stack traces out of production responses)
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
let server: ReturnType<typeof app.listen> | null = null;

function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  if (server) {
    server.close(() => {
      pool.end().finally(() => {
        console.log('HTTP server closed. DB pool drained.');
        process.exit(0);
      });
    });
    // Force-exit if connections don't drain in 10s
    setTimeout(() => {
      console.warn('Forcing exit after drain timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function startServer() {
  try {
    await initDatabase();

    // Demo/sample data is opt-in outside development: production boots with
    // an empty database unless the operator explicitly sets SEED_DEMO=true.
    const seedingAllowed = NODE_ENV !== 'production' || process.env.SEED_DEMO === 'true';
    if (!seedingAllowed) {
      console.log('[seed] Skipped in production (set SEED_DEMO=true to allow demo data).');
    } else {
      await seedDatabase();

      // Optional: bulk realistic dataset (SEED_LARGE_DATASET=true)
      await generateLargeSeed().catch(err =>
        console.warn('⚠️  Large seed skipped:', err.message)
      );

      // Verified alumni mentor network (idempotent — skips when populated)
      await seedAlumniNetwork().catch(err =>
        console.warn('⚠️  Alumni seed skipped:', err.message)
      );

      // Demo mentorship room, chat history & fast-track opportunity (idempotent)
      await seedAlumniActivity().catch(err =>
        console.warn('⚠️  Alumni activity seed skipped:', err.message)
      );
    }

    server = app.listen(PORT, () => {
      console.log(`⚡ S.P.A.R.K. PostgreSQL Backend running on http://localhost:${PORT} [${NODE_ENV}]`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
      if (NODE_ENV === 'production' && allowedOrigins.length === 0) {
        console.warn('⚠️  CORS_ORIGIN not set in production — same-origin requests only.');
      }
    });

    // Optional background auto-sync of live job postings (AUTO_SYNC_CRON=true)
    startJobSyncScheduler();
    startJobAlertScheduler();
    startInterviewReminderScheduler();
    startOutboxWorker();

    // SSE keepalive pings every 30s so proxies keep event streams open
    startHeartbeat();

    console.log(`📡 [sse] Event hub ready — ${connectedClients()} client(s) connected.`);
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

// Auto-start unless running under the test runner (supertest imports the app)
if (process.env.START_SERVER !== 'false') {
  startServer();
}
