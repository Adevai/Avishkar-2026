import { query } from './db';

/**
 * Multi-source India job aggregator with a graceful fallback chain.
 *
 * Priority order (first successful source wins, others skipped):
 *   1. Adzuna India API          — free app_id/app_key, structured JSON
 *   2. SerpAPI Google Jobs       — paid key, high-quality structured listings
 *   3. LinkedIn guest search     — free scrape, no key, best-effort
 *   4. Seeded/curated DB jobs    — always available last resort
 *
 * All sources normalize into the shared JobOpportunity shape used by the
 * frontend matcher, so the rest of the app never knows which source won.
 */

export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  type: 'Internship' | 'Full-Time';
  stipendOrSalary: string;
  duration?: string;
  openings: number;
  postedDate: string;
  deadline: string;
  description: string;
  requiredSkills: { name: string; weight: number; minScore: number }[];
  minCgpa: number;
  eligibleBranches: string[];
  sourcePlatform: 'LinkedIn' | 'Adzuna' | 'Google Jobs' | 'Campus Direct';
  workplaceType: 'On-site' | 'Hybrid' | 'Remote';
  experienceLevel: string;
  externalUrl?: string;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function timeoutFetch(url: string, opts: RequestInit = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(t));
}

/** Map arbitrary job titles to S.P.A.R.K. competency weights for the matcher. */
function inferSkills(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  if (/data|analyst|analytics|ml|machine learning|ai\b/.test(text)) {
    return [
      { name: 'Data Preprocessing & Math', weight: 0.4, minScore: 65 },
      { name: 'Relational Databases (SQL)', weight: 0.35, minScore: 65 },
      { name: 'Professional Communication', weight: 0.25, minScore: 65 },
    ];
  }
  if (/cloud|devops|sre|kubernetes|docker|platform/.test(text)) {
    return [
      { name: 'Cloud & Docker', weight: 0.4, minScore: 65 },
      { name: 'CI/CD & Kubernetes', weight: 0.35, minScore: 60 },
      { name: 'Backend & REST APIs', weight: 0.25, minScore: 65 },
    ];
  }
  if (/embedded|firmware|iot|vlsi|rtl/.test(text)) {
    return [
      { name: 'Microcontroller Architecture', weight: 0.4, minScore: 70 },
      { name: 'RTOS & Embedded C', weight: 0.35, minScore: 70 },
      { name: 'IoT Protocols (MQTT/CoAP)', weight: 0.25, minScore: 60 },
    ];
  }
  return [
    { name: 'Backend & REST APIs', weight: 0.35, minScore: 65 },
    { name: 'Frontend Web (React/TS)', weight: 0.3, minScore: 65 },
    { name: 'Data Structures & Algorithms', weight: 0.35, minScore: 70 },
  ];
}

function parseLpa(text: string): { low: number; high: number; isMonthly: boolean } | null {
  if (!text) return null;
  const isMonthly = /month|per month|\/mo|k\/month/i.test(text);
  const nums = (text.match(/\d[\d,.]*(?:\.\d+)?/g) || [])
    .map(n => parseFloat(n.replace(/,/g, '')))
    .filter(n => !isNaN(n) && n > 0);
  if (!nums.length) return null;
  return { low: Math.min(...nums), high: Math.max(...nums), isMonthly };
}

function formatSalary(text: string): string {
  const parsed = parseLpa(text);
  if (!parsed) return '₹As per industry standards';
  if (parsed.isMonthly) {
    return `₹${parsed.low.toLocaleString('en-IN')} - ${parsed.high.toLocaleString('en-IN')} / month`;
  }
  // Adzuna returns absolute annual figures — normalize to LPA display
  let low = parsed.low, high = parsed.high;
  if (high > 1000) { low = Math.round((low / 100000) * 10) / 10; high = Math.round((high / 100000) * 10) / 10; }
  return `₹${low.toFixed(1)} - ${high.toFixed(1)} LPA`;
}

function inferType(title: string): 'Internship' | 'Full-Time' {
  return /intern|trainee|graduate trainee|co-op/i.test(title) ? 'Internship' : 'Full-Time';
}

