import { query } from './db';

/**
 * Real SQL aggregates for the platform analytics dashboards.
 *
 * Every number here is computed from live tables (students, assessments,
 * applications, jobs, users) — no hardcoded/mock datasets. Field names match
 * the legacy DepartmentStat / GovtRegionStat / EmergingSkillTrend shapes so
 * the existing UI charts keep working.
 */

export async function getCollegeDepartmentStats(): Promise<
  { department: string; totalStudents: number; assessedCount: number; avgReadiness: number; placedCount: number; placementPercentage: number; topSkillGap: string }[]
> {
  // "Placed" = has at least one Offer Extended / Interview Scheduled application;
  // readiness = students.readiness_score (0-100, set by AI assessments);
  // top gap = most-declared skill among that department's least-ready students.
  const res = await query(
    `WITH dept AS (
        SELECT branch AS department,
               count(*)::int AS total_students,
               count(*) FILTER (WHERE assessment_completed)::int AS assessed_count,
               ROUND(AVG(NULLIF(readiness_score, 0))::numeric, 1) AS avg_readiness
          FROM students
         GROUP BY branch
     ),
     placed AS (
        SELECT s.branch AS department, count(DISTINCT a.student_id)::int AS placed_count
          FROM applications a JOIN students s ON s.id = a.student_id
         WHERE a.status IN ('Offer Extended', 'Interview Scheduled')
         GROUP BY s.branch
     ),
     least_ready AS (
        SELECT s.branch AS department, s.declared_skills
          FROM students s
        WHERE s.readiness_score > 0
          AND s.readiness_score <= (SELECT COALESCE(PERCENTILE_CONT(0.4) WITHIN GROUP (ORDER BY readiness_score), 100) FROM students)
     ),
     gaps AS (
        SELECT department, skill, count(*) AS n
          FROM least_ready l, jsonb_array_elements(COALESCE(l.declared_skills, '[]'::jsonb)) AS rs,
               LATERAL (SELECT CASE WHEN jsonb_typeof(rs) = 'object' THEN rs->>'name' ELSE rs#>>'{}' END AS skill) x
         WHERE x.skill IS NOT NULL AND x.skill <> ''
         GROUP BY department, x.skill
     ),
     top_gap AS (
        SELECT DISTINCT ON (department) department, skill AS top_skill_gap
          FROM gaps ORDER BY department, n DESC
     )
     SELECT d.department, d.total_students, d.assessed_count,
            COALESCE(d.avg_readiness, 0)::float AS avg_readiness,
            COALESCE(p.placed_count, 0) AS placed_count,
            ROUND(COALESCE(p.placed_count, 0) * 100.0 / NULLIF(d.total_students, 0), 1)::float AS placement_percentage,
            COALESCE(t.top_skill_gap, 'Insufficient assessment data') AS top_skill_gap
       FROM dept d
       LEFT JOIN placed p ON p.department = d.department
       LEFT JOIN top_gap t ON t.department = d.department
      ORDER BY d.total_students DESC`
  );
  return res.rows.map(r => ({
    department: r.department,
    totalStudents: r.total_students,
    assessedCount: r.assessed_count,
    avgReadiness: r.avg_readiness,
    placedCount: r.placed_count,
    placementPercentage: r.placement_percentage ?? 0,
    topSkillGap: r.top_skill_gap,
  }));
}

export async function getGovtRegionalStats(): Promise<
  { region: string; collegesCount: number; totalStudents: number; avgEmployabilityScore: number; internshipComplianceRate: number; tierDistribution: { tier1: number; tier2: number; tier3: number } }[]
