/**
 * Deadline helpers for India-based opportunity listings.
 * All dates are plain 'YYYY-MM-DD' strings in the app.
 */

export interface DeadlineInfo {
  daysLeft: number | null; // null = unparseable / rolling ("Active on LinkedIn")
  urgency: 'closed' | 'critical' | 'soon' | 'comfortable' | 'rolling';
  label: string;
  badgeClass: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function getDeadlineInfo(deadline: string | undefined): DeadlineInfo {
  if (!deadline || /active|rolling|na|tbd/i.test(deadline)) {
    return {
      daysLeft: null,
      urgency: 'rolling',
      label: 'Rolling deadline',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }

  const dl = new Date(deadline);
  if (isNaN(dl.getTime())) {
    return {
      daysLeft: null,
      urgency: 'rolling',
      label: 'Check listing',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }

  // Calendar-day difference: deadline dated today → 0 days left ("Closes today!").
  // This matches how Indian recruiters write deadlines (a date means EOD that day).
  const now = new Date();
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate());
  const dayDiff = Math.round((deadlineDay.getTime() - todayDay.getTime()) / DAY_MS);

  if (dayDiff < 0) {
    return {
      daysLeft: 0,
      urgency: 'closed',
      label: 'Deadline passed',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  const daysLeft = dayDiff;

  if (daysLeft <= 2) {
    return {
      daysLeft,
      urgency: 'critical',
      label: daysLeft === 0 ? 'Closes today!' : daysLeft === 1 ? '1 day left!' : '2 days left!',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold',
    };
  }
  if (daysLeft <= 7) {
    return {
      daysLeft,
      urgency: 'soon',
      label: `${daysLeft} days left`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
    };
  }
  return {
    daysLeft,
    urgency: 'comfortable',
    label: `${daysLeft} days left`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
}