function workplaceOf(location: string, description: string): 'On-site' | 'Hybrid' | 'Remote' {
  const text = `${location} ${description}`.toLowerCase();
  if (/remote|work from home|wfh/.test(text)) return 'Remote';
  if (/hybrid/.test(text)) return 'Hybrid';
  return 'On-site';
}

// ── Source 1: Adzuna India ───────────────────────────────────────────────────
export async function fetchAdzunaIndia(keywords: string, location: string, maxResults = 12): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY not configured');

  const where = location && !/india/i.test(location) ? `${location}, India` : 'India';
  const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}` +
    `&results_per_page=${maxResults}&what=${encodeURIComponent(keywords)}&where=${encodeURIComponent(where)}` +
    `&content-type=application/json`;

  const res = await timeoutFetch(url);
  if (!res.ok) throw new Error(`Adzuna returned ${res.status}`);
  const data: any = await res.json();

  const jobs: NormalizedJob[] = (data.results || []).map((r: any, idx: number) => {
    const salaryText = r.salary_min || r.salary_max
      ? `₹${r.salary_min || r.salary_max} - ${r.salary_max || r.salary_min}`
      : '';
    return {
      id: `adz-${Date.now().toString(36)}-${idx}`,
      title: r.title?.replace(/<[^>]+>/g, '').trim() || 'Software Engineer',
      company: r.company?.display_name || 'Technology Company',
      location: r.location?.display_name || where,
      type: inferType(r.title || ''),
      stipendOrSalary: formatSalary(salaryText),
      openings: 1,
      postedDate: r.created ? r.created.split('T')[0] : new Date().toISOString().split('T')[0],
      deadline: 'Active on Adzuna',
      description: (r.description || `Live opening at ${r.company?.display_name || 'a technology company'} in ${where}.`).slice(0, 400),
      requiredSkills: inferSkills(r.title || '', r.description || ''),
      minCgpa: 6.5,
      eligibleBranches: ['Computer Science & Engineering', 'Information Technology', 'Electronics & Telecommunication', 'AI & Data Science'],
      sourcePlatform: 'Adzuna',
      workplaceType: workplaceOf(r.location?.display_name || '', r.description || ''),
      experienceLevel: inferType(r.title || '') === 'Internship' ? 'Internship' : 'Entry Level (0-2 yrs)',
      externalUrl: r.redirect_url,
    };
  });

  if (!jobs.length) throw new Error('Adzuna returned zero results');
  return jobs;
}

// ── Source 2: SerpAPI Google Jobs (India) ────────────────────────────────────
export async function fetchGoogleJobsIndia(keywords: string, location: string, maxResults = 12): Promise<NormalizedJob[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY not configured');

  const q = `${keywords} jobs in ${/india/i.test(location) ? 'India' : location}, India`;
  const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(q)}` +
    `&gl=in&hl=en&api_key=${apiKey}`;

  const res = await timeoutFetch(url, {}, 12000);
  if (!res.ok) throw new Error(`SerpAPI returned ${res.status}`);
  const data: any = await res.json();

  const jobs: NormalizedJob[] = (data.jobs_results || []).slice(0, maxResults).map((r: any, idx: number) => {
    const det = r.detected_extensions || {};
    const salary = det.salary || '';
    return {
      id: `gjobs-${Date.now().toString(36)}-${idx}`,
      title: r.title || 'Software Engineer',
      company: r.company_name || 'Technology Company',
      location: r.location || 'India',
      type: inferType(r.title || ''),
      stipendOrSalary: salary ? formatSalary(salary) : '₹As per industry standards',
      openings: 1,
      postedDate: det.posted_at ? new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deadline: det.posted_at ? `Posted ${det.posted_at}` : 'Active on Google Jobs',
      description: (r.description || `Live opening at ${r.company_name || 'a technology company'} via Google Jobs.`).slice(0, 400),
      requiredSkills: inferSkills(r.title || '', r.description || ''),
      minCgpa: 6.5,
      eligibleBranches: ['Computer Science & Engineering', 'Information Technology', 'Electronics & Telecommunication', 'AI & Data Science'],
      sourcePlatform: 'Google Jobs',
      workplaceType: (det.work_from_home ? 'Remote' : 'On-site') as NormalizedJob['workplaceType'],
      experienceLevel: inferType(r.title || '') === 'Internship' ? 'Internship' : 'Entry Level (0-2 yrs)',
      externalUrl: r.job_id ? `https://www.google.com/search?q=${encodeURIComponent(r.title + ' ' + r.company_name + ' job')}&ibp=htl;jobs` : undefined,
    };
  });

  if (!jobs.length) throw new Error('SerpAPI returned zero results');
  return jobs;
}

