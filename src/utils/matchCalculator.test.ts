import { describe, it, expect } from 'vitest';
import { calculateJobMatch } from './matchCalculator';
import { StudentProfile, JobOpportunity } from '../types';

const makeStudent = (overrides: Partial<StudentProfile> = {}): StudentProfile => ({
  id: 'std-test',
  name: 'Test Student',
  email: 'test@college.ac.in',
  avatar: '',
  college: 'COEP',
  degree: 'B.Tech',
  branch: 'Computer Science & Engineering',
  semester: 7,
  cgpa: 8.5,
  graduationYear: 2026,
  targetRole: 'Full Stack Cloud Engineer',
  bio: '',
  resumeUploaded: false,
  declaredSkills: [],
  verifiedSkills: [],
  assessmentCompleted: false,
  readinessScore: 70,
  ...overrides,
});

const makeJob = (overrides: Partial<JobOpportunity> = {}): JobOpportunity => ({
  id: 'job-test',
  title: 'Cloud Engineer',
  company: 'TestCorp',
  location: 'Bengaluru',
  type: 'Full-Time',
  stipendOrSalary: '₹12.0 - 18.0 LPA',
  openings: 1,
  postedDate: '2026-01-01',
  deadline: '2026-12-31',
  description: 'Test role',
  requiredSkills: [],
  minCgpa: 7.0,
  eligibleBranches: ['Computer Science & Engineering'],
  ...overrides,
});

describe('calculateJobMatch', () => {
  it('returns a high match when all verified skills exceed minimums', () => {
    const student = makeStudent({
      verifiedSkills: [
        { skill: 'Cloud & Docker', score: 90, verifiedAt: '2026-01-01' },
        { skill: 'CI/CD & Kubernetes', score: 85, verifiedAt: '2026-01-01' },
      ],
    });
    const job = makeJob({
      requiredSkills: [
        { name: 'Cloud & Docker', weight: 0.6, minScore: 70 },
        { name: 'CI/CD & Kubernetes', weight: 0.4, minScore: 65 },
      ],
    });

    const result = calculateJobMatch(student, job);
    expect(result.matchScore).toBeGreaterThanOrEqual(80);
    expect(result.overallStatus).toBe('High Match');
    expect(result.missingSkills).toHaveLength(0);
    expect(result.matchedSkills.every(m => m.status === 'strong')).toBe(true);
  });

  it('marks skills as deficit when student scores fall below minimums', () => {
    const student = makeStudent({
      verifiedSkills: [{ skill: 'Cloud & Docker', score: 40, verifiedAt: '2026-01-01' }],
    });
    const job = makeJob({
      requiredSkills: [{ name: 'Cloud & Docker', weight: 1.0, minScore: 75 }],
    });

    const result = calculateJobMatch(student, job);
    expect(result.matchedSkills[0].status).toBe('deficit');
    expect(result.matchScore).toBeLessThan(60);
  });

  it('counts unlisted required skills as missing', () => {
    const student = makeStudent({
      verifiedSkills: [{ skill: 'Cloud & Docker', score: 90, verifiedAt: '2026-01-01' }],
    });
    const job = makeJob({
      requiredSkills: [
        { name: 'Cloud & Docker', weight: 0.5, minScore: 70 },
        { name: 'Deep Learning & CV', weight: 0.5, minScore: 70 },
      ],
    });

    const result = calculateJobMatch(student, job);
    expect(result.missingSkills).toContain('Deep Learning & CV');
  });

  it('treats declared (unverified) skills as a baseline 60 score', () => {
    const student = makeStudent({ declaredSkills: ['React.js'] });
    const job = makeJob({
      requiredSkills: [{ name: 'React.js', weight: 1.0, minScore: 55 }],
    });

    const result = calculateJobMatch(student, job);
    // 60 baseline vs 55 required → strong
    expect(result.matchedSkills[0].status).toBe('strong');
    expect(result.matchScore).toBeGreaterThanOrEqual(80);
  });

  it('is case-insensitive on skill names', () => {
    const student = makeStudent({
      verifiedSkills: [{ skill: 'cloud & docker', score: 90, verifiedAt: '2026-01-01' }],
    });
    const job = makeJob({
      requiredSkills: [{ name: 'CLOUD & DOCKER', weight: 1.0, minScore: 70 }],
    });

    const result = calculateJobMatch(student, job);
    expect(result.missingSkills).toHaveLength(0);
    expect(result.matchScore).toBeGreaterThan(80);
  });

  it('flags CGPA ineligibility when below the job minimum', () => {
    const student = makeStudent({ cgpa: 6.2 });
    const job = makeJob({ minCgpa: 7.5 });

    const result = calculateJobMatch(student, job);
    expect(result.cgpaEligible).toBe(false);
    expect(result.overallStatus).toBe('Ineligible');
  });

  it('flags branch ineligibility for mismatched branches', () => {
    const student = makeStudent({ branch: 'Mechanical Engineering' });
    const job = makeJob({ eligibleBranches: ['Computer Science & Engineering'] });

    const result = calculateJobMatch(student, job);
    expect(result.branchEligible).toBe(false);
  });

  it('caps the match score below 100 even for perfect overlap', () => {
    const student = makeStudent({
      verifiedSkills: [{ skill: 'Any Skill', score: 100, verifiedAt: '2026-01-01' }],
    });
    const job = makeJob({
      requiredSkills: [{ name: 'Any Skill', weight: 1.0, minScore: 50 }],
    });

    const result = calculateJobMatch(student, job);
    expect(result.matchScore).toBeLessThanOrEqual(99);
  });
});
