/**
 * E2E verification of the registration flow (run: node scripts/verify-registration.mjs)
 * 1. request OTP  2. verify OTP (uses dev-fallback OTP when SMTP is down)
 * 3. complete registration  4. assert rows exist in users + students + audit_logs
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const API = 'http://localhost:5000/api';
// Optional CLI overrides: node scripts/verify-registration.mjs [email] [name] [password]
const EMAIL = process.argv[2] || `verify.bug.${Date.now().toString(36)}@spark.dev`;
const NAME = process.argv[3] || 'Verify Bug';
const PASSWORD = process.argv[4] || 'TestPass@2026';

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'avishkar_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

async function main() {
  console.log(`▶ Registering ${EMAIL} …`);

  // 1. Request OTP
  const sendRes = await fetch(`${API}/auth/register-send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, name: NAME }),
  });
  const sendData = await sendRes.json();
  if (!sendRes.ok) throw new Error(`send-otp failed: ${sendData.error}`);
  console.log(`   OTP dispatched: ${sendData.message}`);

  // Resolve the OTP — dev fallback response or the database row
  let otp = sendData.devOtp;
  if (!otp) {
    const dbRes = await pool.query(
      'SELECT otp FROM otp_verifications WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1',
      [EMAIL]
    );
    otp = dbRes.rows[0]?.otp;
  }
  if (!otp) throw new Error('Could not resolve OTP from response or database');
  console.log(`   OTP resolved: ${otp}`);

  // 2. Verify OTP
  const verifyRes = await fetch(`${API}/auth/register-verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, otp }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(`verify-otp failed: ${verifyData.error}`);
  console.log(`   OTP verified: ${verifyData.message}`);

  // 3. Complete registration
  const regRes = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'student',
      name: NAME,
      email: EMAIL,
      password: PASSWORD,
      college: 'COEP Technological University',
      degree: 'B.Tech',
      branch: 'Computer Science & Engineering',
      semester: 5,
      cgpa: 8.4,
      graduationYear: 2027,
      targetRole: 'Full Stack Cloud Engineer',
      bio: 'E2E verification account.',
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`register failed: ${regData.error}`);
  console.log(`   Registered: user=${regData.user.id} student=${regData.student?.id}`);

  // 4. Assert DB persistence
  const user = await pool.query(
    'SELECT id, name, email, role, (password_hash IS NOT NULL) AS has_hash FROM users WHERE LOWER(email) = $1',
    [EMAIL]
  );
  const student = await pool.query(
    'SELECT id, user_id, name, email, college, semester, cgpa::float AS cgpa, graduation_year FROM students WHERE LOWER(email) = $1',
    [EMAIL]
  );
  const audit = await pool.query(
    "SELECT action FROM audit_logs WHERE details->>'email' = $1 AND action = 'USER_REGISTERED'",
    [EMAIL]
  );

  console.log('\n═══ DATABASE VERIFICATION ═══');
  console.log('users row:        ', user.rows.length > 0 ? '✅' : '❌', JSON.stringify(user.rows[0] || null));
  console.log('students row:     ', student.rows.length > 0 ? '✅' : '❌', JSON.stringify(student.rows[0] || null));
  console.log('audit_logs entry: ', audit.rows.length > 0 ? '✅' : '❌', audit.rows.map(r => r.action).join(', '));

  // 5. Bonus: password round-trip works (login with the new account)
  const loginRes = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginData = await loginRes.json();
  console.log('login round-trip: ', loginRes.ok ? '✅ JWT issued' : '❌', loginRes.ok ? `(role: ${loginData.user.role})` : loginData.error);

  const ok = user.rows.length === 1 && student.rows.length === 1 && audit.rows.length >= 1 && loginRes.ok;
  console.log(ok ? '\n🎉 REGISTRATION PERSISTS TO POSTGRESQL — BUG FIXED' : '\n💥 VERIFICATION FAILED');
  process.exit(ok ? 0 : 1);
}

main()
  .catch((e) => {
    console.error('\n💥 VERIFICATION FAILED:', e.message);
    process.exit(1);
  })
  .finally(() => pool.end());
