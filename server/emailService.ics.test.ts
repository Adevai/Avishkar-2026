import { describe, it, expect } from 'vitest';
import { buildInterviewIcs } from './emailService';

/**
 * Unit tests for the RFC 5545 calendar invite builder that powers the
 * .ics attachments on interview confirmation + reminder emails.
 */
describe('buildInterviewIcs (RFC 5545)', () => {
  const base = {
    slotId: 'slot-test-1',
    jobTitle: 'Backend Engineer, Payments (APIs, SQL)',
    company: 'Acme, Inc.',
    scheduledAt: '2026-10-01T09:30:00.000Z',
    durationMinutes: 60,
    mode: 'online',
    meetingUrl: 'https://meet.example.com/abc,def',
    notes: 'Bring resume; arrive early',
  };

  it('produces a structurally valid VCALENDAR with one VEVENT and a VALARM', () => {
    const ics = buildInterviewIcs(base);
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//S.P.A.R.K.//Interview Scheduler//EN');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics).toContain('STATUS:CONFIRMED');
  });

  it('encodes start/end as basic UTC and end = start + duration', () => {
    const ics = buildInterviewIcs(base);
    expect(ics).toContain('DTSTART:20261001T093000Z');
    expect(ics).toContain('DTEND:20261001T103000Z');
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it('escapes commas, semicolons, and backslashes per RFC 5545', () => {
    const ics = buildInterviewIcs(base);
    const summary = ics.split('\r\n').find(l => l.startsWith('SUMMARY:'))!;
    expect(summary).toBe('SUMMARY:Interview — Backend Engineer\\, Payments (APIs\\, SQL) @ Acme\\, Inc.');
    const desc = ics.split('\r\n').find(l => l.startsWith('DESCRIPTION:'))!;
    expect(desc).toContain('Join: https://meet.example.com/abc\\,def');
    expect(desc).toContain('Notes: Bring resume\\; arrive early');
    expect(desc).not.toContain('\n'); // newlines folded into \n literals
  });

  it('uses a stable UID derived from the slot id and omits empty optional parts', () => {
    const ics = buildInterviewIcs({ ...base, meetingUrl: null, notes: null });
    expect(ics).toContain('UID:slot-test-1@interviews.spark');
    const desc = ics.split('\r\n').find(l => l.startsWith('DESCRIPTION:'))!;
    expect(desc).not.toContain('Join');
    expect(desc).not.toContain('Notes');
    const loc = ics.split('\r\n').find(l => l.startsWith('LOCATION:'))!;
    expect(loc).toBe('LOCATION:Online');
  });
});
