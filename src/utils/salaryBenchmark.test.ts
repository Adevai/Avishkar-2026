import { describe, it, expect } from 'vitest';
import { getSalaryBenchmark } from './salaryBenchmark';

describe('getSalaryBenchmark — annual LPA strings', () => {
  it('parses a standard LPA range', () => {
    const b = getSalaryBenchmark('₹12.0 - 22.0 LPA');
    expect(b).not.toBeNull();
    expect(b!.isMonthly).toBe(false);
    expect(b!.low).toBe(12);
    expect(b!.high).toBe(22);
    expect(b!.rangeText).toContain('LPA');
    expect(b!.percentile50).toContain('17.0');
  });

  it('converts absolute rupee figures to LPA', () => {
    const b = getSalaryBenchmark('₹850000 - ₹1200000 per annum');
    expect(b!.low).toBeCloseTo(8.5, 1);
    expect(b!.high).toBeCloseTo(12, 1);
  });

  it('flags premium companies with a higher 90th percentile', () => {
    const regular = getSalaryBenchmark('₹12.0 - 20.0 LPA', 'TCS Digital')!;
    const premium = getSalaryBenchmark('₹12.0 - 20.0 LPA', 'Google India')!;
    expect(parseFloat(premium.percentile90.replace(/[^0-9.]/g, '')))
      .toBeGreaterThan(parseFloat(regular.percentile90.replace(/[^0-9.]/g, '')));
  });

  it('compares against the national fresher average', () => {
    const b = getSalaryBenchmark('₹18.0 - 25.0 LPA')!;
    expect(b.positionText).toMatch(/vs national fresher average/);
    expect(b.positionText).toMatch(/\+/);
  });
});

describe('getSalaryBenchmark — monthly internship stipends', () => {
  it('parses monthly stipend ranges with Indian digit grouping', () => {
    const b = getSalaryBenchmark('₹45,000 - 80,000 / month')!;
    expect(b.isMonthly).toBe(true);
    expect(b.low).toBe(45000);
    expect(b.high).toBe(80000);
    expect(b.percentile90).toMatch(/₹/);
  });

  it('labels top-quartile stipends', () => {
    const b = getSalaryBenchmark('₹85,000 / month')!;
    expect(b.positionText).toMatch(/Top-quartile/);
  });

  it('handles single-value monthly stipends', () => {
    const b = getSalaryBenchmark('₹50,000 / month')!;
    expect(b.isMonthly).toBe(true);
    expect(b.low).toBe(50000);
    expect(b.high).toBe(50000);
  });
});

describe('getSalaryBenchmark — edge cases', () => {
  it('returns null for empty or unparseable strings', () => {
    expect(getSalaryBenchmark('')).toBeNull();
    expect(getSalaryBenchmark('As per industry standards')).toBeNull();
    expect(getSalaryBenchmark('N/A')).toBeNull();
  });
});
