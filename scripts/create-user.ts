/**
 * Dev utility: create or update a demo user with a real bcrypt password hash.
 *
 *   npx tsx scripts/create-user.ts <email> <password> [role] [name]
 *
 * Defaults to the student demo account used by the visual smoke tests.
 */
import { query, pool } from '../server/db';
import { hashPassword } from '../server/auth';

const VALID_ROLES = ['student', 'college', 'industry', 'government', 'alumni'] as const;

async function main() {
  const [emailArg, passwordArg, roleArg, nameArg] = process.argv.slice(2);
  const email = (emailArg || 'anish.k@student.edu').trim().toLowerCase();
  const password = passwordArg || 'Demo@2026';
  const role = (roleArg && (VALID_ROLES as readonly string[]).includes(roleArg) ? roleArg : 'student');
  const name = nameArg || email.split('@')[0].replace(/[._]/g, ' ');

  const hash = await hashPassword(password);
  await query(
    `INSERT INTO users (id, email, password_hash, role, name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3, role = $4, name = $5`,
    [`u-${role}-${email.split('@')[0].slice(0, 24)}`, email, hash, role, name]
  );
  console.log(`✅ User ready: ${email} / ${password} (role: ${role})`);
}

main()
  .catch((e) => { console.error('❌', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
