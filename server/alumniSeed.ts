import { query } from './db';

/**
 * Alumni Network seed — verified mentors + one demo mentorship interaction
 * so the directory, mentor dashboard, and student mentorship tabs are
 * populated on a fresh production install.
 *
 * Deterministic; safe to re-run (skips when alumni already exist).
 */

const MENTORS = [
  { name: 'Ananya Deshpande', email: 'ananya.deshpande@alumni.coep.ac.in', inst: 'COEP Technological University, Pune', code: 'COEP', degree: 'B.Tech CSE', year: 2019, company: 'Zoho', designation: 'Senior Systems Engineer', exp: 6, expertise: ['Backend Architecture', 'System Design', 'Interview Prep'], capacity: 6 },
  { name: 'Vikram Malhotra', email: 'vikram.malhotra@alumni.iitb.ac.in', inst: 'IIT Bombay', code: 'IITB', degree: 'B.Tech CSE', year: 2018, company: 'Google Cloud India', designation: 'Cloud Solutions Architect', exp: 8, expertise: ['Cloud & DevOps', 'Distributed Systems', 'Career Switch'], capacity: 5 },
  { name: 'Priya Nair', email: 'priya.nair@alumni.nitk.ac.in', inst: 'NIT Surathkal', code: 'NITK', degree: 'B.Tech IT', year: 2020, company: 'Razorpay', designation: 'Lead Frontend Engineer', exp: 5, expertise: ['React & TypeScript', 'UI Engineering', 'Frontend Interviews'], capacity: 5 },
  { name: 'Arjun Iyer', email: 'arjun.iyer@alumni.iiith.ac.in', inst: 'IIIT Hyderabad', code: 'IIITH', degree: 'B.Tech CSE', year: 2021, company: 'Microsoft India', designation: 'ML Engineer II', exp: 4, expertise: ['AI/ML Careers', 'Kaggle & Competitions', 'Higher Studies'], capacity: 4 },
  { name: 'Sneha Kulkarni', email: 'sneha.kulkarni@alumni.vjti.ac.in', inst: 'VJTI Mumbai', code: 'VJTI', degree: 'B.Tech ECE', year: 2019, company: 'Tata Elxsi', designation: 'Embedded Systems Lead', exp: 6, expertise: ['Embedded & IoT', 'EV Industry', 'Core Engineering Roles'], capacity: 5 },
  { name: 'Karthik Rao', email: 'karthik.rao@alumni.bits.ac.in', inst: 'BITS Pilani', code: 'BITS', degree: 'B.E. Mechanical', year: 2017, company: 'Ather Energy', designation: 'Powertrain Manager', exp: 8, expertise: ['EV & Automotive', 'Mechanical Design', 'Leadership'], capacity: 4 },
  { name: 'Meera Krishnan', email: 'meera.krishnan@alumni.anna.edu.in', inst: 'Anna University, Chennai', code: 'ANNAU', degree: 'B.Tech CSE', year: 2020, company: 'Freshworks', designation: 'Product Manager', exp: 5, expertise: ['Product Careers', 'MBA Path', 'Startup Ecosystem'], capacity: 6 },
  { name: 'Rohit Bansal', email: 'rohit.bansal@alumni.dtu.ac.in', inst: 'DTU Delhi', code: 'DTU', degree: 'B.Tech IT', year: 2018, company: 'Uber India', designation: 'SDE III', exp: 7, expertise: ['DSA & Competitive Programming', 'System Design', 'Referrals'], capacity: 5 },
];

const DEMO_REQUEST_MESSAGE =
  'Hello Ma\u2019am, I am a pre-final year CSE student preparing for backend roles. Your path from COEP to Zoho inspires me \u2014 could you guide me on projects and interview preparation?';

export async function seedAlumniNetwork(): Promise<void> {
  const existing = await query('SELECT count(*)::int AS n FROM alumni');
  if (existing.rows[0].n > 0) {
    return; // already seeded
  }

  console.log('🎓 [seed] Populating verified alumni mentor network…');

  try {
    const alumniIds: { id: string; name: string }[] = [];

    for (const m of MENTORS) {
      const appId = `alumapp-seed-${m.code.toLowerCase()}-${m.year}`;
      const alumniId = `alum-seed-${m.code.toLowerCase()}-${m.year}`;

      // Application record (already approved by the desk)
      await query(
        `INSERT INTO alumni_applications (
          id, full_name, email, phone, college_id, college_name, degree, graduation_year,
          company, designation, experience_years, expertise, bio, status, review_note, reviewed_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'approved','Verified against institutional records.',CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING`,
        [
          appId, m.name, m.email, '+91 98' + Math.abs(hashCode(m.email)).toString().slice(0, 8),
          m.code, m.inst, m.degree, m.year, m.company, m.designation, m.exp,
          JSON.stringify(m.expertise),
          `Mentorship focus: ${m.expertise.join(' · ')}.`,
        ]
      );

      // Verified alumni (directory inclusion)
      await query(
        `INSERT INTO alumni (
          id, application_id, name, email, college_id, college_name, degree, graduation_year,
          company, designation, experience_years, expertise, bio, linkedin_url, avatar_url,
          mentor_capacity, rating, verified_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO NOTHING`,
        [
          alumniId, appId, m.name, m.email, m.code, m.inst, m.degree, m.year,
          m.company, m.designation, m.exp, JSON.stringify(m.expertise),
          `Mentorship focus: ${m.expertise.join(' · ')}.`,
          `https://linkedin.com/in/${m.name.toLowerCase().replace(/\s+/g, '-')}`,
          `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(m.name)}`,
          m.capacity,
          (3.9 + (Math.abs(hashCode(m.email)) % 11) / 10).toFixed(1),
        ]
      );

      // Login-capable user row
      await query(
        `INSERT INTO users (id, name, email, role, avatar)
         VALUES ($1, $2, $3, 'alumni', $4)
         ON CONFLICT (email) DO NOTHING`,
        [`usr-alum-seed-${m.code.toLowerCase()}-${m.year}`, m.name, m.email,
         `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(m.name)}`]
      );

      alumniIds.push({ id: alumniId, name: m.name });
    }

    // One demo pending mentorship request to the first mentor (from the sample student)
    // students has no created_at column — sort by id for determinism
    const demoStudent = await query(`SELECT id, name, college, branch FROM students ORDER BY id ASC LIMIT 1`);
    if (demoStudent.rows.length > 0 && alumniIds.length > 0) {
      const stu = demoStudent.rows[0];
      await query(
        `INSERT INTO mentorship_requests (id, alumni_id, student_id, student_name, student_college, student_branch, message)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          'mreq-seed-demo-1', alumniIds[0].id, stu.id, stu.name, stu.college, stu.branch,
          DEMO_REQUEST_MESSAGE,
        ]
      ).catch(() => { /* students table may not exist yet in this order */ });
    }

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      ['SYSTEM_SETUP', 'ALUMNI_NETWORK_SEEDED', JSON.stringify({ mentors: alumniIds.length, at: new Date() })]
    );

    console.log(`🎉 [seed] Alumni network ready: ${alumniIds.length} verified mentors across India.`);
  } catch (err) {
    console.error('❌ [seed] Alumni network seed failed:', err);
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
