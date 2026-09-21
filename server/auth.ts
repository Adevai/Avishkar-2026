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
}

/** Sign a 24h JWT for an authenticated user. */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
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
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  (req as any).user = payload;
  next();
}
