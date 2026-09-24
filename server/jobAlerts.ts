import crypto from 'crypto';
import { query, pool } from './db';
import { sendJobAlertEmail } from './emailService';

/**
 * Daily job-alert digest for students.
 *
 * For every student with job_alerts_enabled:
 *   1. take the jobs posted in the last 24h (status = 'open', recruiter-owned
 *      or campus postings — skip external aggregator rows with no salary data)
 *   2. score them with the same calculateJobMatch used by the UI
 *   3. email the ones scoring > 80 with a signed unsubscribe link
 *
 * Cadence: guarded by ALERT_DIGEST_CRON=true (default on in dev for easy
 * testing at a 60s poll window; set to false to disable entirely).
 */

const MATCH_THRESHOLD = 80;
const POLL_INTERVAL_MS = parseInt(process.env.ALERT_DIGEST_INTERVAL_MINUTES || '1440', 10) * 60 * 1000;
const DEV_INTERVAL_MS = 60 * 1000; // 60s when NODE_ENV !== 'production' for quick verification

function unsubscribeSecret(): string {
  return process.env.JWT_SECRET || 'spark-dev-unsubscribe-secret';
}

export function signUnsubscribeToken(email: string): string {
  return crypto
    .createHmac('sha256', unsubscribeSecret())
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

function baseUrl(): string {
  return (process.env.PUBLIC_APP_URL || 'http://localhost:5174').replace(/\/$/, '');
}

interface ScoredJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
}

// Rough JS port of src/utils/matchCalculator.ts so the server can score without
// importing client types. Same weights/semantics: verified skills use their
// score, declared skills count as a baseline 60.
function scoreJobForStudent(job: any, student: any): number {
  const verifiedMap = new Map<string, number>();
  for (const s of student.verified_skills || []) {
    verifiedMap.set(String(s.skill).toLowerCase().trim(), Number(s.score) || 0);
  }
  for (const s of student.declared_skills || []) {
    const key = String(s).toLowerCase().trim();
    if (!verifiedMap.has(key)) verifiedMap.set(key, 60);
  }

  let totalWeight = 0;
  let earned = 0;
  for (const req of job.required_skills || []) {
    const reqKey = String(req.name).toLowerCase().trim();
    let studentScore = 0;
    let found = false;
    for (const [sKey, sScore] of verifiedMap.entries()) {
      if (sKey.includes(reqKey) || reqKey.includes(sKey)) {
        studentScore = sScore;
        found = true;
        break;
      }
    }
    totalWeight += req.weight || 0.25;
    if (found) {
      const min = Number(req.minScore) || 60;
      earned += (Math.min(100, (studentScore / min) * 100) / 100) * (req.weight || 0.25) * 100;
    }
  }
  if (totalWeight === 0) return 0;
  return Math.round(earned / totalWeight);
}

export async function sendJobAlertDigest(): Promise<{ emailed: number; skipped: number }> {
  const recent = await query(
    `SELECT * FROM jobs
     WHERE status = 'open'
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
       AND jsonb_array_length(required_skills) > 0
     ORDER BY created_at ASC`
  );
  if (recent.rows.length === 0) {
    console.log('[jobAlerts] No new postings in the last 24h — digest skipped.');
    return { emailed: 0, skipped: 0 };
  }

  const optedIn = await query(
    `SELECT u.id AS user_id, u.email, u.name,
            s.id AS student_id, s.name AS student_name, s.verified_skills, s.declared_skills
     FROM users u
     JOIN students s ON LOWER(s.email) = LOWER(u.email)
     WHERE u.job_alerts_enabled = TRUE`
  );

  let emailed = 0;
  let skipped = 0;

  for (const student of optedIn.rows) {
    const matches: ScoredJob[] = [];
    for (const job of recent.rows) {
      const score = scoreJobForStudent(job, student);
      if (score > MATCH_THRESHOLD) {
        matches.push({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.stipend_or_salary || 'As per industry',
          matchScore: score,
        });
      }
    }
    if (matches.length === 0) {
      skipped += 1;
      continue;
    }

    const token = signUnsubscribeToken(student.email);
    const unsubscribeUrl = `${baseUrl()}/api/unsubscribe-alerts?email=${encodeURIComponent(student.email)}&token=${token}`;

    const result = await sendJobAlertEmail({
      toEmail: student.email,
      userName: student.student_name || student.name || 'there',
      matches: matches.slice(0, 8),
      unsubscribeUrl,
    });

    if (result.success) {
      emailed += 1;
      await query(
        `INSERT INTO audit_logs (actor, action, details) VALUES ($1, 'JOB_ALERT_DIGEST_SENT', $2)`,
        [student.email, JSON.stringify({ matches: matches.length })]
      ).catch(() => {});
    } else {
      skipped += 1;
    }
  }

  console.log(`📧 [jobAlerts] Digest complete: ${emailed} emailed, ${skipped} skipped (no >80% matches or send failure).`);
  return { emailed, skipped };
}

let digestTimer: NodeJS.Timeout | null = null;

export function startJobAlertScheduler(): void {
  const enabled = process.env.ALERT_DIGEST_CRON !== 'false';
  if (!enabled) {
    console.log('[jobAlerts] Digest scheduler disabled (ALERT_DIGEST_CRON=false).');
    return;
  }
  const interval = process.env.NODE_ENV === 'production' ? POLL_INTERVAL_MS : DEV_INTERVAL_MS;
  const minutes = Math.round(interval / 60000);
  console.log(`[jobAlerts] Scheduler armed — every ${minutes >= 60 ? `${minutes / 60}h` : `${minutes}min`} (${process.env.NODE_ENV === 'production' ? 'production' : 'dev cadence'}).`);

  digestTimer = setInterval(async () => {
    try {
      await sendJobAlertDigest();
    } catch (err: any) {
      console.error('[jobAlerts] Digest run failed:', err?.message);
    }
  }, interval);
  // Don't hold the event loop open on shutdown
  digestTimer.unref();
}

export async function stopJobAlertScheduler(): Promise<void> {
  if (digestTimer) {
    clearInterval(digestTimer);
    digestTimer = null;
  }
  await pool.end().catch(() => {});
}