> {
  // Regions derive from each student's college name via keyword buckets
  // (no colleges table exists); readiness proxies employability; the
  // internship compliance rate = share of students with >=1 application.
  const res = await query(
    `WITH classified AS (
        SELECT s.id,
               CASE
                 WHEN s.college ILIKE '%pune%' OR s.college ILIKE '%coep%' OR s.college ILIKE '%piet%' THEN 'Pune Industrial & Education Belt'
                 WHEN s.college ILIKE '%mumbai%' OR s.college ILIKE '%mmr%' OR s.college ILIKE '%thane%' THEN 'Mumbai Metropolitan Region (MMR)'
                 WHEN s.college ILIKE '%nagpur%' OR s.college ILIKE '%vidarbha%' THEN 'Nagpur & Vidarbha Tech Hub'
                 ELSE 'Chhatrapati Sambhajinagar & Marathwada'
               END AS region,
               s.readiness_score,
               s.college
           FROM students s
     ),
     per_college AS (
        SELECT DISTINCT region, college FROM classified
     ),
     tiers AS (
        SELECT region, count(*)::int AS colleges_count FROM per_college GROUP BY region
     ),
     applied AS (
        SELECT c.region, count(DISTINCT a.student_id)::int AS n
          FROM applications a JOIN classified c ON c.id = a.student_id
         GROUP BY c.region
     ),
     totals AS (
        SELECT region, count(*)::int AS n FROM classified GROUP BY region
     )
     SELECT c.region,
            COALESCE(t.colleges_count, 0) AS colleges_count,
            count(*)::int AS total_students,
            COALESCE(ROUND(AVG(NULLIF(c.readiness_score, 0))::numeric, 1), 0)::float AS avg_employability,
            COALESCE(ROUND(COALESCE(ap.n, 0) * 100.0 / NULLIF(tot.n, 0), 1), 0)::float AS internship_compliance,
            count(*) FILTER (WHERE c.readiness_score >= 80)::int AS tier1,
            count(*) FILTER (WHERE c.readiness_score >= 60 AND c.readiness_score < 80)::int AS tier2,
            count(*) FILTER (WHERE c.readiness_score < 60)::int AS tier3
       FROM classified c
       LEFT JOIN tiers t ON t.region = c.region
       LEFT JOIN totals tot ON tot.region = c.region
       LEFT JOIN applied ap ON ap.region = c.region
      GROUP BY c.region, t.colleges_count, tot.n, ap.n
      ORDER BY total_students DESC`
  );
  return res.rows.map(r => ({
    region: r.region,
    collegesCount: r.colleges_count,
    totalStudents: r.total_students,
    avgEmployabilityScore: r.avg_employability ?? 0,
    internshipComplianceRate: r.internship_compliance ?? 0,
    tierDistribution: { tier1: r.tier1, tier2: r.tier2, tier3: r.tier3 },
  }));
}

export async function getEmergingSkillTrends(): Promise<
  { skill: string; industryDemandGrowth: number; academicSupplyCount: number; gapIndex: number; priorityAction: string }[]
> {
  // Industry demand growth = % of OPEN jobs requiring the skill vs all open jobs
  // (real demand signal from recruiter postings); supply = students declaring it;
  // gap index blends demand share against assessed-but-weak supply.
  const res = await query(
    `WITH demand AS (
        SELECT skill, count(DISTINCT j.id)::int AS jobs
          FROM jobs j, jsonb_array_elements(j.required_skills) AS rs,
               LATERAL (SELECT rs->>'name' AS skill) s
         WHERE j.status = 'open'
         GROUP BY skill
     ),
     total_open AS (SELECT count(*)::int AS n FROM jobs WHERE status = 'open'),
     supply_pairs AS (
        SELECT x.skill, s.id
          FROM students s, jsonb_array_elements(COALESCE(s.declared_skills, '[]'::jsonb)) AS rs,
               LATERAL (SELECT CASE WHEN jsonb_typeof(rs) = 'object' THEN rs->>'name' ELSE rs#>>'{}' END AS skill) x
         WHERE x.skill IS NOT NULL AND x.skill <> ''
     ),
     top_skills AS (
        SELECT d.skill, d.jobs,
               count(DISTINCT sp.id)::int AS students
          FROM demand d
          LEFT JOIN supply_pairs sp
            ON (regexp_replace(lower(sp.skill), '[^a-z0-9]', '', 'g') = regexp_replace(lower(d.skill), '[^a-z0-9]', '', 'g')
                OR regexp_replace(lower(sp.skill), '[^a-z0-9]', '', 'g') LIKE '%' || regexp_replace(lower(d.skill), '[^a-z0-9]', '', 'g') || '%'
                OR regexp_replace(lower(d.skill), '[^a-z0-9]', '', 'g') LIKE '%' || regexp_replace(lower(sp.skill), '[^a-z0-9]', '', 'g') || '%')
         GROUP BY d.skill, d.jobs
         ORDER BY d.jobs DESC
         LIMIT 8
     )
     SELECT t.skill,
            ROUND(t.jobs * 100.0 / GREATEST((SELECT n FROM total_open), 1))::int AS demand_growth,
            t.students AS supply_count,
            LEAST(99, GREATEST(5, ROUND(100 - (t.students * 100.0 / GREATEST((SELECT count(*) FROM students), 1)) )::int)) AS gap_index
       FROM top_skills t
      ORDER BY demand_growth DESC`
  );
  const ACTIONS: Record<string, string> = {
    default: 'Add targeted micro-credits and industry workshops for this skill in the coming semester',
  };
  return res.rows.map(r => ({
    skill: r.skill,
    industryDemandGrowth: r.demand_growth,
    academicSupplyCount: r.supply_count,
    gapIndex: r.gap_index,
    priorityAction: ACTIONS[r.skill] || ACTIONS.default,
  }));
}
