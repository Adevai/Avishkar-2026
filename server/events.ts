import { Response } from 'express';

/**
 * Server-Sent Events (SSE) hub.
 *
 * Maintains a registry of connected clients and provides `emitEvent` for the
 * rest of the backend to push real-time updates: application stage changes,
 * new job postings, MoU signings, assessment results, and general
 * notifications. Frontend connects once via `GET /api/events` (EventSource).
 */

export type SparkEventType =
  | 'application_update'
  | 'new_job'
  | 'job_update'
  | 'new_mou'
  | 'new_problem'
  | 'assessment_result'
  | 'verification_queue'
  | 'notification'
  | 'heartbeat';

export interface SparkEvent {
  type: SparkEventType;
  title: string;
  message: string;
  targetUserId?: string | null;   // null/undefined = broadcast to all connected clients
  targetRole?: string | null;     // deliver to every connected client with this portal role (college/government/...)
  data?: Record<string, any>;
  at: string;
}

interface Client {
  id: string;
  userId: string | null;
  role: string | null;
  res: Response;
}

const clients = new Map<string, Client>();

let clientSeq = 0;

/** Register a browser connection (called by GET /api/events). */
export function addClient(res: Response, userId: string | null, role: string | null = null): string {
  const id = `sse-${++clientSeq}-${Date.now().toString(36)}`;
  clients.set(id, { id, userId, role, res });
  return id;
}

/** Remove a disconnected client. */
export function removeClient(id: string) {
  clients.delete(id);
}

/** Current open connection count (exposed in /api/health for observability). */
export function connectedClients(): number {
  return clients.size;
}

/**
 * Push an event to all connected clients targeted by `targetUserId`
 * (or broadcast when no target is set).
 */
export function emitEvent(evt: Omit<SparkEvent, 'at'>) {
  const payload: SparkEvent = { ...evt, at: new Date().toISOString() };
  const frame = `event: spark\ndata: ${JSON.stringify(payload)}\n\n`;

  let delivered = 0;
  for (const [id, client] of clients) {
    // Targeted events go only to that user; role-targeted events go to every
    // connection carrying that portal role; broadcasts go to everyone.
    if (payload.targetUserId && client.userId && payload.targetUserId !== client.userId) continue;
    if (!payload.targetUserId && payload.targetRole && client.role !== payload.targetRole) continue;

    try {
      client.res.write(frame);
      delivered++;
    } catch {
      // Dead connection — clean it up
      removeClient(id);
    }
  }

  if (delivered > 0) {
    console.log(`📡 [sse] ${evt.type} → ${delivered} client(s)`);
  }
  return delivered;
}

/** Periodic keepalive so proxies don't idle-close connections. */
export function startHeartbeat() {
  setInterval(() => {
    const frame = `event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`;
    for (const [id, client] of clients) {
      try {
        client.res.write(frame);
      } catch {
        removeClient(id);
      }
    }
  }, 30_000);
}