// ── Source 3: LinkedIn guest search (no key, best-effort) ────────────────────
export async function fetchLinkedInIndia(keywords: string, location: string, maxResults = 10): Promise<NormalizedJob[]> {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location || 'India')}&f_TPR=r2592000`;
  const res = await timeoutFetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8' },
  }, 10000);
  if (!res.ok) throw new Error(`LinkedIn returned ${res.status}`);
  const html = await res.text();

  const cards = html.match(/<div class="base-card[^"]*job-search-card[\s\S]*?<\/li>/g) || [];
  const jobs: NormalizedJob[] = cards.slice(0, maxResults).map((card, idx) => {
    const titleM = card.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
    const compM = card.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
    const locM = card.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
    const linkM = card.match(/href="(https:\/\/[^"?]+)/);
    const title = titleM ? titleM[1].trim() : 'Software Engineering Professional';
    const company = compM ? compM[1].replace(/<[^>]+>/g, '').trim() : 'Technology Partner';
    const isIntern = inferType(title) === 'Internship';

    return {
      id: `li-${Date.now().toString(36)}-${idx}`,
      title,
      company,
      location: locM ? locM[1].trim() : (location || 'India'),
      type: isIntern ? 'Internship' : 'Full-Time',
      stipendOrSalary: isIntern ? '₹30,000 - 60,000 / month' : '₹6.0 - 18.0 LPA',
      openings: Math.floor(Math.random() * 6) + 2,
      postedDate: new Date().toISOString().split('T')[0],
      deadline: 'Active on LinkedIn',
      description: `Live opening at ${company} (${locM ? locM[1].trim() : location || 'India'}), synced from LinkedIn.`,
      requiredSkills: inferSkills(title, ''),
      minCgpa: 6.5,
      eligibleBranches: ['Computer Science & Engineering', 'Information Technology', 'Electronics & Telecommunication'],
      sourcePlatform: 'LinkedIn',
      workplaceType: workplaceOf(locM ? locM[1] : '', ''),
      experienceLevel: isIntern ? 'Internship' : 'Entry Level (0-2 yrs)',
      externalUrl: linkM ? linkM[1] : undefined,
    };
  });

  if (!jobs.length) throw new Error('LinkedIn returned zero results');
  return jobs;
}

// ── Fallback chain executor ──────────────────────────────────────────────────
export interface AggregatedResult {
  jobs: NormalizedJob[];
  source: string;
  attempts: { source: string; ok: boolean; count?: number; error?: string }[];
  storedCount: number;   // new rows persisted this run
  refreshedCount: number; // existing rows whose fetched_at was bumped
}

const STALE_AFTER_DAYS = 21;

/**
 * Persist aggregated jobs with source attribution + freshness timestamps.
 * - Same company+title already stored from the SAME source → bump fetched_at only.
 * - New listing → insert with source_platform, external_url, fetched_at = now.
 * - Listings not seen for STALE_AFTER_DAYS are pruned so the board stays fresh.
 */
async function persistJobs(jobs: NormalizedJob[]): Promise<{ storedCount: number; refreshedCount: number }> {
  let storedCount = 0;
  let refreshedCount = 0;

  for (const job of jobs) {
    const existing = await query(
      `SELECT id FROM jobs WHERE LOWER(company) = LOWER($1) AND LOWER(title) = LOWER($2) LIMIT 1`,
      [job.company, job.title]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE jobs SET fetched_at = CURRENT_TIMESTAMP, source_platform = $1,
            external_url = COALESCE($2, external_url)
         WHERE id = $3`,
        [job.sourcePlatform, job.externalUrl || null, existing.rows[0].id]
      );
      refreshedCount++;
    } else {
      await query(
        `INSERT INTO jobs (
          id, title, company, location, type, stipend_or_salary, duration,
          openings, posted_date, deadline, description, required_skills,
          min_cgpa, eligible_branches, source_platform, external_url, fetched_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING`,
        [
          job.id, job.title, job.company, job.location, job.type,
          job.stipendOrSalary, job.duration || null, job.openings,
          job.postedDate, job.deadline, job.description,
          JSON.stringify(job.requiredSkills), job.minCgpa,
          JSON.stringify(job.eligibleBranches), job.sourcePlatform,
          job.externalUrl || null,
        ]
      );
      storedCount++;
    }
  }

  // Prune stale synced listings (curated/Campus Direct rows are never auto-pruned)
  await query(
    `DELETE FROM jobs
     WHERE source_platform IN ('Adzuna', 'Google Jobs', 'LinkedIn')
       AND fetched_at < CURRENT_TIMESTAMP - INTERVAL '${STALE_AFTER_DAYS} days'`
  );

  return { storedCount, refreshedCount };
}

