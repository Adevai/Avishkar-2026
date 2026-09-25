import { pool } from './db';

/**
 * Durable email outbox with retry/backoff.
 *
 * senders enqueue instead of awaiting SMTP inline, so a dead SMTP relay
 * never blocks request handling. A background worker retries with
 * exponential backoff (1m → 2m → 4m → 8m → 16m) and marks rows failed
 * after MAX_ATTEMPTS.
 */

const MAX_ATTEMPTS = 5;

interface OutboxPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  ics?: { filename: string; content: string };
}

let workerTimer: NodeJS.Timeout | null = null;
let processing = false;

export async function enqueueEmail(payload: OutboxPayload): Promise<void> {
  await pool.query(
    `INSERT INTO email_outbox (id, payload, status) VALUES ($1, $2, 'pending')`,
    [`outbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, JSON.stringify(payload)]
  );
}

async function attemptSend(row: any): Promise<void> {
  const payload = row.payload as OutboxPayload;
  const nodemailer = (await import('nodemailer')).default;
  const EMAIL_USER = process.env.EMAIL_USER;
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  const EMAIL_PASS = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  if (!EMAIL_USER || !EMAIL_PASS) throw new Error('SMTP not configured (EMAIL_USER/EMAIL_PASS missing)');

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    requireTLS: true,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: `"S.P.A.R.K." <${EMAIL_USER}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.ics
      ? [{ filename: payload.ics.filename, content: payload.ics.content, contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }]
      : undefined,
  });
}

async function processOutbox(): Promise<{ sent: number; failed: number; pending: number }> {
  if (processing) return { sent: 0, failed: 0, pending: -1 };
  processing = true;
  let sent = 0;
  let failed = 0;
  let pending = 0;
  try {
    const due = await pool.query(
      `SELECT id, payload, attempts FROM email_outbox
        WHERE status = 'pending' AND next_attempt_at <= NOW()
        ORDER BY created_at ASC
        LIMIT 20 FOR UPDATE SKIP LOCKED`
    ).catch(() => ({ rows: [] as any[] }));

    for (const row of due.rows) {
      const attempts = (row.attempts || 0) + 1;
      try {
        await attemptSend(row);
        await pool.query(`UPDATE email_outbox SET status = 'sent', sent_at = CURRENT_TIMESTAMP, attempts = $2 WHERE id = $1`, [row.id, attempts]);
        sent += 1;
      } catch (err: any) {
        if (attempts >= MAX_ATTEMPTS) {
          await pool.query(`UPDATE email_outbox SET status = 'failed', attempts = $2, last_error = $3 WHERE id = $1`, [row.id, attempts, err.message.slice(0, 500)]);
          failed += 1;
        } else {
          const backoffMs = Math.min(60_000 * 2 ** (attempts - 1), 16 * 60_000);
          await pool.query(
            `UPDATE email_outbox SET attempts = $2, last_error = $3, next_attempt_at = NOW() + ($4 || ' milliseconds')::interval WHERE id = $1`,
            [row.id, attempts, err.message.slice(0, 500), String(backoffMs)]
          );
          pending += 1;
        }
      }
    }
    const remaining = await pool.query(`SELECT count(*)::int AS n FROM email_outbox WHERE status = 'pending'`).catch(() => ({ rows: [{ n: 0 }] }));
    pending = remaining.rows[0]?.n ?? pending;
  } finally {
    processing = false;
  }
  return { sent, failed, pending };
}

/** Start the background worker. Interval is 60s in production, 20s in dev. */
export function startOutboxWorker(): void {
  if (process.env.OUTBOX_WORKER === 'false') {
    console.log('[outbox] Worker disabled (OUTBOX_WORKER=false).');
    return;
  }
  if (workerTimer) return;
  const interval = process.env.NODE_ENV === 'production' ? 60_000 : 20_000;
  console.log(`[outbox] Email worker armed — every ${interval / 1000}s.`);
  workerTimer = setInterval(async () => {
    try {
      const r = await processOutbox();
      if (r.sent > 0 || r.failed > 0) console.log(`[outbox] sent=${r.sent} failed=${r.failed} pending=${r.pending}`);
    } catch (err: any) {
      console.error('[outbox] tick failed:', err?.message);
    }
  }, interval);
  workerTimer.unref();
}

/** Drain immediately (used by tests and the manual run endpoint). */
export async function runOutboxOnce(): Promise<{ sent: number; failed: number; pending: number }> {
  return processOutbox();
}
