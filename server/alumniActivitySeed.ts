import { query } from './db';

/**
 * Alumni activity seed — fills the tables the base seeders never touch:
 *   mentorship_rooms, mentorship_messages, fast_track_jobs
 *
 * Idempotent: each demo row is keyed by a deterministic id and skipped when
 * already present, so this is safe to run on every boot (fresh or existing DB).
 * Depends on alumni + students rows existing (created by alumniSeed / demo-seed).
 */

const DEMO_ROOM = 'mroom-seed-demo-1';
const DEMO_REQUEST = 'mreq-seed-demo-1';

const MENTOR_WELCOME =
  'Hi! Great to connect. I reviewed your profile — solid CGPA and you have already picked up React. ' +
  'For backend roles, let us build a plan around Node fundamentals, databases and system design basics.';

const STUDENT_REPLY =
  'Thank you Ma\u2019am! That matches what I was struggling with — I know some Express but nothing about ' +
  'scaling or caching. Where should I start this month?';

const MENTOR_FOLLOWUP =
  'Start with a small URL-shortener service: Postgres for storage, Redis for cache, and write 5 integration ' +
  'tests. Ship it on Render with a README that explains your design trade-offs. We will review it together next week.';

const FAST_TRACK = {
  id: 'ftj-seed-demo-1',
  title: 'Backend Engineer Intern (Node.js + Postgres)',
  company: 'Zoho',
  type: 'Internship',
  stipend: '₹35,000/month',
  location: 'Chennai (Hybrid)',
  description:
    'Fast-tracked opening shared directly by a verified S.P.A.R.K. mentor. Work on production APIs serving ' +
    'millions of requests/day, own a feature end-to-end, and pair with senior engineers. Strong candidates ' +
    'receive pre-placement offers.',
  expiryDays: 21,
};

export async function seedAlumniActivity(): Promise<void> {
  try {
    // Locate the demo mentorship request created by alumniSeed / demo-seed.
    // Re-create it idempotently if the students table was reseeded meanwhile.
    const reqRes = await query(`SELECT id, alumni_id, student_id FROM mentorship_requests WHERE id = $1`, [DEMO_REQUEST]);

    let requestId = reqRes.rows[0]?.id as string | undefined;
    let alumniId = reqRes.rows[0]?.alumni_id as string | undefined;

    if (!requestId) {
      const firstAlumni = await query(`SELECT id FROM alumni ORDER BY verified_at ASC LIMIT 1`);
      // students has no created_at column — sort by id for determinism
      const firstStudent = await query(`SELECT id, name, college, branch FROM students ORDER BY id ASC LIMIT 1`);
      if (firstAlumni.rows.length === 0 || firstStudent.rows.length === 0) {
        return; // prerequisites not present yet — nothing to seed
      }
      alumniId = firstAlumni.rows[0].id;
      const stu = firstStudent.rows[0];
      await query(
        `INSERT INTO mentorship_requests (id, alumni_id, student_id, student_name, student_college, student_branch, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [DEMO_REQUEST, alumniId, stu.id, stu.name, stu.college, stu.branch,
         'Hello Ma\u2019am, I am a pre-final year CSE student preparing for backend roles. Could you guide me on projects and interview preparation?']
      );
      requestId = DEMO_REQUEST;
    }

    if (!alumniId) return;

    // 1. Accepted request + mentorship room (skip if the room already exists)
    await query(
      `UPDATE mentorship_requests SET status = 'accepted' WHERE id = $1 AND status = 'pending'`,
      [requestId]
    );
    const roomExists = await query(`SELECT 1 FROM mentorship_rooms WHERE id = $1`, [DEMO_ROOM]);
    if (roomExists.rows.length === 0) {
      await query(
        `INSERT INTO mentorship_rooms (id, alumni_id, student_id, request_id)
         VALUES ($1, $2, (SELECT student_id FROM mentorship_requests WHERE id = $3), $3)
         ON CONFLICT (id) DO NOTHING`,
        [DEMO_ROOM, alumniId, requestId]
      );
      await query(
        `UPDATE mentorship_requests SET room_id = $1 WHERE id = $2 AND (room_id IS NULL OR room_id <> $1)`,
        [DEMO_ROOM, requestId]
      );

      const studentNameRes = await query(
        `SELECT student_name FROM mentorship_requests WHERE id = $1`,
        [requestId]
      );
      const studentName = studentNameRes.rows[0]?.student_name || 'Student';

      // 2. Three-turn conversation so the chat view reads naturally
      const messages: { role: 'mentor' | 'student'; name: string; body: string }[] = [
        { role: 'mentor', name: 'Ananya Deshpande', body: MENTOR_WELCOME },
        { role: 'student', name: studentName, body: STUDENT_REPLY },
        { role: 'mentor', name: 'Ananya Deshpande', body: MENTOR_FOLLOWUP },
      ];
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        await query(
          `INSERT INTO mentorship_messages (id, room_id, sender_role, sender_name, body, at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP - ($6 || ' minutes')::interval)
           ON CONFLICT (id) DO NOTHING`,
          [`mmsg-seed-demo-${i + 1}`, DEMO_ROOM, m.role, m.name, m.body, String((messages.length - i) * 45)]
        );
      }
    }

    // 3. One fast-tracked opportunity from the same mentor
    const mentorRow = await query(`SELECT name FROM alumni WHERE id = $1`, [alumniId]);
    await query(
      `INSERT INTO fast_track_jobs (id, alumni_id, alumni_name, title, company, type, stipend_or_salary, location, description, expiry_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [FAST_TRACK.id, alumniId, mentorRow.rows[0]?.name || 'S.P.A.R.K. Mentor', FAST_TRACK.title, FAST_TRACK.company, FAST_TRACK.type,
       FAST_TRACK.stipend, FAST_TRACK.location, FAST_TRACK.description, FAST_TRACK.expiryDays]
    );

    console.log('🤝 [seed] Alumni activity ready (demo mentorship room + fast-track opportunity).');
  } catch (err: any) {
    console.error('❌ [seed] Alumni activity seed failed:', err?.message || err);
  }
}