export async function aggregateJobs(keywords: string, location = 'India'): Promise<AggregatedResult> {
  const attempts: AggregatedResult['attempts'] = [];

  const chain: { name: string; fn: () => Promise<NormalizedJob[]> }[] = [
    { name: 'Adzuna India', fn: () => fetchAdzunaIndia(keywords, location) },
    { name: 'Google Jobs (SerpAPI)', fn: () => fetchGoogleJobsIndia(keywords, location) },
    { name: 'LinkedIn guest search', fn: () => fetchLinkedInIndia(keywords, location) },
  ];

  for (const link of chain) {
    try {
      const jobs = await link.fn();
      attempts.push({ source: link.name, ok: true, count: jobs.length });
      let storedCount = 0, refreshedCount = 0;
      try {
        ({ storedCount, refreshedCount } = await persistJobs(jobs));
      } catch (persistErr: any) {
        console.warn('[jobAggregator] persistence failed:', persistErr.message);
      }
      return { jobs, source: link.name, attempts, storedCount, refreshedCount };
    } catch (err: any) {
      attempts.push({ source: link.name, ok: false, error: err.message });
    }
  }

  // All external sources failed — last resort: freshest curated jobs from DB
  try {
    const dbRes = await query(`SELECT * FROM jobs WHERE deadline ILIKE '%active%' OR deadline >= CURRENT_DATE ORDER BY posted_date DESC LIMIT 10`);
    const jobs: NormalizedJob[] = dbRes.rows.map((r) => ({
      id: r.id,
      title: r.title,
      company: r.company,
      location: r.location,
      type: (r.type === 'Internship' ? 'Internship' : 'Full-Time') as NormalizedJob['type'],
      stipendOrSalary: r.stipend_or_salary,
      openings: r.openings,
      postedDate: r.posted_date,
      deadline: r.deadline,
      description: r.description,
      requiredSkills: r.required_skills || [],
      minCgpa: parseFloat(r.min_cgpa) || 6.5,
      eligibleBranches: r.eligible_branches || [],
      sourcePlatform: 'Campus Direct',
      workplaceType: 'On-site',
      experienceLevel: 'Entry Level (0-2 yrs)',
      externalUrl: r.external_url || undefined,
    }));
    attempts.push({ source: 'Curated DB (last resort)', ok: jobs.length > 0, count: jobs.length });
    return { jobs, source: 'Curated DB (last resort)', attempts, storedCount: 0, refreshedCount: 0 };  } catch (err: any) {
    // Even the curated DB is unreachable (e.g. unit tests with pg mocked, or a DB
    // outage) — return an honest empty result instead of throwing.
    attempts.push({ source: 'Curated DB (last resort)', ok: false, error: err.message });
    return { jobs: [], source: 'none', attempts, storedCount: 0, refreshedCount: 0 };
  }
}

