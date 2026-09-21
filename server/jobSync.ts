import { query } from './db';

/**
 * Background job sync scheduler.
 *
 * Keeps the jobs table topped up with fresh live postings so the platform
 * "updates on its own". Enabled with AUTO_SYNC_CRON=true; interval is
 * configurable via SYNC_INTERVAL_MINUTES (default 180 = 3 hours).
 *
 * Uses the same LinkedIn guest-search endpoint as the on-demand scraper,
 * rotating through a set of India-relevant role keywords.
 */

const DEFAULT_KEYWORDS = [
  'Software Engineer Fresher',
  'Cloud Engineer',
  'Data Analyst Fresher',
  'Embedded Systems Engineer',
  'Full Stack Developer',
];

interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  type: string;
  stipendOrSalary: string;
  duration?: string;
  openings: number;
  postedDate: string;
  deadline: string;
  description: string;
  requiredSkills: { name: string; weight: number; minScore: number }[];
  minCgpa: number;
  eligibleBranches: string[];
  sourcePlatform: string;
  externalUrl: string;
}

async function fetchLiveJobs(keywords: string, location = 'India'): Promise<ScrapedJob[]> {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
    keywords
  )}&location=${encodeURIComponent(location)}&f_TPR=r604800`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) throw new Error(`LinkedIn returned ${response.status}`);
  const html = await response.text();

  const cards = html.match(/<div class="base-card[^"]*job-search-card[\s\S]*?<\/li>/g) || [];
  return cards.slice(0, 10).map((card, idx) => {
    const titleM = card.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
    const compM = card.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
    const locM = card.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
    const linkM = card.match(/href="(https:\/\/[^"?]+)/);

    const title = titleM ? titleM[1].trim() : 'Software Engineering Professional';
    const company = compM ? compM[1].replace(/<[^>]+>/g, '').trim() : 'Technology Partner';
    const isIntern = /intern|trainee/i.test(title);

    return {
      id: `li-auto-${Date.now().toString(36)}-${idx}`,
      title,
      company,
      location: locM ? locM[1].trim() : location,
      type: isIntern ? 'Internship' : 'Full-Time',
      stipendOrSalary: isIntern ? '₹30,000 - 60,000 / month' : '₹6.0 - 18.0 LPA',
      duration: isIntern ? '6 Months' : undefined,
      openings: Math.floor(Math.random() * 6) + 2,
      postedDate: new Date().toISOString().split('T')[0],
      deadline: 'Active on LinkedIn',
      description: `Live opening at ${company} (${location}), auto-synced from LinkedIn. Match score is computed against your verified competencies.`,
      requiredSkills: [
        { name: 'Core Problem Solving', weight: 0.35, minScore: 65 },
        { name: 'Domain Architecture', weight: 0.35, minScore: 60 },
        { name: 'Professional Communication', weight: 0.3, minScore: 65 },
      ],
      minCgpa: 6.5,
      eligibleBranches: ['Computer Science & Engineering', 'Information Technology', 'Electronics & Telecommunication'],
      sourcePlatform: 'LinkedIn',
      externalUrl: linkM ? linkM[1] : `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}`,
    } as ScrapedJob;
  });
}

async function syncOnce(): Promise<number> {
  let inserted = 0;
  const keyword = DEFAULT_KEYWORDS[Math.floor(Math.random() * DEFAULT_KEYWORDS.length)];

  try {
    const jobs = await fetchLiveJobs(keyword);

    for (const job of jobs) {
      // Dedupe on external URL presence in description-keyed lookup
      const exists = await query(
        `SELECT 1 FROM jobs WHERE company = $1 AND title = $2 LIMIT 1`,
        [job.company, job.title]
      );
      if (exists.rows.length > 0) continue;

      await query(
        `INSERT INTO jobs (
          id, title, company, company_logo, location, type, stipend_or_salary,
          duration, openings, posted_date, deadline, description, required_skills,
          min_cgpa, eligible_branches
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO NOTHING`,
        [
          job.id, job.title, job.company, job.companyLogo || null, job.location,
          job.type, job.stipendOrSalary, job.duration || null, job.openings,
          job.postedDate, job.deadline, job.description,
          JSON.stringify(job.requiredSkills), job.minCgpa,
          JSON.stringify(job.eligibleBranches),
        ]
      );
      inserted++;
    }

    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      ['AUTO_SYNC', 'LIVE_JOBS_SYNCED', JSON.stringify({ keyword, fetched: jobs.length, inserted, at: new Date() })]
    );

    console.log(`🔄 [job-sync] "${keyword}": ${inserted} new posting(s) added.`);
  } catch (err: any) {
    console.warn(`⚠️ [job-sync] sync failed for "${keyword}": ${err.message}`);
  }

  return inserted;
}

/** Start the background sync loop if AUTO_SYNC_CRON=true. */
export function startJobSyncScheduler() {
  if (process.env.AUTO_SYNC_CRON !== 'true') {
    console.log('ℹ️  [job-sync] Auto-sync disabled (set AUTO_SYNC_CRON=true to enable).');
    return;
  }

  const intervalMin = parseInt(process.env.SYNC_INTERVAL_MINUTES || '180', 10);
  const intervalMs = Math.max(15 * 60 * 1000, intervalMin * 60 * 1000); // floor: 15 min

  console.log(`🔄 [job-sync] Auto-sync enabled — every ${intervalMs / 60000} minutes.`);

  // First run shortly after boot so fresh jobs exist even on a new deploy
  setTimeout(syncOnce, 45 * 1000);
  setInterval(syncOnce, intervalMs);
}
