import { query } from './db';

/**
 * Realistic India-specific bulk seed data generator.
 *
 * Produces 200+ students across 15 real Indian institutions with coherent
 * distributions (branch mix, CGPA curve, readiness vs branch correlation,
 * assessment history, application funnels) so every dashboard looks
 * production-populated on a fresh install.
 *
 * Enabled with SEED_LARGE_DATASET=true.
 */

// ── Real Indian institutions with realistic branch mixes ────────────────────
const INSTITUTIONS = [
  { name: 'IIT Bombay', state: 'Maharashtra', tier: 1, branches: ['Computer Science & Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'AI & Data Science'] },
  { name: 'IIT Delhi', state: 'Delhi', tier: 1, branches: ['Computer Science & Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'] },
  { name: 'IIT Madras', state: 'Tamil Nadu', tier: 1, branches: ['Computer Science & Engineering', 'AI & Data Science', 'Electrical Engineering'] },
  { name: 'NIT Trichy', state: 'Tamil Nadu', tier: 1, branches: ['Computer Science & Engineering', 'ECE — Electronics & Communication', 'Mechanical Engineering'] },
  { name: 'NIT Surathkal', state: 'Karnataka', tier: 1, branches: ['Computer Science & Engineering', 'Information Technology', 'ECE — Electronics & Communication'] },
  { name: 'IIIT Hyderabad', state: 'Telangana', tier: 1, branches: ['Computer Science & Engineering', 'AI & Data Science'] },
  { name: 'COEP Technological University, Pune', state: 'Maharashtra', tier: 2, branches: ['Computer Science & Engineering', 'Information Technology', 'ECE — Electronics & Communication', 'Mechanical Engineering'] },
  { name: 'VJTI Mumbai', state: 'Maharashtra', tier: 2, branches: ['Computer Science & Engineering', 'Information Technology', 'Civil Engineering'] },
  { name: 'BITS Pilani', state: 'Rajasthan', tier: 1, branches: ['Computer Science & Engineering', 'ECE — Electronics & Communication', 'Mechanical Engineering'] },
  { name: 'DTU Delhi', state: 'Delhi', tier: 2, branches: ['Computer Science & Engineering', 'Information Technology', 'Mechanical Engineering'] },
  { name: 'Anna University, Chennai', state: 'Tamil Nadu', tier: 2, branches: ['Computer Science & Engineering', 'ECE — Electronics & Communication', 'Electrical Engineering'] },
  { name: 'Jadavpur University, Kolkata', state: 'West Bengal', tier: 2, branches: ['Computer Science & Engineering', 'Electrical Engineering', 'Metallurgy'] },
  { name: 'PICT Pune', state: 'Maharashtra', tier: 2, branches: ['Computer Science & Engineering', 'Information Technology', 'ECE — Electronics & Communication'] },
  { name: 'RV College of Engineering, Bengaluru', state: 'Karnataka', tier: 2, branches: ['Computer Science & Engineering', 'Information Technology', 'Biotechnology'] },
  { name: 'SPPU (Savitribai Phule Pune University)', state: 'Maharashtra', tier: 3, branches: ['Computer Science & Engineering', 'Information Technology', 'Mechanical Engineering', 'Civil Engineering'] },
];

const FIRST_NAMES_M = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan', 'Rahul', 'Karthik', 'Anirudh', 'Dhruv', 'Kabir', 'Aryan', 'Nikhil', 'Pranav', 'Varun', 'Yash', 'Siddharth', 'Harsh', 'Manav', 'Kunal', 'Rahul', 'Devansh', 'Ayush', 'Gaurav', 'Naveen', 'Abhishek'];
const FIRST_NAMES_F = ['Ananya', 'Diya', 'Aadhya', 'Myra', 'Sara', 'Pooja', 'Ishita', 'Anika', 'Navya', 'Riya', 'Sneha', 'Priya', 'Meera', 'Kavya', 'Shreya', 'Neha', 'Aditi', 'Tanvi', 'Preeti', 'Divya', 'Aishwarya', 'Swara', 'Kritika', 'Rhea', 'Sanjana', 'Nandini', 'Charvi', 'Medha', 'Trisha', 'Vaishnavi'];
const LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Reddy', 'Nair', 'Iyer', 'Patel', 'Deshmukh', 'Joshi', 'Kulkarni', 'Mehta', 'Shah', 'Rao', 'Naidu', 'Menon', 'Pillai', 'Bose', 'Chatterjee', 'Banerjee', 'Ghosh', 'Singh', 'Yadav', 'Mishra', 'Tiwari', 'Agarwal', 'Bansal', 'Kapoor', 'Malhotra', 'Chopra', 'Kapadia'];

const SKILL_POOL: Record<string, string[]> = {
  'Computer Science & Engineering': ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Python', 'REST APIs', 'GraphQL', 'Redis', 'Next.js', 'MongoDB', 'Tailwind CSS', 'Express.js', 'Jest', 'CI/CD', 'AWS EC2', 'Git', 'Microservices'],
  'Information Technology': ['Java', 'Spring Boot', 'MySQL', 'Angular', 'Hibernate', 'Kafka', 'Jenkins', 'Linux', 'Bash', 'Docker', 'Python', 'REST APIs', 'Maven', 'Hibernate', 'HTML/CSS'],
  'AI & Data Science': ['Python', 'PyTorch', 'TensorFlow', 'Scikit-Learn', 'Pandas', 'NumPy', 'OpenCV', 'NLP', 'MLOps', 'Docker', 'FastAPI', 'SQL', 'Tableau', 'Power BI', 'Jupyter'],
  'ECE — Electronics & Communication': ['Embedded C', 'ESP32', 'FreeRTOS', 'MQTT', 'Python', 'Verilog', 'MATLAB', 'PCB Design', 'ARM Cortex', 'I2C/SPI', 'Signal Processing', 'IoT Protocols (MQTT/CoAP)'],
  'Electrical Engineering': ['MATLAB', 'Simulink', 'Power Systems', 'PLC', 'SCADA', 'Python', 'ETAP', 'AutoCAD Electrical', 'Embedded C', 'VHDL'],
  'Mechanical Engineering': ['SolidWorks', 'CATIA', 'ANSYS', 'AutoCAD', 'Python', 'MATLAB', '3D Printing', 'GD&T', 'Finite Element Analysis', 'Thermal Analysis'],
  'Civil Engineering': ['STAAD.Pro', 'ETABS', 'AutoCAD', 'Revit', 'MS Project', 'Primavera', 'Quantity Surveying', 'GIS', 'Concrete Technology'],
  'Biotechnology': ['Python', 'Chromatography', 'PCR', 'Cell Culture', 'Bioinformatics', 'BLAST', 'Bioreactor Design', 'LabView'],
  'Metallurgy': ['Python', 'Heat Treatment', 'SEM Analysis', 'Corrosion Science', 'Materials Testing', 'MATLAB'],
};

const TARGET_ROLES = [
  'Full Stack Cloud Engineer', 'AI/ML Specialist', 'DevOps & SRE Engineer',
  'Data Engineer & Analytics Specialist', 'Embedded & IoT Systems Engineer',
  'Mechanical Design & CAD/CAM Engineer', 'Structural Analysis & Design Engineer',
  'Cybersecurity Analyst', 'UI/UX & Digital Product Designer',
];

const COMPANIES = [
  'TCS Digital', 'Infosys Innovate Labs', 'Wipro Holmes', 'Persistent Systems', 'Zoho',
  'Razorpay', 'CRED', 'Zerodha', 'Swiggy Instamart', 'Zomato', 'Flipkart', 'Myntra',
  'Microsoft India', 'Google Cloud India', 'Amazon India', 'Atlassian India', 'Uber India',
  'Tata Elxsi', 'Tata Motors R&D', 'Mahindra Tech', 'Ather Energy', 'Ola Electric',
  'Larsen & Toubro Tech Services', 'L&T Construction', 'Apollo Hospitals HealthTech',
  'Qualcomm India', 'Intel India', 'Nvidia India', 'Drone Energy', 'Fractal Analytics',
  'Mu Sigma', 'Quantiphi', 'Mad Street Den', 'Freshworks', 'Postman', 'Chargepoint India',
];

const JOB_TITLES = [
  'Cloud Infrastructure & SRE Intern', 'Associate Cloud Solutions Architect',
  'Full Stack Payment Systems Engineer', 'High-Throughput Backend Systems Engineer',
  'AI/ML Associate Research Engineer', 'Embedded Firmware & BMS Engineer',
  'Embedded Systems & Wireless RTOS Intern', 'Cloud DevOps & Platform Engineer',
  'Data & Supply Chain Optimization Engineer', 'Product Experience & UI Engineer',
  'Full Stack Engineer — Digital Innovator', 'Graduate Engineer Trainee — Digital',
  'Software Engineer — Platform Group', 'Backend Engineer — Payments',
  'Data Analyst — Growth Team', 'ML Engineer — Vision Systems',
  'DevOps Engineer — Infra Automation', 'Site Reliability Engineer',
  'Frontend Engineer — Design System', 'IoT Systems Engineer — EV Platforms',
];

const MOU_TITLES = [
  'Center of Excellence in Electric Mobility & Embedded AI',
  'Cloud Computing & Generative AI Co-Innovation Hub',
  'Smart City Infrastructure & Cyber-Physical Systems Lab',
  'Advanced Manufacturing & Industry 4.0 Lab',
  'FinTech Innovation & Blockchain Research Center',
  'AgriTech Drone & Precision Farming Lab',
  'Cybersecurity Range & Zero-Trust Research Center',
  'HealthTech Diagnostics & Bioinstrumentation Lab',
  'EV Battery Management & Power Electronics Lab',
  ' Semiconductor Design & VLSI Talent Hub',
  'Green Hydrogen & Sustainable Energy Lab',
  'Quantum Computing Awareness & Skills Center',
];

const FOCUS_AREAS = [
  'Joint EV Powertrain Research, Annual Student Internships, Faculty Exchange',
  'Cloud Native Microservices, LLM fine-tuning, Pre-placement Training',
  'IoT Sensor Networks, Industrial Automation & Smart Grids',
  'Capstone Sponsorship, Hackathons & Curriculum Modernization',
  'Research Publications, Patent Filings & PhD Sponsorships',
];

// ── Deterministic PRNG so seeded data is stable across regenerations ────────
let seedState = 20260920;
function rand(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(rand() * (max - min + 1)) + min; }

export async function generateLargeSeed(): Promise<void> {
  const existing = await query('SELECT count(*) FROM students');
  if (parseInt(existing.rows[0].count, 10) >= 200) {
    console.log('⏭️  [seed] Large dataset already present, skipping.');
    return;
  }

  console.log('🌱 [seed] Generating 200+ student production dataset…');
  const client = await query('BEGIN').then(() => query('SELECT 1')); // placeholder txn guard
  void client;

  try {
    await query('BEGIN');

    // ── Students ──────────────────────────────────────────────────────────
    const TARGET_STUDENTS = 210;
    const studentRows: any[] = [];

    for (let i = 0; i < TARGET_STUDENTS; i++) {
      const inst = pick(INSTITUTIONS);
      const branch = pick(inst.branches);
      const gender = rand() > 0.45 ? 'm' : 'f';
      const firstName = gender === 'm' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName = pick(LAST_NAMES);
      const name = `${firstName} ${lastName}`;

      // CGPA curve: tier-1 skews higher, tier-3 lower
      const cgpaBase = inst.tier === 1 ? 7.8 : inst.tier === 2 ? 7.4 : 6.9;
      const cgpa = Math.min(10, Math.max(5.5, Math.round((cgpaBase + rand() * 2.2) * 100) / 100));

      // Branch skill pool
      const skillsPool = SKILL_POOL[branch] || SKILL_POOL['Computer Science & Engineering'];
      const numDeclared = randInt(5, 10);
      const declared: string[] = [];
      while (declared.length < Math.min(numDeclared, skillsPool.length)) {
        const s = pick(skillsPool);
        if (!declared.includes(s)) declared.push(s);
      }

      // Verified subset with tier-influenced scores
      const tierBoost = inst.tier === 1 ? 10 : inst.tier === 2 ? 0 : -8;
      const verified = declared.slice(0, randInt(3, 6)).map(s => ({
        skill: s,
        score: Math.min(98, randInt(55, 92) + tierBoost),
        verifiedAt: `2026-0${randInt(1, 9)}-${String(randInt(10, 28)).padStart(2, '0')}`,
      }));

      const readiness = Math.min(96, Math.max(22, Math.round(verified.reduce((a, v) => a + v.score, 0) / Math.max(1, verified.length) + tierBoost)));

      const semester = randInt(5, 8);
      const gradYear = 2026 + (8 - semester >= 2 ? 0 : 1);
      const id = `std-gen-${String(i + 1).padStart(4, '0')}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randInt(10, 999)}@${inst.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)}.ac.in`;

      studentRows.push({ id, name, email, inst, branch, semester, cgpa, gradYear, declared, verified, readiness, gender });
    }

    for (const s of studentRows) {
      await query(
        `INSERT INTO students (
          id, name, email, avatar, college, degree, branch, semester, cgpa,
          graduation_year, target_role, bio, resume_uploaded, resume_name,
          declared_skills, verified_skills, assessment_completed, readiness_score
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.name, s.email,
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.id)}`,
          s.inst.name, s.branch.includes('Biotech') ? 'B.Tech' : 'B.Tech', s.branch,
          s.semester, s.cgpa, s.gradYear, pick(TARGET_ROLES),
          `${s.branch} undergraduate at ${s.inst.name} passionate about building production-grade systems.`,
          rand() > 0.4, rand() > 0.4 ? `${s.name.replace(/\s+/g, '_')}_Resume.pdf` : null,
          JSON.stringify(s.declared), JSON.stringify(s.verified), true, s.readiness,
        ]
      );
    }

    // ── 60 Jobs across realistic India categories ────────────────────────
    const JOB_COUNT = 60;
    const cities = ['Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Gurugram', 'Mumbai', 'Noida', 'Kolkata', 'Remote (India)'];
    const branchesList = ['Computer Science & Engineering', 'Information Technology', 'AI & Data Science', 'ECE — Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Biotechnology'];

    for (let j = 0; j < JOB_COUNT; j++) {
      const title = pick(JOB_TITLES);
      const company = pick(COMPANIES);
      const city = pick(cities);
      const isIntern = /intern|trainee/i.test(title);
      const minCgpa = rand() > 0.5 ? randInt(60, 85) / 10 : 7.0;

      await query(
        `INSERT INTO jobs (
          id, title, company, company_logo, location, type, stipend_or_salary,
          duration, openings, posted_date, deadline, description, required_skills,
          min_cgpa, eligible_branches
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO NOTHING`,
        [
          `job-gen-${String(j + 1).padStart(3, '0')}`,
          title, company, null,
          rand() > 0.7 ? `${city} / Remote` : city,
          isIntern ? 'Internship' : 'Full-Time',
          isIntern ? `₹${randInt(25, 90) * 1000} / month` : `₹${(() => { const lo = randInt(6, 26), hi = randInt(12, 34); return lo <= hi ? `${lo}.0 - ${hi}.0` : `${hi}.0 - ${lo}.0`; })()} LPA`,
          isIntern ? `${randInt(3, 6)} Months` : null,
          randInt(2, 45),
          `2026-0${randInt(1, 9)}-${String(randInt(10, 28)).padStart(2, '0')}`,
          `Active on ${pick(['LinkedIn', 'Adzuna', 'Campus Direct'])}`,
          `${company} is hiring ${title.toLowerCase()} for its ${city} engineering center. Selected candidates work on production systems with mentorship from senior engineers.`,
          JSON.stringify(pick([
            [{ name: 'Backend & REST APIs', weight: 0.35, minScore: 65 }, { name: 'Relational Databases (SQL)', weight: 0.3, minScore: 65 }, { name: 'Data Structures & Algorithms', weight: 0.35, minScore: 70 }],
            [{ name: 'Frontend Web (React/TS)', weight: 0.4, minScore: 70 }, { name: 'Professional Communication', weight: 0.25, minScore: 65 }, { name: 'Data Structures & Algorithms', weight: 0.35, minScore: 70 }],
            [{ name: 'Cloud & Docker', weight: 0.4, minScore: 65 }, { name: 'CI/CD & Kubernetes', weight: 0.35, minScore: 60 }, { name: 'Backend & REST APIs', weight: 0.25, minScore: 65 }],
            [{ name: 'Microcontroller Architecture', weight: 0.4, minScore: 70 }, { name: 'RTOS & Embedded C', weight: 0.35, minScore: 70 }, { name: 'IoT Protocols (MQTT/CoAP)', weight: 0.25, minScore: 60 }],
            [{ name: 'Data Preprocessing & Math', weight: 0.4, minScore: 68 }, { name: 'Deep Learning & CV', weight: 0.35, minScore: 70 }, { name: 'Relational Databases (SQL)', weight: 0.25, minScore: 65 }],
          ])),
          minCgpa,
          JSON.stringify([pick(branchesList), pick(branchesList)]),
        ]
      );
    }

    // ── 12 MoUs ───────────────────────────────────────────────────────────
    for (let m = 0; m < 12; m++) {
      const inst = pick(INSTITUTIONS);
      const company = pick(COMPANIES);
      await query(
        `INSERT INTO mous (
          id, college_name, company_name, title, focus_area, signed_date,
          valid_until, status, initiatives_count, key_objectives
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO NOTHING`,
        [
          `mou-gen-${String(m + 1).padStart(2, '0')}`,
          inst.name, company, MOU_TITLES[m % MOU_TITLES.length],
          pick(FOCUS_AREAS),
          `2025-0${randInt(1, 9)}-${String(randInt(10, 28)).padStart(2, '0')}`,
          `2028-0${randInt(1, 9)}-${String(randInt(10, 28)).padStart(2, '0')}`,
          'Active', randInt(3, 9),
          JSON.stringify([
            `Establish joint research lab at ${inst.name}`,
            `${randInt(20, 60)} guaranteed paid internships per academic year`,
            'Curriculum modernization with industry advisory board',
            'Annual innovation hackathon sponsorship',
          ]),
        ]
      );
    }

    // ── Assessment history for the first 150 students ─────────────────────
    for (let a = 0; a < 150; a++) {
      const s = studentRows[a];
      const attempts = randInt(1, 3);
      let base = Math.max(30, s.readiness - 10);

      for (let attempt = 0; attempt < attempts; attempt++) {
        base = Math.min(96, base + randInt(2, 9));
        const pct = base;
        const cats = {
          fundamentals: Math.min(98, base + randInt(-12, 8)),
          backend_systems: Math.min(98, base + randInt(-10, 10)),
          frontend_web: Math.min(98, base + randInt(-8, 14)),
          cloud_devops: Math.max(20, Math.min(95, base + randInt(-20, 6))),
          ai_data: Math.max(25, Math.min(96, base + randInt(-15, 10))),
          soft_skills: Math.min(99, base + randInt(0, 15)),
        };

        await query(
          `INSERT INTO assessments (
            id, student_id, completed_at, total_score, max_score, percentage,
            category_scores, time_spent_seconds, performance_grade
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO NOTHING`,
          [
            `asm-gen-${s.id}-${attempt}`,
            s.id,
            `2026-0${randInt(6, 9)}-${String(randInt(10, 28)).padStart(2, '0')} 10:00:00+00`,
            Math.round(pct / 10), 10, pct,
            JSON.stringify(cats),
            randInt(420, 900),
            pct >= 85 ? 'Elite (Ready for Top Tier)' : pct >= 70 ? 'Proficient' : pct >= 50 ? 'Needs Bridging' : 'Foundational',
          ]
        );
      }
    }

    // ── Applications funnel across all 6 stages ───────────────────────────
    const STAGES = ['Applied', 'Under Review', 'Assessment Sent', 'Shortlisted', 'Interview Scheduled', 'Offer Extended'];
    for (let a = 0; a < 260; a++) {
      const student = pick(studentRows);
      const jobId = `job-gen-${String(randInt(1, 60)).padStart(3, '0')}`;
      const stageIdx = rand() < 0.45 ? 0 : rand() < 0.6 ? randInt(1, 3) : randInt(3, 5);
      const stage = STAGES[stageIdx];
      const match = randInt(55, 96);

      await query(
        `INSERT INTO applications (
          id, job_id, job_title, company, student_id, student_name, applied_date,
          status, ai_match_score, notes, stage_history
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING`,
        [
          `app-gen-${String(a + 1).padStart(4, '0')}`,
          jobId, pick(JOB_TITLES), pick(COMPANIES),
          student.id, student.name,
          `2026-0${randInt(6, 9)}-${String(randInt(10, 28)).padStart(2, '0')}`,
          stage, match,
          stage === 'Offer Extended' ? 'Offer released with joining bonus' : 'Pipeline progression logged by ATS',
          JSON.stringify([{ stage, date: `2026-0${randInt(6, 9)}-${String(randInt(10, 28)).padStart(2, '0')}`, note: 'Seeded pipeline event' }]),
        ]
      );
    }

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      ['SYSTEM_SETUP', 'LARGE_DATASET_SEEDED', JSON.stringify({
        students: TARGET_STUDENTS, jobs: JOB_COUNT, mous: 12,
        assessments: 150, applications: 260, at: new Date(),
      })]
    );

    await query('COMMIT');
    console.log(`🎉 [seed] Large dataset ready: ${TARGET_STUDENTS} students, ${JOB_COUNT} jobs, 12 MoUs, ~150 assessment histories, 260 applications.`);
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ [seed] Large dataset generation failed:', err);
    throw err;
  }
}
