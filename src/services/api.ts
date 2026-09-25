import {
  StudentProfile,
  JobOpportunity,
  JobApplication,
  InterviewSlot,
  RecruiterFunnelResponse,
  MoU,
  ProblemStatement,
  AssessmentResult,
  RoadmapMilestone
} from '../types';

/**
 * Central API base. In dev, Vite proxies /api to the Express backend.
 * In production, serve the built frontend from the same Express server (or a
 * reverse proxy) so relative paths keep working — no hardcoded hosts.
 */
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api';

// ── JWT session helpers ─────────────────────────────────────────
const TOKEN_KEY = 'spark_jwt';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
  // Let the React tree (AppContext) re-sync identity on login/logout.
  try { window.dispatchEvent(new Event('spark:session')); } catch { /* SSR */ }
}

export function clearSession() {
  setToken(null);
  try {
    localStorage.removeItem('spark_session');
    localStorage.removeItem('spark_user_role');
  } catch { /* storage unavailable */ }
}

/** fetch wrapper that attaches the JWT and normalizes auth errors. */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export interface BackendHealth {
  status: string;
  database: string;
  latencyMs: number;
  timestamp: string;
  pgVersion: string;
  pool?: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  counts: {
    students_count: string;
    jobs_count: string;
    apps_count: string;
    mous_count: string;
    problems_count: string;
  };
}

