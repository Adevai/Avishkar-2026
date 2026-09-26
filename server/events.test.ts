import { describe, it, expect } from 'vitest';
import type { Response } from 'express';
import { addClient, removeClient, connectedClients, emitEvent } from './events';

/**
 * Unit tests for the SSE hub's delivery targeting (no DB needed):
 * targeted-user events, role-targeted desk events, and broadcasts.
 */

interface FakeClient {
  frames: string[];
  res: Response;
  id: string;
}

const fakeRes = (): FakeClient => {
  const frames: string[] = [];
  const res = {
    write: (chunk: string) => { frames.push(chunk); return true; },
  } as unknown as Response;
  return { frames, res, id: '' };
};

describe('SSE hub delivery targeting', () => {
  it('delivers user-targeted events only to that user', () => {
    const a = fakeRes(); const b = fakeRes();
    a.id = addClient(a.res, 'usr-a', 'student');
    b.id = addClient(b.res, 'usr-b', 'college');

    const delivered = emitEvent({
      type: 'notification', title: 'Hi', message: 'just for a',
      targetUserId: 'usr-a',
    });

    expect(delivered).toBe(1);
    expect(a.frames).toHaveLength(1);
    expect(b.frames).toHaveLength(0);
    expect(a.frames[0]).toContain('event: spark');
    expect(a.frames[0]).toContain('"type":"notification"');
    removeClient(a.id); removeClient(b.id);
    expect(connectedClients()).toBe(0);
  });

  it('delivers role-targeted events to every client carrying that role', () => {
    const tpo1 = fakeRes(); const tpo2 = fakeRes(); const gov = fakeRes(); const stu = fakeRes();
    const ids = [
      addClient(tpo1.res, 'usr-c1', 'college'),
      addClient(tpo2.res, 'usr-c2', 'college'),
      addClient(gov.res, 'usr-g1', 'government'),
      addClient(stu.res, 'usr-s1', 'student'),
    ];

    const delivered = emitEvent({
      type: 'verification_queue', title: 'New approval pending',
      message: 'A student is awaiting college approval.',
      targetRole: 'college',
    });

    expect(delivered).toBe(2);
    expect(tpo1.frames).toHaveLength(1);
    expect(tpo2.frames).toHaveLength(1);
    expect(gov.frames).toHaveLength(0);
    expect(stu.frames).toHaveLength(0);
    expect(tpo1.frames[0]).toContain('"type":"verification_queue"');
    expect(tpo1.frames[0]).toContain('"targetRole":"college"');
    ids.forEach(removeClient);
  });

  it('skips role-targeted delivery for anonymous connections', () => {
    const anon = fakeRes(); const college = fakeRes();
    const ids = [
      addClient(anon.res, null, null),
      addClient(college.res, 'usr-c', 'college'),
    ];

    const delivered = emitEvent({
      type: 'verification_queue', title: 'Queue updated',
      message: 'College desk only.', targetRole: 'college',
    });

    expect(delivered).toBe(1);
    expect(anon.frames).toHaveLength(0);
    expect(college.frames).toHaveLength(1);
    ids.forEach(removeClient);
  });

  it('broadcasts to everyone when neither user nor role is targeted', () => {
    const a = fakeRes(); const b = fakeRes(); const anon = fakeRes();
    const ids = [
      addClient(a.res, 'usr-a', 'government'),
      addClient(b.res, 'usr-b', 'college'),
      addClient(anon.res, null, null),
    ];

    const delivered = emitEvent({ type: 'new_job', title: 'New job', message: 'posted' });

    expect(delivered).toBe(3);
    expect(a.frames).toHaveLength(1);
    expect(b.frames).toHaveLength(1);
    expect(anon.frames).toHaveLength(1);
    ids.forEach(removeClient);
  });

  it('drops dead connections instead of throwing', () => {
    const dead = fakeRes(); const alive = fakeRes();
    dead.res.write = () => { throw new Error('EPIPE'); };
    const ids = [
      addClient(dead.res, 'usr-d', 'college'),
      addClient(alive.res, 'usr-a2', 'college'),
    ];

    const delivered = emitEvent({
      type: 'verification_queue', title: 'x', message: 'x', targetRole: 'college',
    });

    expect(delivered).toBe(1);
    expect(alive.frames).toHaveLength(1);
    expect(connectedClients()).toBe(1); // dead one was reaped
    ids.forEach(removeClient);
    expect(connectedClients()).toBe(0);
  });
});
