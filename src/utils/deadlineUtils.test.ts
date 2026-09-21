import { describe, it, expect } from 'vitest';
import { getDeadlineInfo } from './deadlineUtils';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  // Local date parts (NOT toISOString, which is UTC) — the app is IST-first
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

describe('getDeadlineInfo', () => {
  it('treats past deadlines as closed', () => {
    const info = getDeadlineInfo(daysFromNow(-3));
    expect(info.urgency).toBe('closed');
    expect(info.daysLeft).toBe(0);
  });

  it('shows critical urgency for deadlines within 2 days', () => {
    for (const days of [0, 1, 2]) {
      const info = getDeadlineInfo(daysFromNow(days));
      expect(info.urgency).toBe('critical');
      expect(info.daysLeft).toBe(days);
      expect(info.label).toMatch(/day/i);
    }
  });

  it('labels today as "Closes today!"', () => {
    const info = getDeadlineInfo(daysFromNow(0));
    expect(info.label).toBe('Closes today!');
  });

  it('shows soon urgency for 3–7 days out', () => {
    const info = getDeadlineInfo(daysFromNow(5));
    expect(info.urgency).toBe('soon');
    expect(info.label).toBe('5 days left');
  });

  it('shows comfortable urgency beyond a week', () => {
    const info = getDeadlineInfo(daysFromNow(20));
    expect(info.urgency).toBe('comfortable');
    expect(info.label).toBe('20 days left');
  });

  it('treats rolling / non-date deadlines correctly', () => {
    for (const text of ['Active on LinkedIn', 'Rolling', undefined, 'not-a-date']) {
      const info = getDeadlineInfo(text);
      expect(info.urgency).toBe('rolling');
      expect(info.daysLeft).toBeNull();
    }
  });
});
