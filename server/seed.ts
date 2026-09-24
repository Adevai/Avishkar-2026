import { pool } from './db';
import {
  INITIAL_STUDENT,
  SAMPLE_STUDENTS,
  INITIAL_JOBS,
  INITIAL_MOUS,
  INITIAL_PROBLEMS,
  INITIAL_ROADMAP,
} from '../src/data/mockData';

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    const studentCount = await client.query('SELECT count(*) FROM students');
    if (parseInt(studentCount.rows[0].count, 10) > 0) {
      console.log('⚡ PostgreSQL database already populated, skipping seed.');
      return;
    }

    console.log('🌱 Seeding PostgreSQL database with real-world academia-industry data...');
    await client.query('BEGIN');

    // Seed Students
    for (const s of SAMPLE_STUDENTS) {
      await client.query(
        `INSERT INTO students (
          id, name, email, avatar, college, degree, branch, semester, cgpa, graduation_year,
          target_role, bio, resume_uploaded, resume_name, github_url, linkedin_url,
          declared_skills, verified_skills, assessment_completed, readiness_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.name,
          s.email,
          s.avatar,
          s.college,
          s.degree,
          s.branch,
          s.semester,
          s.cgpa,
          s.graduationYear,
          s.targetRole,
          s.bio,
          s.resumeUploaded,
          s.resumeName || null,
          s.githubUrl || null,
          s.linkedinUrl || null,
          JSON.stringify(s.declaredSkills),
          JSON.stringify(s.verifiedSkills),
          s.assessmentCompleted,
          s.readinessScore,
        ]
      );
    }

    // Seed Initial Roadmap for student
    await client.query(
      `INSERT INTO roadmaps (id, student_id, milestones)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      ['rdm-default', INITIAL_STUDENT.id, JSON.stringify(INITIAL_ROADMAP)]
    );

    // Seed Jobs
    for (const j of INITIAL_JOBS) {
      await client.query(
        `INSERT INTO jobs (
          id, title, company, company_logo, location, type, stipend_or_salary,
          duration, openings, posted_date, deadline, description, required_skills,
          min_cgpa, eligible_branches
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING`,
        [
          j.id,
          j.title,
          j.company,
          j.companyLogo || null,
          j.location,
          j.type,
          j.stipendOrSalary,
          j.duration || null,
          j.openings,
          j.postedDate,
          j.deadline,
          j.description,
          JSON.stringify(j.requiredSkills),
          j.minCgpa,
          JSON.stringify(j.eligibleBranches),
        ]
      );
    }

    // Seed MoUs
    for (const m of INITIAL_MOUS) {
      await client.query(
        `INSERT INTO mous (
          id, college_name, company_name, title, focus_area, signed_date,
          valid_until, status, initiatives_count, key_objectives
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING`,
        [
          m.id,
          m.collegeName,
          m.companyName,
          m.title,
          m.focusArea,
          m.signedDate,
          m.validUntil,
          m.status,
          m.initiativesCount,
          JSON.stringify(m.keyObjectives),
        ]
      );
    }

    // Seed Problem Statements
    for (const p of INITIAL_PROBLEMS) {
      await client.query(
        `INSERT INTO problem_statements (
          id, title, company, domain, description, reward_or_grant, deadline,
          submissions_count, status, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING`,
        [
          p.id,
          p.title,
          p.company,
          p.domain,
          p.description,
          p.rewardOrGrant,
          p.deadline,
          p.submissionsCount,
          p.status,
          JSON.stringify(p.tags),
        ]
      );
    }

    // Seed Sample Applications
    await client.query(
      `INSERT INTO applications (
        id, job_id, job_title, company, student_id, student_name, applied_date, status, ai_match_score, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [
        'app-01',
        'job-02',
        'Full Stack Engineer - Digital Innovator',
        'TCS Digital',
        INITIAL_STUDENT.id,
        INITIAL_STUDENT.name,
        '2024-09-04',
        'Shortlisted',
        92,
        'Shortlisted for Round 1 Technical Interview based on top-percentile React and Data Structures scores.',
      ]
    );

    // Seed Initial Notifications — user_id must reference users.id (the
    // auth-scoped /notifications endpoint filters on it), so map the student's
    // user row first instead of storing a students.id.
    const notifications = [
      { id: 'notif-1', title: 'Application Shortlisted', msg: 'TCS Digital shortlisted your profile for Technical Round 1!', type: 'success' },
      { id: 'notif-2', title: 'New MoU Partnership', msg: 'COEP University signed a 3-Year CoE MoU with Tata Motors R&D.', type: 'info' },
      { id: 'notif-3', title: 'New Capstone Challenge', msg: 'L&T posted "Decentralized Carbon Ledger" with ₹3 Lakhs seed grant.', type: 'alert' },
    ];
    const seedUser = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [INITIAL_STUDENT.email.toLowerCase()]
    );
    let seedUserId = seedUser.rows[0]?.id || null;
    if (!seedUserId) {
      const created = await client.query(
        `INSERT INTO users (id, name, email, role, avatar)
         VALUES ($1, $2, $3, 'student', $4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [
          `usr-seed-${INITIAL_STUDENT.id}`,
          INITIAL_STUDENT.name,
          INITIAL_STUDENT.email.toLowerCase(),
          INITIAL_STUDENT.avatar || null,
        ]
      );
      seedUserId = created.rows[0].id;
    }
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [n.id, seedUserId, n.title, n.msg, n.type]
      );
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (actor, action, details)
       VALUES ($1, $2, $3)`,
      ['SYSTEM_SETUP', 'INITIAL_DATABASE_SEED', JSON.stringify({ status: 'SUCCESS', tables: 6 })]
    );

    await client.query('COMMIT');
    console.log('🎉 PostgreSQL Database successfully seeded with 6 tables of production-ready data!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during PostgreSQL database seeding', err);
    throw err;
  } finally {
    client.release();
  }
}
