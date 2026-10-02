import { query } from './db';

/**
 * Data provenance for seeded/synthetic rows.
 *
 * The demo seeders insert rows with well-known id prefixes. Analytics and
 * dashboards use these helpers to COUNT them (transparent labelling) and,
 * on request, EXCLUDE them so "real activity" numbers can be read on their
 * own. Nothing is deleted — the flag is purely opt-in filtering.
 */

// id prefixes owned by demo seeders:
//   server/seed.ts        → std-2024-*, usr-seed-*, job-01..job-14, mou-01..03, app-01..*
//   server/seedGenerator  → std-gen-*, job-gen-*, mou-gen-*, app-gen-*
export const SYNTHETIC_PREFIXES = [
  'std-gen-%',
  'job-gen-%',
  'mou-gen-%',
  'app-gen-%',
  'std-2024-%',
  'usr-seed-%',
  'job-__',
  'mou-__',
  'app-__',
] as const;

/** SQL fragment that is TRUE when <alias>.id is NOT a synthetic row. */
export function realRowsOnly(alias: string): string {
  return SYNTHETIC_PREFIXES.map(p => `${alias}.id NOT LIKE '${p}'`).join(' AND ');
}

export interface SyntheticCounts {
  students: number;
  jobs: number;
  applications: number;
  mous: number;
}

/** Counts of synthetic rows per table (0s when tables are empty/absent). */
import { ASSESSMENT_QUESTIONS } from '../src/data/mockData';

export async function getSyntheticCounts(): Promise<SyntheticCounts> {
  const like = SYNTHETIC_PREFIXES.map(p => `id LIKE '${p}'`).join(' OR ');
  const res = await query(`
    SELECT
      (SELECT count(*)::int FROM students WHERE ${like}) AS students,
      (SELECT count(*)::int FROM jobs WHERE ${like}) AS jobs,
      (SELECT count(*)::int FROM applications WHERE ${like}) AS applications,
      (SELECT count(*)::int FROM mous WHERE ${like}) AS mous
  `).catch(() => ({ rows: [{ students: 0, jobs: 0, applications: 0, mous: 0 }] }));
  const r: any = res.rows[0] || {};
  return {
    students: r.students || 0,
    jobs: r.jobs || 0,
    applications: r.applications || 0,
    mous: r.mous || 0,
  };
}
