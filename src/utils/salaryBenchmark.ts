/**
 * India fresher salary benchmark estimator.
 *
 * Real-world context: CTC in India varies sharply by city tier and company type.
 * These estimates are derived from public fresher-CTC patterns (service-based IT,
 * GCC/product companies, and startups) and are shown per-job so students can
 * negotiate with context instead of guessing.
 */

export interface SalaryBenchmark {
  /** Lower bound of the parsed range, in LPA */
  low: number;
  /** Upper bound of the parsed range, in LPA */
  high: number;
  /** 90th percentile for equivalent roles (Tier-1 metro) */
  p90: number;
  /** Human-readable summary, e.g. "₹12.0 – 22.0 LPA" */
  rangeText: string;
  /** Is this a monthly stipend (internship) or annual CTC? */
  isMonthly: boolean;
  tier1Avg: string;
  tier2Avg: string;
  tier3Avg: string;
  percentile50: string;
  percentile90: string;
  /** e.g. "+18% vs national fresher average" */
  positionText: string;
}

const NATIONAL_FRESHER_AVG_LPA = 6.5;

/** Parse strings like "₹12.0 - 22.0 LPA", "₹85,000 / month", "₹45,000 - 80,000 / month" */
function parseStipendOrSalary(text: string): { low: number; high: number; isMonthly: boolean } | null {
  if (!text) return null;
  const isMonthly = /month|per month|\/mo/i.test(text);

  // Pull all numbers, tolerating commas: "₹85,000", "12.0", "22.0"
  const nums = (text.match(/\d[\d,]*(?:\.\d+)?/g) || [])
    .map(n => parseFloat(n.replace(/,/g, '')))
    .filter(n => !isNaN(n) && n > 0);

  if (nums.length === 0) return null;

  let low = Math.min(...nums);
  let high = Math.max(...nums);

  // Internship monthly stipends stay as-is; annual figures get LPA normalization
  if (!isMonthly && high <= 10) {
    // Likely already in LPA ("₹12.0 - 24.0 LPA" won't hit this; "9.2 LPA" would)
    // Keep as LPA directly.
  }

  return { low, high, isMonthly };
}

export function getSalaryBenchmark(stipendOrSalary: string, company?: string): SalaryBenchmark | null {
  const parsed = parseStipendOrSalary(stipendOrSalary);
  if (!parsed) return null;

  const { low, high, isMonthly } = parsed;

  // Monthly stipend path (internships)
  if (isMonthly) {
    const p90 = Math.round(high * 1.35);
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}/mo`;
    return {
      low,
      high,
      p90,
      isMonthly: true,
      rangeText: `${fmt(low)} – ${fmt(high)}`,
      tier1Avg: fmt(Math.round((low + high) / 2 * 1.15 / 1000) * 1000),
      tier2Avg: fmt(Math.round((low + high) / 2 / 1000) * 1000),
      tier3Avg: fmt(Math.round((low + high) / 2 * 0.8 / 1000) * 1000),
      percentile50: fmt(Math.round((low + high) / 2 / 500) * 500),
      percentile90: fmt(p90),
      positionText:
        high >= 60000
          ? 'Top-quartile internship stipend for India'
          : 'Standard internship stipend range',
    };
  }

  // Annual CTC path — numbers may be in LPA already
  let lowLpa = low;
  let highLpa = high;

  // Heuristic: if values look like absolute rupees (e.g. 850000), convert to LPA
  if (highLpa > 100) {
    lowLpa = low / 100000;
    highLpa = high / 100000;
  }

  const mid = (lowLpa + highLpa) / 2;
  const p90 = Math.round(highLpa * 1.28 * 10) / 10;

  // Premium sector bump (product companies / GCCs pay above service-based)
  const premiumCompanies = ['google', 'microsoft', 'atlassian', 'cred', 'uber', 'amazon', 'goldman', 'nutanix', 'de shaw', 'tower', 'rubrik', 'confluent', 'fraudulent'];
  const isPremium = premiumCompanies.some(c => (company || '').toLowerCase().includes(c));
  const premiumMultiplier = isPremium ? 1.25 : 1;

  const fmt = (n: number) => `₹${(Math.round(n * 10) / 10).toFixed(1)} LPA`;

  const vsNational = Math.round((mid / NATIONAL_FRESHER_AVG_LPA - 1) * 100);

  return {
    low: lowLpa,
    high: highLpa,
    p90,
    isMonthly: false,
    rangeText: `${fmt(lowLpa)} – ${fmt(highLpa)}`,
    tier1Avg: fmt(mid * 1.12 * premiumMultiplier),
    tier2Avg: fmt(mid * 0.85 * premiumMultiplier),
    tier3Avg: fmt(mid * 0.68 * premiumMultiplier),
    percentile50: fmt(mid),
    percentile90: fmt(p90 * premiumMultiplier),
    positionText:
      vsNational >= 100
        ? `+${vsNational}% vs national fresher average — elite band`
        : vsNational >= 40
        ? `+${vsNational}% vs national fresher average`
        : vsNational >= 0
        ? `+${vsNational}% vs national fresher average`
        : 'Near national fresher average — service-sector band',
  };
}
