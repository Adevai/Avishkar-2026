import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Production platforms (Render, Railway, Supabase, Neon, Heroku…) expose a
// single DATABASE_URL; local dev keeps the granular PG* variables. Set
// PGSSL=require for managed Postgres, PGSSL_STRICT=true to enforce CA validation.
const databaseUrl = process.env.DATABASE_URL?.trim();
const poolMax = parseInt(process.env.PGPOOL_MAX || '20', 10) || 20;

function resolveSsl(): PoolConfig['ssl'] {
  if (databaseUrl && /sslmode=(require|verify-ca|verify-full)/.test(databaseUrl)) {
    return { rejectUnauthorized: process.env.PGSSL_STRICT === 'true' };
  }
  if (process.env.PGSSL === 'require') {
    return { rejectUnauthorized: process.env.PGSSL_STRICT === 'true' };
  }
  return undefined;
}

const config: PoolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      max: poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: resolveSsl(),
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'avishkar_db',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      max: poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: resolveSsl(),
    };

export const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[db] Slow query (${duration}ms): ${text.slice(0, 80).replace(/\s+/g, ' ')}…`);
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text: text.slice(0, 120), error: (error as any)?.message });
    throw error;
  }
}

export async function initDatabase() {
  console.log('🔄 Initializing PostgreSQL database schema for Avishkar...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(32) NOT NULL,
        avatar TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Students Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        avatar TEXT,
        college VARCHAR(255) NOT NULL,
        degree VARCHAR(64) NOT NULL,
        branch VARCHAR(128) NOT NULL,
        semester INT NOT NULL,
        cgpa NUMERIC(4, 2) NOT NULL,
        graduation_year INT NOT NULL,
        target_role VARCHAR(128) NOT NULL,
        bio TEXT,
        resume_uploaded BOOLEAN DEFAULT FALSE,
        resume_name VARCHAR(255),
        github_url TEXT,
        linkedin_url TEXT,
        declared_skills JSONB DEFAULT '[]'::jsonb,
        verified_skills JSONB DEFAULT '[]'::jsonb,
        assessment_completed BOOLEAN DEFAULT FALSE,
        readiness_score INT DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Assessments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id VARCHAR(64) PRIMARY KEY,
        student_id VARCHAR(64) NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        total_score INT NOT NULL,
        max_score INT NOT NULL,
        percentage INT NOT NULL,
        category_scores JSONB NOT NULL,
        time_spent_seconds INT NOT NULL,
        performance_grade VARCHAR(64) NOT NULL
      );
    `);

    // 4. Learning Roadmaps Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roadmaps (
        id VARCHAR(64) PRIMARY KEY,
        student_id VARCHAR(64) NOT NULL,
        milestones JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Jobs & Internships Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        company_logo TEXT,
        location VARCHAR(255) NOT NULL,
        type VARCHAR(64) NOT NULL,
        stipend_or_salary VARCHAR(128) NOT NULL,
        duration VARCHAR(64),
        openings INT DEFAULT 1,
        posted_date DATE DEFAULT CURRENT_DATE,
        deadline TEXT,
        description TEXT,
        required_skills JSONB NOT NULL,
        min_cgpa NUMERIC(4, 2) DEFAULT 6.0,
        eligible_branches JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Applications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(64) PRIMARY KEY,
        job_id VARCHAR(64) NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        student_id VARCHAR(64) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        applied_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(64) DEFAULT 'Applied',
        ai_match_score INT NOT NULL,
        notes TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. MoUs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mous (
        id VARCHAR(64) PRIMARY KEY,
        college_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        focus_area TEXT NOT NULL,
        signed_date DATE DEFAULT CURRENT_DATE,
        valid_until DATE NOT NULL,
        status VARCHAR(64) DEFAULT 'Active',
        initiatives_count INT DEFAULT 1,
        key_objectives JSONB DEFAULT '[]'::jsonb,
        digital_signature_hash VARCHAR(128),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Problem Statements Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS problem_statements (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        domain VARCHAR(128) NOT NULL,
        description TEXT NOT NULL,
        reward_or_grant VARCHAR(128),
        deadline DATE,
        submissions_count INT DEFAULT 0,
        status VARCHAR(64) DEFAULT 'Open',
        tags JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(64) DEFAULT 'info',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        actor VARCHAR(128) NOT NULL,
        action VARCHAR(128) NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. OTP Verifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(16) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);
    `);

    // 12. Digital Badges Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS digital_badges (
        id VARCHAR(64) PRIMARY KEY,
        student_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(128) NOT NULL,
        issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        score_percentage INT NOT NULL,
        verification_hash VARCHAR(128) NOT NULL,
        issuer VARCHAR(255) NOT NULL,
        skills JSONB DEFAULT '[]'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_badge_student ON digital_badges(student_id);
    `);

    // Alter students table for OCR & Coding Telemetry if not exists
    await client.query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS id_card_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS id_card_details JSONB;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS leetcode_url TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS coding_telemetry JSONB;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS attached_scorecard_url TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS attached_resume_url TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::jsonb;
    `);

    // JWT auth support: hashed credential storage on users
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(128);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
    `);

    // Manual review queue for institutions & ID cards flagged 'recognized/pending'
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_reviews (
        id VARCHAR(64) PRIMARY KEY,
        kind VARCHAR(32) NOT NULL,               -- 'institution' | 'id_card'
        submitted_value TEXT NOT NULL,           -- name entered / OCR-extracted institution
        level VARCHAR(16) NOT NULL,              -- 'verified' | 'recognized' | 'unverified'
        confidence INT NOT NULL,
        matched_name TEXT,
        accreditation TEXT,
        student_id VARCHAR(64),
        student_name TEXT,
        roll_number TEXT,
        details JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
        reviewed_by VARCHAR(64),
        review_note TEXT,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_vr_status ON verification_reviews(status, kind);
    `);

    // Job freshness & source attribution on synced listings
    await client.query(`
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_platform VARCHAR(64) DEFAULT 'Campus Direct';
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url TEXT;
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_jobs_fetched ON jobs(fetched_at DESC);
    `);

    // Rolling listings carry a textual "Active on …" label instead of a date;
    // widen the column so aggregator syncs never fail on type.
    await client.query(`
      ALTER TABLE jobs ALTER COLUMN deadline TYPE TEXT;
    `);

    // Recruiter ownership + job lifecycle. Aggregated/synced listings stay
    // unowned (posted_by IS NULL) — only recruiters who posted via the API own rows.
    await client.query(`
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_by VARCHAR(64);
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_by_name VARCHAR(255);
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'open';
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    `);

    // Label unowned jobs with their company so "posted by" never renders blank.
    // (Never invents ownership — only fills the display name.)
    await client.query(`
      UPDATE jobs SET posted_by_name = company
      WHERE posted_by IS NULL AND (posted_by_name IS NULL OR posted_by_name = '');
    `);

    // Student job-alert digest opt-out flag
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS job_alerts_enabled BOOLEAN DEFAULT TRUE;
    `);

    // Server-side institution verification flag (distinct from client-side id_card_verified)
    await client.query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS institution_verified BOOLEAN DEFAULT FALSE;
    `);

    // ══════════════════════════════════════════════════════════════════
    // ALUMNI NETWORK — applications, directory, mentorship, chat
    // ══════════════════════════════════════════════════════════════════
    await client.query(`
      CREATE TABLE IF NOT EXISTS alumni_applications (
        id VARCHAR(64) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(32),
        college_id VARCHAR(64) NOT NULL,
        college_name VARCHAR(255) NOT NULL,
        degree VARCHAR(128) NOT NULL,
        graduation_year INT NOT NULL,
        company VARCHAR(255) NOT NULL,
        designation VARCHAR(255) NOT NULL,
        experience_years INT DEFAULT 0,
        linkedin_url TEXT,
        github_url TEXT,
        expertise JSONB DEFAULT '[]'::jsonb,
        bio TEXT,
        credential_doc_name TEXT,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
        review_note TEXT,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_alumni_app_status ON alumni_applications(college_id, status);

      CREATE TABLE IF NOT EXISTS alumni (
        id VARCHAR(64) PRIMARY KEY,
        application_id VARCHAR(64) REFERENCES alumni_applications(id),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        college_id VARCHAR(64) NOT NULL,
        college_name VARCHAR(255) NOT NULL,
        degree VARCHAR(128) NOT NULL,
        graduation_year INT NOT NULL,
        company VARCHAR(255) NOT NULL,
        designation VARCHAR(255) NOT NULL,
        experience_years INT DEFAULT 0,
        expertise JSONB DEFAULT '[]'::jsonb,
        bio TEXT,
        linkedin_url TEXT,
        avatar_url TEXT,
        mentor_capacity INT DEFAULT 5,
        rating NUMERIC(2,1) DEFAULT 0,
        verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_alumni_college ON alumni(college_id);

      CREATE TABLE IF NOT EXISTS mentorship_requests (
        id VARCHAR(64) PRIMARY KEY,
        alumni_id VARCHAR(64) NOT NULL REFERENCES alumni(id),
        student_id VARCHAR(64) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        student_college VARCHAR(255),
        student_branch VARCHAR(128),
        message TEXT NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',   -- pending | accepted | declined
        room_id VARCHAR(64),
        responded_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mreq_alumni ON mentorship_requests(alumni_id, status);
      CREATE INDEX IF NOT EXISTS idx_mreq_student ON mentorship_requests(student_id, status);

      CREATE TABLE IF NOT EXISTS mentorship_rooms (
        id VARCHAR(64) PRIMARY KEY,
        alumni_id VARCHAR(64) NOT NULL,
        student_id VARCHAR(64) NOT NULL,
        request_id VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mroom_alumni ON mentorship_rooms(alumni_id);
      CREATE INDEX IF NOT EXISTS idx_mroom_student ON mentorship_rooms(student_id);

      CREATE TABLE IF NOT EXISTS mentorship_messages (
        id VARCHAR(64) PRIMARY KEY,
        room_id VARCHAR(64) NOT NULL,
        sender_role VARCHAR(16) NOT NULL,   -- student | mentor
        sender_name VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mmsg_room ON mentorship_messages(room_id, at);

      CREATE TABLE IF NOT EXISTS fast_track_jobs (
        id VARCHAR(64) PRIMARY KEY,
        alumni_id VARCHAR(64) NOT NULL,
        alumni_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        type VARCHAR(16) NOT NULL,          -- Internship | Full-Time
        stipend_or_salary VARCHAR(128),
        location VARCHAR(255),
        description TEXT,
        expiry_days INT DEFAULT 14,
        posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        applicant_ids JSONB DEFAULT '[]'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_ftj_alumni ON fast_track_jobs(alumni_id);
    `);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL Schema migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to run database migrations', err);
    throw err;
  } finally {
    client.release();
  }
}
