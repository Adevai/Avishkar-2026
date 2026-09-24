/**
 * Human-friendly date rendering for the UI.
 * Accepts ISO strings ('2026-09-27T18:30:00.000Z'), plain dates ('2026-09-27'),
 * and passes through non-date labels ('Active on LinkedIn') untouched.
 */
export function formatDisplayDate(value: string | undefined | null): string {
  if (!value) return '—';
  const trimmed = String(value).trim();
  // Only touch values that start with an ISO/DATE prefix — anything else is
  // already a human-readable label written by the backend.
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
