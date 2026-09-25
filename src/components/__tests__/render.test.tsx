import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

/**
 * Frontend smoke tests: key dashboard sections must render without crashing
 * (SSR pass), with mocked context + API. Catches broken imports, missing
 * context values, and render-time exceptions in the highest-traffic views.
 */

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return {
    ...actual,
    API_BASE: '/api',
    api: {
      ...actual.api,
      getMyInterviewSlots: vi.fn().mockResolvedValue({ success: true, slots: [] }),
      getMyOffers: vi.fn().mockResolvedValue({ success: true, offers: [] }),
      getCalendarFeed: vi.fn().mockResolvedValue({ success: true, url: '/api/calendar/x.ics' }),
      getStudents: vi.fn().mockResolvedValue([]),
      getRecruiterInterviewSlots: vi.fn().mockResolvedValue({ success: true, slots: [], counts: { scheduled: 0, completed: 0, cancelled: 0 } }),
      getRecruiterFunnel: vi.fn().mockResolvedValue({ success: true, postings: [], weeklyTrend: [] }),
      getJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0, totalPages: 1 }),
      getMyJobApplications: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    applications: [],
    jobs: [],
    student: { id: 'std-1', name: 'Test Student', declaredSkills: [], readinessScore: 70, college: 'Test U', branch: 'CSE' },
    setNotification: vi.fn(),
    setActiveTab: vi.fn(),
    addJob: vi.fn(),
    editJob: vi.fn(),
    setJobStatus: vi.fn(),
    deleteJob: vi.fn(),
    loadMyCandidates: vi.fn(),
    updateApplicationStatus: vi.fn(),
    activeTab: 'dashboard',
  }),
}));

import { PlacementTracker } from '../student/PlacementTracker';
import { TalentSearch } from '../industry/TalentSearch';

describe('Frontend smoke renders', () => {
  it('PlacementTracker renders the My Interviews + offers shell without crashing', () => {
    const html = renderToString(<PlacementTracker />);
    expect(html).toContain('My Interviews');
    expect(html).toContain('Outcome Tracking');
  });

  it('TalentSearch renders the honest empty state (no SAMPLE_STUDENTS rows)', () => {
    const html = renderToString(<TalentSearch />);
    expect(html).toContain('AI Automated Candidate Search');
    // No fake candidate names from the old fallback pool.
    expect(html).not.toContain('Ananya Deshpande');
  });
});
