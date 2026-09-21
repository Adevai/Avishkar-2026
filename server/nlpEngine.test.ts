import { describe, it, expect } from 'vitest';
import { extractSkillsFromText } from './nlpEngine';

const SAMPLE_RESUME = `
AKSHAT SHARMA
B.Tech Computer Science — COEP Technological University | CGPA: 8.82 | 2026

TECHNICAL SKILLS
Languages: Python, TypeScript, Java, C++
Frameworks: React.js, Node.js, FastAPI
Databases: PostgreSQL, Redis, MongoDB
DevOps: Docker, Kubernetes, AWS, Terraform

EXPERIENCE
Software Engineering Intern — Razorpay (Summer 2025)
Built payment webhook handlers in Node.js with Redis caching, reducing checkout
latency by 30%. Deployed Dockerized microservices to Kubernetes on AWS EKS.

PROJECTS
Distributed URL shortener — FastAPI + PostgreSQL + Kafka, 12k requests/sec.
ML model serving — PyTorch classifier behind a FastAPI inference endpoint.

CERTIFICATIONS
AWS Certified Cloud Practitioner (2025)
NPTEL — Cloud Computing (Elite + Silver)
`;

describe('extractSkillsFromText', () => {
  const result = extractSkillsFromText(SAMPLE_RESUME, 'Full Stack Cloud Engineer');

  it('extracts skills across multiple categories', () => {
    const names = result.skills.map(s => s.skill);
    expect(names).toContain('Python');
    expect(names).toContain('TypeScript');
    expect(names).toContain('Docker');
    expect(names).toContain('PostgreSQL');
  });

  it('never reports zero-confidence or empty skills', () => {
    expect(result.skills.length).toBeGreaterThan(0);
    result.skills.forEach(s => {
      expect(s.confidence).toBeGreaterThan(0);
      expect(s.confidence).toBeLessThanOrEqual(100);
      expect(s.skill.trim().length).toBeGreaterThan(0);
      expect(s.occurrences).toBeGreaterThan(0);
    });
  });

  it('detects standard resume sections', () => {
    expect(result.detectedSections).toContain('SKILLS & COMPETENCIES');
    expect(result.detectedSections).toContain('EXPERIENCE & INTERNSHIPS');
    expect(result.detectedSections).toContain('PROJECTS & WORK');
    expect(result.detectedSections).toContain('EDUCATION');
  });

  it('extracts education metadata (CGPA and degree)', () => {
    expect(result.educationInfo?.cgpa).toBeDefined();
    expect(result.educationInfo?.degree).toBeDefined();
  });

  it('counts repeated skills more than one-off mentions', () => {
    const repeated = extractSkillsFromText(
      'Python python PYTHON python — python everywhere, python all the time.'
    );
    const py = repeated.skills.find(s => s.skill === 'Python');
    expect(py).toBeDefined();
    expect(py!.occurrences).toBeGreaterThanOrEqual(5);
  });

  it('returns an empty skill list for irrelevant text', () => {
    const empty = extractSkillsFromText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
    expect(empty.skills).toHaveLength(0);
  });

  it('produces a non-empty summary for rich resumes', () => {
    expect(result.summaryText.length).toBeGreaterThan(10);
  });
});
