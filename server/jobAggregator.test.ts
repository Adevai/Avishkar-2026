import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fallback-chain behaviour tests.
 *
 * fetch is mocked so we exercise source selection and error fall-through
 * without touching Adzuna/SerpAPI/LinkedIn. DB persistence is not exercised
 * here (no PostgreSQL in unit CI); the chain logic is the critical unit.
 */

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock pg so persistJobs never hits a real database
vi.mock('./db', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

function jsonResponse(body: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

describe('aggregateJobs fallback chain', () => {
  const originalEnv = { ...process.env };
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    mockFetch.mockReset();
    process.env.ADZUNA_APP_ID = 'test-id';
    process.env.ADZUNA_APP_KEY = 'test-key';
    process.env.SERPAPI_KEY = 'test-serp';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    warnSpy.mockRestore();
  });

  it('uses Adzuna (first source) when it succeeds', async () => {
    const { aggregateJobs } = await import('./jobAggregator');
    mockFetch.mockResolvedValueOnce(jsonResponse({
      results: [{
        title: 'Backend Engineer',
        company: { display_name: 'Zoho' },
        location: { display_name: 'Chennai' },
        description: 'Node.js APIs',
        redirect_url: 'https://adz.in/1',
        created: '2026-09-01T00:00:00Z',
      }],
    }));

    const result = await aggregateJobs('backend', 'India');
    expect(result.source).toBe('Adzuna India');
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].sourcePlatform).toBe('Adzuna');
    expect(result.jobs[0].company).toBe('Zoho');
    expect(result.attempts[0].ok).toBe(true);
  });

  it('falls through to Google Jobs when Adzuna fails', async () => {
    const { aggregateJobs } = await import('./jobAggregator');
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ error: 'quota' }, 401))          // Adzuna fails
      .mockResolvedValueOnce(jsonResponse({                                  // SerpAPI succeeds
        jobs_results: [{
          title: 'Cloud Engineer',
          company_name: 'Freshworks',
          location: 'Chennai, India',
          description: 'AWS, Docker',
          detected_extensions: { salary: '₹10 - 18 LPA' },
        }],
      }));

    const result = await aggregateJobs('cloud', 'India');
    expect(result.source).toBe('Google Jobs (SerpAPI)');
    expect(result.jobs[0].company).toBe('Freshworks');
    expect(result.attempts[0].ok).toBe(false);
    expect(result.attempts[1].ok).toBe(true);
  });

  it('falls through to LinkedIn when Adzuna and SerpAPI both fail', async () => {
    const { aggregateJobs } = await import('./jobAggregator');
    const linkedInHtml = `
      <li>
        <div class="base-card job-search-card">
          <h3 class="base-search-card__title">Full Stack Intern</h3>
          <h4 class="base-search-card__subtitle">Razorpay</h4>
          <span class="job-search-card__location">Bengaluru</span>
          <a href="https://www.linkedin.com/jobs/view/12345?trk=x">link</a>
        </div>
      </li>`;
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 500))     // Adzuna down
      .mockResolvedValueOnce(jsonResponse({}, 403))     // SerpAPI unauthorized
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => linkedInHtml }); // LinkedIn OK

    const result = await aggregateJobs('fresher', 'India');
    expect(result.source).toBe('LinkedIn guest search');
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].type).toBe('Internship');
    expect(result.jobs[0].externalUrl).toContain('linkedin.com/jobs/view/12345');
  });

  it('returns empty jobs (no throw) when every source fails', async () => {
    const { aggregateJobs } = await import('./jobAggregator');
    mockFetch.mockResolvedValue(jsonResponse({}, 500));

    const result = await aggregateJobs('anything', 'India');
    expect(result.jobs).toHaveLength(0);                   // honest empty — no fabricated data
    expect(result.attempts).toHaveLength(4);               // 3 external + curated DB last resort
    expect(result.attempts.every(a => !a.ok)).toBe(true);  // nothing produced listings
  });

  it('reports source "none" when even the curated DB is unreachable', async () => {
    const { aggregateJobs } = await import('./jobAggregator');
    const { query } = await import('./db') as { query: ReturnType<typeof vi.fn> };
    mockFetch.mockResolvedValue(jsonResponse({}, 500));
    query.mockRejectedValueOnce(new Error('DB down'));

    const result = await aggregateJobs('anything', 'India');
    expect(result.jobs).toHaveLength(0);
    expect(result.source).toBe('none');
  });

  it('skips Adzuna when credentials are missing (no wasted request)', async () => {
    delete process.env.ADZUNA_APP_ID;
    const { aggregateJobs } = await import('./jobAggregator');

    mockFetch
      .mockResolvedValueOnce(jsonResponse({ jobs_results: [] }, 200))  // SerpAPI: empty results → throws
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '<li><div class="base-card job-search-card"><h3 class="base-search-card__title">Engineer</h3><h4 class="base-search-card__subtitle">Zoho</h4><span class="job-search-card__location">Pune</span><a href="https://www.linkedin.com/jobs/view/99">x</a></div></li>' });

    const result = await aggregateJobs('dev', 'India');
    // First fetch call should have been SerpAPI (index 0), not Adzuna
    expect(mockFetch.mock.calls[0][0]).toContain('serpapi.com');
    expect(result.source).toBe('LinkedIn guest search');
  });

  it('normalizes Adzuna absolute salaries into LPA display', async () => {
    const { aggregateJobs } = await import('./jobAggregator');
    mockFetch.mockResolvedValueOnce(jsonResponse({
      results: [{
        title: 'Software Engineer',
        company: { display_name: 'Postman' },
        location: { display_name: 'Bengaluru' },
        salary_min: 850000,
        salary_max: 1500000,
        description: 'APIs',
      }],
    }));

    const result = await aggregateJobs('api', 'India');
    expect(result.jobs[0].stipendOrSalary).toMatch(/8\.5 - 15\.0 LPA/); // ₹8,50,000 = 8.5 LPA
  });
});