export const api = {
  async getHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /** Credential login — verifies against the users table, returns a JWT. */
  async login(email: string, password: string): Promise<{
    token: string;
    user: { id: string; name: string; email: string; role: string; avatar?: string };
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    return data;
  },

  /** Authenticated "who am I" — resolves the student profile for the JWT session. */
  async getStudentMe(): Promise<StudentProfile | null> {
    const res = await authFetch(`${API_BASE}/students/me`);
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  },

  async getStudents(): Promise<StudentProfile[]> {
    const res = await fetch(`${API_BASE}/students`);
    if (!res.ok) throw new Error('Failed to fetch students');
    return await res.json();
  },

  async getStudent(id: string): Promise<StudentProfile> {
    const res = await fetch(`${API_BASE}/students/${id}`);
    if (!res.ok) throw new Error('Failed to fetch student');
    return await res.json();
  },

  async updateStudent(id: string, updates: Partial<StudentProfile>): Promise<StudentProfile> {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update student profile');
    const data = await res.json();
    return data.student;
  },

  async uploadRealResume(studentId: string, file: File): Promise<{
    success: boolean;
    fileName: string;
    fileSizeBytes: number;
    extracted: { skill: string; confidence: number; category?: string; occurrences?: number }[];
    detectedSections: string[];
    educationInfo?: any;
    summaryText: string;
    allDeclaredSkills: string[];
    readinessScore: number;
    message: string;
  }> {
    const formData = new FormData();
    formData.append('resume', file);

    const res = await fetch(`${API_BASE}/students/${studentId}/upload-resume`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload and parse resume file');
    }
    return await res.json();
  },

  async registerUser(payload: Record<string, any>): Promise<{
    success: boolean;
    role: string;
    user: any;
    student?: StudentProfile | null;
  }> {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    return await res.json();
  },

  async parseResume(id: string, filename?: string): Promise<{ extracted: { skill: string; confidence: number }[]; allDeclaredSkills: string[]; readinessScore?: number }> {
    const res = await fetch(`${API_BASE}/students/${id}/parse-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    if (!res.ok) throw new Error('Failed to parse resume');
    return await res.json();
  },

  async submitAssessment(studentId: string, answers: Record<string, number>, timeSpentSeconds: number): Promise<AssessmentResult> {
    const res = await fetch(`${API_BASE}/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, answers, timeSpentSeconds }),
    });
    if (!res.ok) throw new Error('Failed to submit assessment');
    return await res.json();
  },

  async getRoadmap(studentId: string): Promise<RoadmapMilestone[]> {
    const res = await fetch(`${API_BASE}/roadmaps/${studentId}`);
    if (!res.ok) throw new Error('Failed to fetch roadmap');
    return await res.json();
  },

  async toggleRoadmapModule(studentId: string, milestoneId: string, moduleId: string): Promise<{ milestones: RoadmapMilestone[]; toggledState: boolean }> {
    const res = await fetch(`${API_BASE}/roadmaps/${studentId}/toggle-module`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneId, moduleId }),
    });
    if (!res.ok) throw new Error('Failed to toggle module');
    return await res.json();
  },

  async getJobs(params?: { q?: string; type?: string; location?: string; page?: number; limit?: number; mine?: boolean; includeUnavailable?: boolean }): Promise<{ jobs: JobOpportunity[]; page: number; limit: number; total: number; totalPages: number }> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.type) qs.set('type', params.type);
    if (params?.location) qs.set('location', params.location);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.mine) qs.set('mine', '1');
    if (params?.includeUnavailable) qs.set('includeUnavailable', '1');
    const res = await authFetch(`${API_BASE}/jobs${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    const data = await res.json();
    // Back-compat: the legacy endpoint returned a bare array
    if (Array.isArray(data)) return { jobs: data, page: 1, limit: data.length, total: data.length, totalPages: 1 };
    return data;
  },

  async updateJob(jobId: string, patch: Partial<JobOpportunity>): Promise<JobOpportunity> {
    const res = await authFetch(`${API_BASE}/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update job');
    }
    const data = await res.json();
    return data.job;
  },

  async setJobStatus(jobId: string, status: 'open' | 'closed' | 'filled'): Promise<JobOpportunity> {
    const res = await authFetch(`${API_BASE}/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
    const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update job status');
    }
    const data = await res.json();
    return data.job;
  },

  async deleteJob(jobId: string): Promise<{ success: boolean; deleted: string }> {
    const res = await authFetch(`${API_BASE}/jobs/${jobId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete job');
    }
    return await res.json();
  },

  async getMyJobApplications(): Promise<JobApplication[]> {
    const res = await authFetch(`${API_BASE}/applications?mine=1`);
    if (!res.ok) throw new Error('Failed to fetch candidate applications');
    return await res.json();
  },

  async bulkUpdateApplicationStatus(payload: { ids?: string[]; jobIds?: string[]; status: string }): Promise<{ success: boolean; updated: number; status: string }> {
    const res = await authFetch(`${API_BASE}/applications/bulk-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Bulk update failed');
    }
    return await res.json();
  },

  async scheduleInterviews(payload: { ids: string[]; scheduledAt: string; durationMinutes?: number; mode?: 'online' | 'in-person' | 'phone'; meetingUrl?: string; notes?: string }): Promise<{ success: boolean; scheduled: number; slots: InterviewSlot[] }> {
    const res = await authFetch(`${API_BASE}/applications/schedule-interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to schedule interviews');
    }
    return await res.json();
  },

  async getJobInterviewSlots(jobId: string): Promise<{ success: boolean; slots: InterviewSlot[] }> {
    const res = await authFetch(`${API_BASE}/jobs/${jobId}/interview-slots`);
    if (!res.ok) throw new Error('Failed to fetch interview slots');
    return await res.json();
  },

  async resendInterviewInvite(slotId: string): Promise<{ success: boolean; resentTo: string; error?: string }> {
    const res = await authFetch(`${API_BASE}/interview-slots/${slotId}/resend-invite`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to resend the invitation');
    }
    return await res.json();
  },

  async getRecruiterInterviewSlots(): Promise<{ success: boolean; slots: InterviewSlot[]; counts: { scheduled: number; completed: number; cancelled: number } }> {
    const res = await authFetch(`${API_BASE}/recruiter/interview-slots`);
    if (!res.ok) throw new Error('Failed to fetch the interview schedule');
    return await res.json();
  },

  async updateInterviewSlot(slotId: string, status: 'completed' | 'cancelled'): Promise<{ success: boolean; slot: { id: string; status: string } }> {
    const res = await authFetch(`${API_BASE}/interview-slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update interview slot');
    return await res.json();
  },

  async getRecruiterFunnel(): Promise<RecruiterFunnelResponse> {
    const res = await authFetch(`${API_BASE}/recruiter/funnel`);
    if (!res.ok) throw new Error('Failed to fetch funnel analytics');
    return await res.json();
  },

  getInterviewSlotIcsUrl(slotId: string): string {
    return `${API_BASE}/interview-slots/${slotId}/ics`;
  },

  async getInterviewSlotIcs(slotId: string): Promise<Blob> {
    const res = await authFetch(`${API_BASE}/interview-slots/${slotId}/ics`);
    if (!res.ok) throw new Error('Failed to download the calendar invite');
    return await res.blob();
  },

  async getMyInterviewSlots(): Promise<{ success: boolean; slots: InterviewSlot[] }> {
    const res = await authFetch(`${API_BASE}/me/interview-slots`);
    if (!res.ok) throw new Error('Failed to fetch your interview slots');
    return await res.json();
  },

  async getJobAlertsPreference(): Promise<{ jobAlertsEnabled: boolean }> {
    const res = await authFetch(`${API_BASE}/me/job-alerts`);
    if (!res.ok) return { jobAlertsEnabled: true };
    return await res.json();
  },

  async setJobAlertsPreference(enabled: boolean): Promise<{ success: boolean; jobAlertsEnabled: boolean }> {
    const res = await authFetch(`${API_BASE}/me/job-alerts`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update preference');
    }
    return await res.json();
  },

  async postJob(job: Omit<JobOpportunity, 'id' | 'postedDate'>): Promise<JobOpportunity> {
    const res = await authFetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    });
    if (!res.ok) throw new Error('Failed to post job');
    const data = await res.json();
    return data.job;
  },

  /**
   * Fetch applications. Pass studentId to scope to one student; omit for the
   * global feed (industry/TPO portals).
   */
  async getApplications(studentId?: string): Promise<JobApplication[]> {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    const res = await authFetch(`${API_BASE}/applications${qs}`);
    if (!res.ok) throw new Error('Failed to fetch applications');
    return await res.json();
  },

  async submitApplication(app: {
    jobId: string;
    jobTitle: string;
    company: string;
    studentId: string;
    studentName: string;
    aiMatchScore: number;
    notes?: string;
    attachedScorecardUrl?: string;
    attachedResumeUrl?: string;
  }): Promise<JobApplication> {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    });
    if (!res.ok) throw new Error('Failed to submit application');
    const data = await res.json();
    return data.application;
  },

  async updateApplicationStatus(appId: string, status: string, notes?: string, attachedScorecardUrl?: string, attachedResumeUrl?: string): Promise<JobApplication> {
    const res = await fetch(`${API_BASE}/applications/${appId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, attachedScorecardUrl, attachedResumeUrl }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    const data = await res.json();
    return data.application;
  },

  async deleteApplication(jobId: string, studentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/applications/by-job/${jobId}/${studentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete application');
  },

  async getMoUs(): Promise<MoU[]> {
    const res = await fetch(`${API_BASE}/mous`);
    if (!res.ok) throw new Error('Failed to fetch MoUs');
    return await res.json();
  },

  async postMoU(mou: {
    collegeName: string;
    companyName: string;
    title: string;
    focusArea: string;
    validUntil: string;
    keyObjectives: string[];
    digitalSignatureHash?: string;
  }): Promise<MoU> {
    const res = await authFetch(`${API_BASE}/mous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mou),
    });
    if (!res.ok) throw new Error('Failed to create MoU');
    const data = await res.json();
    return data.mou;
  },

  async getProblems(): Promise<ProblemStatement[]> {
    const res = await fetch(`${API_BASE}/problems`);
    if (!res.ok) throw new Error('Failed to fetch problem statements');
    return await res.json();
  },

  async postProblem(prob: {
    title: string;
    company: string;
    domain: string;
    description: string;
    rewardOrGrant?: string;
    deadline?: string;
    tags: string[];
  }): Promise<ProblemStatement> {
    const res = await fetch(`${API_BASE}/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prob),
    });
    if (!res.ok) throw new Error('Failed to post problem statement');
    const data = await res.json();
    return data.problem;
  },

  async getNotifications(): Promise<any[]> {
    // Authenticated when a session exists (server scopes to that user);
    // falls back to unauthenticated legacy route when logged out.
    const res = await authFetch(`${API_BASE}/notifications`);
    if (!res.ok) return [];
    return await res.json();
  },

  async queryCopilot(userQuery: string, apiKey?: string): Promise<string> {
    const res = await fetch(`${API_BASE}/copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: userQuery, apiKey }),
    });
    if (!res.ok) throw new Error('Copilot query failed');
    const data = await res.json();
    return data.answer;
  },

  async requestRegistrationOtp(email: string, name?: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    const res = await fetch(`${API_BASE}/auth/register-send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch registration verification code.');
    return data;
  },

  async verifyRegistrationOtp(email: string, otp: string): Promise<{ success: boolean; verified: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/register-verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid or expired OTP code.');
    return data;
  },

  async requestPasswordResetOtp(email: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch verification code.');
    return data;
  },

  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid OTP code.');
    return data;
  },

  async resetPassword(payload: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password reset failed.');
    return data;
  },

  async getBadges(studentId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/badges/${studentId}`);
    if (!res.ok) return [];
    return await res.json();
  },

  async issueBadge(payload: {
    studentId: string;
    title: string;
    category: string;
    scorePercentage: number;
    skills: string[];
    issuer?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/badges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to issue digital badge');
    return await res.json();
  },

  async getGithubTelemetry(username: string): Promise<any> {
    const res = await fetch(`${API_BASE}/telemetry/github/${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error('Failed to fetch GitHub telemetry');
    const data = await res.json();
    return data.telemetry;
  },

  async getLeetcodeTelemetry(username: string): Promise<any> {
    const res = await fetch(`${API_BASE}/telemetry/leetcode/${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error('Failed to fetch LeetCode telemetry');
    const data = await res.json();
    return data.telemetry;
  },

  /** Fetch live LinkedIn guest-search postings via the backend scraper. */
  async getLiveJobs(keywords: string, location: string): Promise<JobOpportunity[]> {
    const res = await fetch(
      `${API_BASE}/linkedin/live-jobs?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`
    );
    if (!res.ok) throw new Error('Failed to fetch live job postings');
    const data = await res.json();
    return (data.jobs || []) as JobOpportunity[];
  },

  /** Generic fetch helper so admin pages don't hardcode host URLs. */
  async adminGet<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`Request failed: ${path}`);
    return await res.json();
  },

  async adminPut<T = any>(path: string, body: unknown): Promise<T> {
    const res = await authFetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Request failed: ${path}`);
    return await res.json();
  },

  async adminDelete<T = any>(path: string): Promise<T> {
    const res = await authFetch(`${API_BASE}${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Request failed: ${path}`);
    return await res.json();
  },

  /**
   * Verify a college/university name against the accredited institutions registry.
   * Used in registration to confirm the institution actually exists.
   */
  async verifyInstitution(name: string): Promise<{
    verified: boolean;
    level: 'verified' | 'recognized' | 'unverified';
    confidence: number;
    matchedName?: string;
    matchedType?: string;
    matchedState?: string;
    accreditation?: string;
    nirfRank?: number;
    note: string;
  }> {
    const res = await fetch(`${API_BASE}/verify/institution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Institution verification failed');
    const data = await res.json();
    return data.verification;
  },

  /** Upload a student ID card photo for AI OCR verification. */
  async verifyIdCard(file: File): Promise<{ success: boolean; result?: any; error?: string }> {
    const formData = new FormData();
    formData.append('idCard', file);
    const res = await fetch(`${API_BASE}/verify/student-id-card`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  },

  // ── Alumni Network ──────────────────────────────────────────────────

  async submitAlumniApplication(payload: any): Promise<{ success: boolean; id: string; message: string }> {
    const res = await fetch(`${API_BASE}/alumni/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Application failed');
    return data;
  },

  async getPendingAlumniApplications(collegeId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/alumni/applications?collegeId=${encodeURIComponent(collegeId)}`);
    if (!res.ok) throw new Error('Failed to fetch alumni applications');
    return res.json();
  },

  async reviewAlumniApplication(id: string, decision: 'approved' | 'rejected', reviewNote?: string): Promise<{ success: boolean; status: string; alumniId?: string }> {
    const res = await fetch(`${API_BASE}/alumni/applications/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reviewNote }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Review failed');
    return data;
  },

  async getAlumniDirectory(q: string = '', collegeId: string = ''): Promise<any[]> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (collegeId) params.set('collegeId', collegeId);
    const res = await fetch(`${API_BASE}/alumni/directory${params.toString() ? `?${params}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch alumni directory');
    return res.json();
  },

  async getAlumniProfile(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/alumni/profile/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Alumnus not found');
    return res.json();
  },

  /** Resolve the signed-in mentor's alumni profile by their login email. */
  async getMyAlumniProfile(email: string): Promise<
    { found: true; profile: any } | { found: false; applicationStatus: string; message: string }
  > {
    const res = await fetch(`${API_BASE}/alumni/me?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Failed to resolve alumni profile');
    return res.json();
  },

  async sendMentorshipRequest(payload: {
    alumniId: string; studentId: string; studentName: string;
    studentCollege: string; studentBranch: string; message: string;
  }): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/mentorship/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  async getMentorshipRequests(params: { alumniId?: string; studentId?: string }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params.alumniId) qs.set('alumniId', params.alumniId);
    if (params.studentId) qs.set('studentId', params.studentId);
    const res = await fetch(`${API_BASE}/mentorship/requests?${qs.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch mentorship requests');
    return res.json();
  },

  async respondToMentorshipRequest(id: string, decision: 'accepted' | 'declined'): Promise<{ success: boolean; status: string; roomId?: string }> {
    const res = await fetch(`${API_BASE}/mentorship/requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Response failed');
    return data;
  },

  async getMentorshipRooms(userId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/mentorship/rooms?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch chat rooms');
    return res.json();
  },

  async getRoomMessages(roomId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/mentorship/rooms/${encodeURIComponent(roomId)}/messages`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async sendRoomMessage(roomId: string, senderRole: 'student' | 'mentor', senderName: string, body: string): Promise<any> {
    const res = await fetch(`${API_BASE}/mentorship/rooms/${encodeURIComponent(roomId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderRole, senderName, body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Message failed');
    return data;
  },

  async postFastTrackOpportunity(payload: {
    alumniId: string; alumniName: string; title: string; company: string;
    type: 'Internship' | 'Full-Time'; stipendOrSalary?: string;
    location?: string; description?: string; expiryDays?: number;
  }): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/mentorship/fast-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to post opportunity');
    return data;
  },

  async getFastTrackOpportunities(studentId?: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/mentorship/fast-track${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch fast-track opportunities');
    return res.json();
  },

  async applyFastTrack(id: string, studentId: string): Promise<{ success: boolean; alreadyApplied?: boolean }> {
    const res = await fetch(`${API_BASE}/mentorship/fast-track/${encodeURIComponent(id)}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Apply failed');
    return data;
  }
};
