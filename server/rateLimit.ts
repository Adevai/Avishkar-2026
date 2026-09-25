/**
 * Minimal in-memory sliding-window rate limiter for sensitive endpoints
 * (login, registration OTP, password reset). No external dependency.
 *
 * Keyed by IP plus optional identity (email) so a single attacker cannot
 * spray many accounts, and one account cannot be brute-forced from many IPs
 * without tripping the per-identity limit too.
 */

interface HitRecord {
  timestamps: number[];
  blockedUntil?: number;
}

const WINDOW_MS = 15 * 60_000; // 15 minutes
const MAX_HITS = 10;           // 10 attempts per window
const BLOCK_MS = 10 * 60_000;  // extra lockout after exceeding

const hits = new Map<string, HitRecord>();

// Periodic sweep so the map never grows unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of hits) {
    if (rec.blockedUntil && rec.blockedUntil < now) {
      hits.delete(key);
      continue;
    }
    rec.timestamps = rec.timestamps.filter(t => now - t < WINDOW_MS);
    if (rec.timestamps.length === 0 && !rec.blockedUntil) hits.delete(key);
  }
}, 5 * 60_000).unref();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  remaining: number;
}

export function checkRateLimit(key: string, maxHits = MAX_HITS): RateLimitResult {
  const now = Date.now();
  let rec = hits.get(key);
  if (!rec) {
    rec = { timestamps: [] };
    hits.set(key, rec);
  }
  if (rec.blockedUntil && rec.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((rec.blockedUntil - now) / 1000), remaining: 0 };
  }
  rec.timestamps = rec.timestamps.filter(t => now - t < WINDOW_MS);
  rec.timestamps.push(now);
  if (rec.timestamps.length > maxHits) {
    rec.blockedUntil = now + BLOCK_MS;
    return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000), remaining: 0 };
  }
  return { allowed: true, remaining: Math.max(0, maxHits - rec.timestamps.length) };
}

export function clientIpOf(req: any): string {
  // Express resolves req.ip through `trust proxy` (app.set in index.ts), so
  // behind a real proxy this is the client IP and NOT a spoofable header:
  // with trust proxy enabled Express only trusts the configured hop count.
  const ip = typeof req.ip === 'string' && req.ip ? req.ip : req.socket?.remoteAddress || 'unknown';
  return ip;
}
