import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Resolve the JWT signing secret.
 *  - production: required — refuse to boot without it (fail-fast, clear error)
 *  - dev/test:   fall back to a random per-boot secret so local logins work
 *                out of the box (sessions reset on restart)
 */
function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is required in production. Generate one with: openssl rand -hex 32'
    );
  }
  console.warn(
    '⚠️  JWT_SECRET not set — using a random per-boot secret (dev only). Sessions reset on restart.'
  );
  return crypto.randomBytes(32).toString('hex');
}

const JWT_SECRET = resolveJwtSecret();

/** Hash a plaintext password with bcrypt (12 rounds). */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/** Constant-time bcrypt comparison. */
export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface JwtPayload {
  sub: string;   // users.id
  email: string;
  role: string;
  name: string;
  ver?: number;  // token_version — must match users.token_version
}

/** Sign a 24h JWT for an authenticated user. */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

/** Sign a short-lived access token (default 30m) embedding the token version. */
export function signAccessToken(payload: JwtPayload, expiresIn = '30m'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/**
 * Sign a long-lived refresh token (default 30d) carrying ONLY the identity.
 * It contains no role/email so it can't be used directly against the API;
 * it is exchanged at /auth/refresh for a fresh access token.
 */
export function signRefreshToken(sub: string, expiresIn = '30d'): string {
  return jwt.sign({ sub, typ: 'refresh' }, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/** Verify a refresh token and return its subject, or null. */
export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded?.typ !== 'refresh' || !decoded?.sub) return null;
    return { sub: decoded.sub };
  } catch {
    return null;
  }
}

/** Verify a JWT and return its payload, or null if invalid/expired. */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Express middleware: require a valid `Authorization: Bearer <jwt>` header.
 * On success, attaches the decoded payload to `req.user`.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  // Server-side revocation: tokens carry the user's token_version; a mismatch
  // (password change / compromise bump) invalidates them instantly.
  try {
    const { query } = await import('./db');
    const r = await query('SELECT token_version FROM users WHERE id = $1', [payload.sub]);
    const current = r.rows[0]?.token_version ?? 0;
    if ((payload.ver ?? 0) !== current) {
      return res.status(401).json({ error: 'Session revoked. Please sign in again.' });
    }
  } catch {
    // DB hiccup: fail open for availability (token signature already verified).
  }

  (req as any).user = payload;
  next();
}


export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await requireAuth(req, res, () => {
    const user = (req as any).user;

    if (user?.role !== 'government' && user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Administrator access required.',
      });
    }

    next();
  });
}
