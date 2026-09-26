import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { SPARK_NEW_APPLICATION_EVENT } from '../../hooks/useSparkEvents';
import { 
  Building2, 
  Users, 
  Briefcase, 
  Sparkles, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Send,
  MapPin,
  X,
  Pencil,
  Archive,
  Trash2,
  Search,
  Calendar,
  BarChart3,
  TrendingUp,
  CalendarClock
} from 'lucide-react';
import { JobType, JobOpportunity, InterviewSlot, FunnelPosting } from '../../types';
import { formatDisplayDate } from '../../utils/formatDate';

export const IndustryDashboard: React.FC = () => {
  const { jobs, addJob, editJob, setJobStatus, deleteJob, loadMyCandidates, applications, updateApplicationStatus, activeTab, setActiveTab, setNotification } = useApp();
  const [showPostModal, setShowPostModal] = useState(false);

  // Recruiter-owned postings + their candidates (scoped by JWT server-side)
  const [myJobs, setMyJobs] = useState<JobOpportunity[]>([]);
  const [myApps, setMyApps] = useState<{ id: string; jobId: string; jobTitle: string; company: string; studentId: string; studentName: string; appliedDate: string; status: string; aiMatchScore: number }[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [postingSearch, setPostingSearch] = useState('');

  // Per-job candidate pipeline (bulk actions)
  const [pipelineJobId, setPipelineJobId] = useState<string | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  // Interview scheduling form — books real slots via POST /applications/schedule-interviews
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedAt, setSchedAt] = useState('');
  const [schedDuration, setSchedDuration] = useState('45');
  const [schedMode, setSchedMode] = useState<'online' | 'in-person' | 'phone'>('online');
  const [schedUrl, setSchedUrl] = useState('');
  const [schedNotes, setSchedNotes] = useState('');
  const [jobSlots, setJobSlots] = useState<InterviewSlot[]>([]);

  // Hiring funnel analytics (GET /recruiter/funnel)
  const [funnel, setFunnel] = useState<FunnelPosting[]>([]);
  const [funnelTrend, setFunnelTrend] = useState<{ week: string; applications: number }[]>([]);
  const [loadingFunnel, setLoadingFunnel] = useState(false);
  // Drill-down: which posting's weekly trend is shown (null = aggregate).
  const [funnelDrillJobId, setFunnelDrillJobId] = useState<string | null>(null);

  // Interview Schedule board (GET /recruiter/interview-slots)
  const [scheduleSlots, setScheduleSlots] = useState<InterviewSlot[]>([]);
  const [scheduleCounts, setScheduleCounts] = useState({ scheduled: 0, completed: 0, cancelled: 0 });
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [slotBusyId, setSlotBusyId] = useState<string | null>(null);

  const loadMine = async () => {
    setLoadingMine(true);
    try {
      const [mineRes, mineApps] = await Promise.all([
        api.getJobs({ mine: true, limit: 100 }),
        api.getMyJobApplications(),
      ]);
      setMyJobs(mineRes.jobs || []);
      setMyApps(mineApps as any);
    } catch (e: any) {
      console.warn('Failed to load recruiter postings:', e?.message);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => { loadMine(); }, []);

  // Live candidates: a student applying to one of the recruiter's postings
  // arrives as an SSE push (owner-targeted) — refresh without a reload.
  useEffect(() => {
    const onNewApp = () => loadMine();
    window.addEventListener(SPARK_NEW_APPLICATION_EVENT, onNewApp);
    return () => window.removeEventListener(SPARK_NEW_APPLICATION_EVENT, onNewApp);
  }, []);

  const filteredMyJobs = myJobs.filter(j => {
    if (!postingSearch.trim()) return true;
    const q = postingSearch.toLowerCase();
    return j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.location.toLowerCase().includes(q);
  });

  const startEdit = (job: JobOpportunity) => {
    setEditingJobId(job.id);
    setTitle(job.title);
    setType(job.type);
    setLocation(job.location);
    setStipendOrSalary(job.stipendOrSalary);
    setOpenings(String(job.openings));
    setDescription(job.description || '');
    setMinCgpa(String(job.minCgpa));
    setSkillsInput(job.requiredSkills.map(rs => rs.name).join(', '));
    setCompany(job.company);
    setDeadline(job.deadline || '');
    setActiveTab('post-job');
  };

  const resetForm = () => {
    setEditingJobId(null);
    setTitle('');
    setDescription('');
    setCompany('');
    setDeadline('');
  };

  const handleLifecycle = async (jobId: string, action: 'open' | 'closed' | 'filled' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Delete this posting permanently? Only possible when it has no applicants.')) return;
        await deleteJob(jobId);
      } else {
        await setJobStatus(jobId, action);
      }
      await loadMine();
    } catch (e: any) {
      setNotification(e?.message || 'Action failed.');
    }
  };

  const openPipeline = (jobId: string) => {
    setPipelineJobId(prev => (prev === jobId ? null : jobId));
    setSelectedCandidateIds(new Set());
  };

  const toggleCandidate = (appId: string) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const runBulk = async (status: string) => {
    if (selectedCandidateIds.size === 0 || isBulkWorking) return;
    setIsBulkWorking(true);
    try {
      const res = await api.bulkUpdateApplicationStatus({ ids: Array.from(selectedCandidateIds), status });
      setNotification(`${res.updated} candidate(s) moved to "${status}" — students notified.`);
      setSelectedCandidateIds(new Set());
      await loadMine();
    } catch (e: any) {
      setNotification(e?.message || 'Bulk action failed.');
    } finally {
      setIsBulkWorking(false);
    }
  };

  const openScheduleForm = async () => {
    setShowScheduleForm(true);
    setSchedAt('');
    setSchedUrl('');
    setSchedNotes('');
    try {
      const res = await api.getJobInterviewSlots(pipelineJobId!);
      setJobSlots(res.slots || []);
    } catch {
      setJobSlots([]);
    }
  };

  const runSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCandidateIds.size === 0 || isBulkWorking || !schedAt) return;
    setIsBulkWorking(true);
    try {
      const res = await api.scheduleInterviews({
        ids: Array.from(selectedCandidateIds),
        scheduledAt: new Date(schedAt).toISOString(),
        durationMinutes: Number(schedDuration) || 45,
        mode: schedMode,
        meetingUrl: schedUrl.trim() || undefined,
        notes: schedNotes.trim() || undefined,
      });
      setNotification(`Interview booked for ${res.scheduled} candidate(s) — students notified with the slot.`);
      setSelectedCandidateIds(new Set());
      setShowScheduleForm(false);
      setJobSlots(res.slots || []);
      await loadMine();
    } catch (e: any) {
      setNotification(e?.message || 'Failed to schedule interviews.');
    } finally {
      setIsBulkWorking(false);
    }
  };

  const loadFunnel = async () => {
    setLoadingFunnel(true);
    try {
      const res = await api.getRecruiterFunnel();
      setFunnel(res.postings || []);
      setFunnelTrend(res.weeklyTrend || []);
    } catch (e: any) {
      console.warn('Funnel load failed:', e?.message);
    } finally {
      setLoadingFunnel(false);
    }
  };

  useEffect(() => { if (activeTab === 'analytics') loadFunnel(); }, [activeTab]);
  // Keep a posting selector pointing at a posting that still exists after a reload.
  useEffect(() => {
    if (funnelDrillJobId && !funnel.find(p => p.jobId === funnelDrillJobId)) setFunnelDrillJobId(null);
  }, [funnel]);

  const loadSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const res = await api.getRecruiterInterviewSlots();
      setScheduleSlots(res.slots || []);
      setScheduleCounts(res.counts || { scheduled: 0, completed: 0, cancelled: 0 });
    } catch (e: any) {
      console.warn('Schedule load failed:', e?.message);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => { if (activeTab === 'schedule') loadSchedule(); }, [activeTab]);

  const setSlotStatus = async (slotId: string, status: 'completed' | 'cancelled') => {
    if (slotBusyId) return;
    setSlotBusyId(slotId);
    try {
      await api.updateInterviewSlot(slotId, status);
      setNotification(status === 'completed' ? 'Interview marked completed — student notified.' : 'Interview cancelled — student notified.');
      await loadSchedule();
    } catch (e: any) {
      setNotification(e?.message || 'Failed to update the slot.');
    } finally {
      setSlotBusyId(null);
    }
  };

  const exportFunnelCsv = () => {
    if (funnel.length === 0) return;
    const header = 'Job ID,Posting,Company,Applied,Shortlisted,Interviewed,Offers,Rejected,Offer Rate %';
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = funnel.map(p => [
      p.jobId, p.title, p.company, p.applied, p.shortlisted, p.interviewed, p.offers, p.rejected,
      p.applied > 0 ? p.conversionPct : '',
    ].map(escape).join(','));
    const blob = new Blob(
      [[header, ...lines].join('\n')],
      { type: 'text/csv;charset=utf-8;' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hiring-funnel-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // New Job Form State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [deadline, setDeadline] = useState('');
  const [type, setType] = useState<JobType>('Internship');
  const [location, setLocation] = useState('Pune / Bengaluru (Hybrid)');
  const [stipendOrSalary, setStipendOrSalary] = useState('₹45,000 / month');
  const [openings, setOpenings] = useState('10');
  const [description, setDescription] = useState('');
  const [minCgpa, setMinCgpa] = useState('7.5');
  const [skillsInput, setSkillsInput] = useState('React.js, Node.js, Docker, REST APIs');

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const skillsArray = skillsInput.split(',').map(s => ({
      name: s.trim(),
      weight: 0.25,
      minScore: 70
    }));

    const payload = {
      title: title.trim(),
      company: company.trim() || 'My Company',
      companyLogo: undefined as string | undefined,
      location,
      type,
      stipendOrSalary,
      openings: parseInt(openings) || 5,
      deadline: deadline || 'Rolling',
      description: description || 'Exciting engineering role — apply with your verified S.P.A.R.K. profile.',
      requiredSkills: skillsArray,
      minCgpa: parseFloat(minCgpa) || 7.0,
      eligibleBranches: ['Computer Science & Engineering', 'AI & Data Science', 'Electronics & Telecommunication'],
    };

    try {
      if (editingJobId) {
        await editJob(editingJobId, payload);
      } else {
        await addJob(payload);
      }
      resetForm();
      setActiveTab('dashboard');
      await loadMine();
    } catch (err: any) {
      setNotification(err?.message || 'Failed to save posting.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Recruiter Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-bold border border-blue-400/30">
                Corporate Hiring & Talent ATS
              </span>
              <span className="text-xs text-blue-200">Smart Automation Matching</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Industry Talent Portal</h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Recruit verified, benchmarked student talent with zero resume fraud. Leverage AI-calculated skill compatibility to slash hiring cycle times by 65%.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('post-job')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-105"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post New Vacancy</span>
            </button>
            <button
              onClick={() => setActiveTab('talent-search')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur border border-white/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>AI Candidate Search</span>
            </button>
          </div>
        </div>

        {/* Top Synchronized Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
          {[
            { id: 'dashboard', label: 'Recruitment Hub', icon: <Building2 className="w-4 h-4" /> },
            { id: 'talent-search', label: 'AI Talent Search', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'analytics', label: 'Hiring Funnel Analytics', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'schedule', label: 'Interview Schedule', icon: <CalendarClock className="w-4 h-4" /> },
            { id: 'post-job', label: 'Post Vacancy', icon: <PlusCircle className="w-4 h-4" /> },
            { id: 'problem-statements', label: 'R&D Capstone Challenges', icon: <Briefcase className="w-4 h-4" /> },
            { id: 'mous', label: 'Academia MoUs', icon: <Users className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONDITIONAL VIEW: POST VACANCY */}
      {activeTab === 'post-job' ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md max-w-3xl mx-auto space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editingJobId ? 'Edit Vacancy' : 'Post Campus Internship / Job Vacancy'}</h2>
                <p className="text-xs text-slate-500 font-medium">{editingJobId ? 'Update the live criteria — changes are visible to students instantly' : 'Create an AI-benchmarked opening for verified university talent'}</p>
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setActiveTab('dashboard'); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              ← Back to ATS Hub
            </button>
          </div>

          <form onSubmit={handlePostSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Job / Internship Title</label>
                <input
                  type="text"
                  placeholder="e.g. Edge AI Firmware Engineer, Cloud Backend Intern, Full Stack Developer..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tata Motors R&D"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Opportunity Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as JobType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Internship">Internship (6 Months)</option>
                  <option value="Full-Time">Full-Time (Graduate Trainee)</option>
                  <option value="Co-op">Co-op Apprenticeship</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Stipend or CTC</label>
                <input
                  type="text"
                  placeholder="e.g. ₹65,000 / mo or ₹14 LPA"
                  value={stipendOrSalary}
                  onChange={(e) => setStipendOrSalary(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Location / Mode</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Number of Openings</label>
                <input
                  type="number"
                  value={openings}
                  onChange={(e) => setOpenings(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Minimum CGPA Cutoff</label>
                <input
                  type="number"
                  step="0.1"
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Required Competencies (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Docker, Kubernetes, React, Python, Data Structures"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Application Deadline</label>
              <input
                type="text"
                placeholder="e.g. 2026-11-15 or Rolling"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Role Description & Responsibilities</label>
              <textarea
                rows={4}
                placeholder="Describe engineering responsibilities, tech stack, and key project outcomes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all hover:scale-105"
              >
                {editingJobId ? 'Save Changes' : 'Publish Campus Vacancy'}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'schedule' ? (
        /* CONDITIONAL VIEW: INTERVIEW SCHEDULE BOARD */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Interview Schedule</h2>
                <p className="text-xs text-slate-500 font-medium">Every booked slot across your postings — mark completed or cancel (students are notified)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSchedule}
                disabled={loadingSchedule}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                {loadingSchedule ? 'Refreshing…' : '↻ Refresh'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Scheduled</p>
              <p className="text-2xl font-extrabold text-indigo-700">{scheduleCounts.scheduled}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Completed</p>
              <p className="text-2xl font-extrabold text-emerald-700">{scheduleCounts.completed}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cancelled</p>
              <p className="text-2xl font-extrabold text-slate-700">{scheduleCounts.cancelled}</p>
            </div>
          </div>

          {scheduleSlots.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700">No interviews booked yet</p>
              <p className="text-xs text-slate-400 mt-1">Open a posting's candidate pipeline and use Schedule Interviews to book real slots.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">When</th>
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Posting</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduleSlots.map(slot => {
                    const start = new Date(slot.scheduledAt);
                    const end = new Date(start.getTime() + (slot.durationMinutes || 45) * 60_000);
                    const isBusy = slotBusyId === slot.id;
                    return (
                      <tr key={slot.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                          <p className="text-[10px] text-slate-400">{start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}–{end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {slot.durationMinutes || 45} min</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{slot.studentName}</p>
                          <p className="text-[10px] text-slate-400">app: {slot.applicationStatus || '—'}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-700">{slot.jobTitle}</p>
                        </td>
                        <td className="py-3 px-3">
                          {slot.meetingUrl ? (
                            <a href={slot.meetingUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">Join link</a>
                          ) : (
                            <span className="text-slate-500">{slot.mode === 'in-person' ? 'In-person' : slot.mode === 'phone' ? 'Phone' : 'Online'}</span>
                          )}
                          {slot.status === 'scheduled' && (
                            <button
                              onClick={async () => {
                                try {
                                  const r = await api.resendInterviewInvite(slot.id);
                                  setNotification(r.success ? `Invitation re-sent to ${r.resentTo}.` : (r.error || 'Resend failed.'));
                                } catch (e: any) {
                                  setNotification(e?.message || 'Resend failed.');
                                }
                              }}
                              className="block mt-1 text-[10px] font-bold text-slate-500 hover:text-blue-700"
                            >
                              ↻ Resend invite
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            slot.status === 'scheduled' ? 'bg-indigo-600 text-white'
                            : slot.status === 'completed' ? 'bg-emerald-600 text-white'
                            : 'bg-slate-400 text-white'
                          }`}>{slot.status}</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {slot.status === 'scheduled' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={async () => {
                                  const input = window.prompt('New date & time for this interview', '');
                                  if (!input) return;
                                  const when = new Date(input);
                                  if (isNaN(when.getTime()) || when.getTime() < Date.now()) {
                                    setNotification('Please enter a valid future date/time.');
                                    return;
                                  }
                                  try {
                                    await api.rescheduleInterview(slot.id, when.toISOString());
                                    setNotification('Interview rescheduled — student notified with a fresh calendar invite.');
                                    await loadSchedule();
                                  } catch (e: any) {
                                    setNotification(e?.message || 'Reschedule failed.');
                                  }
                                }}
                                disabled={!!slotBusyId}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px]"
                                title="Move this interview to a new time"
                              >
                                ⟳ Move
                              </button>
                              <button
                                onClick={() => setSlotStatus(slot.id, 'completed')}
                                disabled={!!slotBusyId}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px]"
                              >
                                {isBusy ? '…' : '✓ Complete'}
                              </button>
                              <button
                                onClick={() => setSlotStatus(slot.id, 'cancelled')}
                                disabled={!!slotBusyId}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'analytics' ? (
        /* CONDITIONAL VIEW: HIRING FUNNEL ANALYTICS */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-violet-50 text-violet-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Hiring Funnel Analytics</h2>
                <p className="text-xs text-slate-500 font-medium">Applied → Shortlisted → Interview → Offer — per posting, over time</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportFunnelCsv}
                disabled={funnel.length === 0}
                className="text-xs font-bold text-violet-700 hover:text-violet-900 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors disabled:opacity-40 border border-violet-200"
                title="Download the current funnel table as CSV"
              >
                ⤓ Export CSV
              </button>
              <button
                onClick={loadFunnel}
                disabled={loadingFunnel}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                {loadingFunnel ? 'Refreshing…' : '↻ Refresh'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Posting</th>
                  <th className="py-2.5 px-3 text-center">Applied</th>
                  <th className="py-2.5 px-3 text-center">Shortlisted</th>
                  <th className="py-2.5 px-3 text-center">Interviewed</th>
                  <th className="py-2.5 px-3 text-center">Offers</th>
                  <th className="py-2.5 px-3 text-center">Rejected</th>
                  <th className="py-2.5 px-3 text-center">Offer Rate</th>
                  <th className="py-2.5 px-3">Funnel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funnel.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">{loadingFunnel ? 'Loading funnel…' : 'No postings yet — publish a vacancy to see conversion analytics.'}</td></tr>
                ) : funnel.map(p => (
                  <tr key={p.jobId} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{p.title}</p>
                      <p className="text-[10px] text-slate-400">{p.company}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{p.applied}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700">{p.shortlisted}</td>
                    <td className="py-3 px-3 text-center font-bold text-purple-700">{p.interviewed}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{p.offers}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">{p.rejected}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{p.applied > 0 ? `${p.conversionPct}%` : '—'}</td>
                    <td className="py-3 px-3">
                      {(() => {
                        const stages = [p.applied, p.shortlisted, p.interviewed, p.offers];
                        const max = Math.max(...stages, 1);
                        const colors = ['bg-slate-300', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500'];
                        return (
                          <div className="flex items-end gap-1 h-8">
                            {stages.map((v, i) => (
                              <div
                                key={i}
                                className={`w-4 rounded-t ${colors[i]}`}
                                style={{ height: `${Math.max((v / max) * 100, 6)}%` }}
                                title={`${['Applied', 'Shortlisted', 'Interviewed', 'Offers'][i]}: ${v}`}
                              />
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {funnelTrend.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
                  {funnelDrillJobId
                    ? `Weekly Applications — ${funnel.find(p => p.jobId === funnelDrillJobId)?.title || 'Selected posting'}`
                    : 'Weekly Applications Trend — All Postings'}
                </p>
                <select
                  value={funnelDrillJobId || ''}
                  onChange={(e) => setFunnelDrillJobId(e.target.value || null)}
                  className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 max-w-xs"
                >
                  <option value="">All postings (aggregate)</option>
                  {funnel.filter(p => p.weeklyTrend.length > 0).map(p => (
                    <option key={p.jobId} value={p.jobId}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-3 h-28 overflow-x-auto pb-1">
                {(() => {
                  const displayTrend = funnelDrillJobId
                    ? (funnel.find(p => p.jobId === funnelDrillJobId)?.weeklyTrend || [])
                    : funnelTrend;
                  if (displayTrend.length === 0) {
                    return <p className="text-[11px] text-slate-400 py-6">No applications recorded for this posting yet.</p>;
                  }
                  const max = Math.max(...displayTrend.map(w => w.applications), 1);
                  return displayTrend.map(w => (
                    <div key={w.week} className="flex flex-col items-center gap-1 min-w-12">
                      <span className="text-[10px] font-bold text-slate-700">{w.applications}</span>
                      <div
                        className="w-8 rounded-t-lg bg-gradient-to-t from-violet-500 to-violet-300"
                        style={{ height: `${Math.max((w.applications / max) * 80, 6)}px` }}
                        title={`Week of ${w.week}`}
                      />
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">{w.week}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CONDITIONAL VIEW: RECRUITMENT HUB & ATS */
        <>
          {/* Corporate Hiring Funnel KPIs — recruiter-scoped */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">My Active Postings</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{myJobs.filter(j => (j.status || 'open') === 'open').length}</p>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{myJobs.length} total incl. closed/filled</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">My Candidates</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{myApps.length}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Applications to my postings</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">In Interview/Offer Stage</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {myApps.filter(a => a.status === 'Shortlisted' || a.status === 'Interview Scheduled' || a.status === 'Offer Extended').length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Advancing through my pipeline</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Avg AI Match</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {myApps.length > 0 ? Math.round(myApps.reduce((sum, a) => sum + (a.aiMatchScore || 0), 0) / myApps.length) + '%' : '—'}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Quality of my applicant pool</p>
            </div>
          </div>

          {/* Live Applications Pipeline Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Candidates for My Postings (ATS Pipeline)</h2>
                <p className="text-xs text-slate-500">Live applications scored by AI Skill Mapping — scoped to jobs you posted</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{myApps.length} direct applications</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Target Role</th>
                    <th className="py-3 px-3 text-center">AI Skill Match</th>
                    <th className="py-3 px-3">Applied Date</th>
                    <th className="py-3 px-3">Current Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMine ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading your candidates…</td></tr>
                  ) : myApps.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400">
                      No applications yet. Post a vacancy and candidates will appear here.
                    </td></tr>
                  ) : myApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{app.studentName}</div>
                        <div className="text-[11px] text-slate-400">ID: {app.studentId}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{app.jobTitle}</div>
                        <div className="text-[11px] text-slate-400">{app.company}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[11px] ${
                          (app.aiMatchScore || 85) >= 90
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (app.aiMatchScore || 85) >= 80
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          <span>{app.aiMatchScore || 85}% Compatible</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">{formatDisplayDate(app.appliedDate)}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          app.status === 'Offer Extended'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'Interview Scheduled'
                            ? 'bg-purple-100 text-purple-800'
                            : app.status === 'Shortlisted'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'Assessment Sent'
                            ? 'bg-amber-100 text-amber-800'
                            : app.status === 'Under Review'
                            ? 'bg-indigo-100 text-indigo-800'
                            : app.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(app.status === 'Applied' || app.status === 'Under Review') && (
                            <button
                              onClick={() => updateApplicationStatus(app.id, 'Shortlisted')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px]"
                            >
                              Shortlist
                            </button>
                          )}
                          {app.status === 'Shortlisted' && (
                            <button
                              onClick={() => updateApplicationStatus(app.id, 'Interview Scheduled')}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-[11px]"
                            >
                              Interview
                            </button>
                          )}
                          {app.status === 'Interview Scheduled' && (
                            <button
                              onClick={() => updateApplicationStatus(app.id, 'Offer Extended')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px]"
                            >
                              Offer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-job candidate pipeline with bulk actions */}
          {pipelineJobId && (() => {
            const pipelineJob = myJobs.find(j => j.id === pipelineJobId);
            const pipelineApps = myApps.filter(a => a.jobId === pipelineJobId);
            const allSelected = pipelineApps.length > 0 && pipelineApps.every(a => selectedCandidateIds.has(a.id));
            return (
              <div className="bg-white rounded-2xl p-6 border-2 border-indigo-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Candidate Pipeline — {pipelineJob?.title || 'Job'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{pipelineApps.length} applicant(s) • select rows for bulk actions</p>
                  </div>
                  <button
                    onClick={() => { setPipelineJobId(null); setSelectedCandidateIds(new Set()); }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className={`flex flex-wrap items-center gap-2 p-3 rounded-xl ${
                  selectedCandidateIds.size > 0 ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 border border-slate-200'
                }`}>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => setSelectedCandidateIds(e.target.checked ? new Set(pipelineApps.map(a => a.id)) : new Set())}
                      className="w-3.5 h-3.5 rounded accent-indigo-600"
                    />
                    Select all
                  </label>
                  <span className="text-[11px] text-slate-400">|</span>
                  <span className="text-[11px] font-bold text-indigo-700">{selectedCandidateIds.size} selected</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => runBulk('Shortlisted')}
                    disabled={selectedCandidateIds.size === 0 || isBulkWorking}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px]"
                  >
                    Shortlist
                  </button>
                  <button
                    onClick={() => openScheduleForm()}
                    disabled={selectedCandidateIds.size === 0 || isBulkWorking}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px]"
                  >
                    Schedule Interviews
                  </button>
                  <button
                    onClick={() => runBulk('Rejected')}
                    disabled={selectedCandidateIds.size === 0 || isBulkWorking}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px]"
                  >
                    Reject
                  </button>
                </div>

                {showScheduleForm && (
                  <form onSubmit={runSchedule} className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Book Interview Slot — {selectedCandidateIds.size} candidate(s)
                      </h3>
                      <button type="button" onClick={() => setShowScheduleForm(false)} className="text-[11px] font-bold text-purple-500 hover:text-purple-800">✕</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Date &amp; Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={schedAt}
                          onChange={(e) => setSchedAt(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg border border-purple-200 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Duration (min)</label>
                        <select value={schedDuration} onChange={(e) => setSchedDuration(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-purple-200 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500">
                          {['30', '45', '60', '90'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Mode</label>
                        <select value={schedMode} onChange={(e) => setSchedMode(e.target.value as 'online' | 'in-person' | 'phone')} className="w-full px-2.5 py-2 rounded-lg border border-purple-200 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="online">Online</option>
                          <option value="in-person">In-person</option>
                          <option value="phone">Phone</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Meeting URL</label>
                        <input
                          type="url"
                          placeholder="https://meet…"
                          value={schedUrl}
                          onChange={(e) => setSchedUrl(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg border border-purple-200 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Notes for the candidate (optional)"
                      value={schedNotes}
                      onChange={(e) => setSchedNotes(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-purple-200 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="submit"
                        disabled={selectedCandidateIds.size === 0 || isBulkWorking || !schedAt}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px]"
                      >
                        {isBulkWorking ? 'Booking…' : `Book for ${selectedCandidateIds.size} candidate(s)`}
                      </button>
                      <span className="text-[10px] text-slate-500">Students get a notification with the slot details instantly.</span>
                    </div>
                    {jobSlots.length > 0 && (
                      <div className="pt-2 border-t border-purple-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Booked slots ({jobSlots.length})</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {jobSlots.map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
                              <Clock className="w-3 h-3 text-purple-500" />
                              <span className="font-semibold">{s.studentName || s.studentId}</span>
                              <span>• {new Date(s.scheduledAt).toLocaleString()}</span>
                              <span>• {s.mode}</span>
                              <span className={`ml-auto px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                s.status === 'scheduled' ? 'bg-emerald-100 text-emerald-700'
                                : s.status === 'completed' ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-200 text-slate-600'
                              }`}>{s.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-8"></th>
                        <th className="py-2.5 px-3">Candidate</th>
                        <th className="py-2.5 px-3 text-center">AI Match</th>
                        <th className="py-2.5 px-3">Applied</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pipelineApps.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">No applicants for this job yet.</td></tr>
                      ) : pipelineApps.map(app => (
                        <tr key={app.id} className={`hover:bg-slate-50/80 transition-colors ${selectedCandidateIds.has(app.id) ? 'bg-indigo-50/50' : ''}`}>
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.has(app.id)}
                              onChange={() => toggleCandidate(app.id)}
                              className="w-3.5 h-3.5 rounded accent-indigo-600"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{app.studentName}</div>
                            <div className="text-[11px] text-slate-400">ID: {app.studentId}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-extrabold text-[11px] ${
                              app.aiMatchScore >= 90
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : app.aiMatchScore >= 80
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {app.aiMatchScore}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">{formatDisplayDate(app.appliedDate)}</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">{app.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Active Job Postings Matrix — recruiter-owned only, with lifecycle actions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">My Job & Internship Postings</h2>
                <p className="text-xs text-slate-500">Edit criteria, close, or mark positions filled — applicants are notified automatically</p>
              </div>
              <button
                onClick={() => { resetForm(); setActiveTab('post-job'); }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create New Post</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search my postings by title, company, or location…"
                value={postingSearch}
                onChange={(e) => setPostingSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {loadingMine ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading your postings…</p>
            ) : filteredMyJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {myJobs.length === 0
                  ? 'You have not posted any vacancies yet. Create your first posting to start receiving AI-matched candidates.'
                  : 'No postings match your search.'}
              </p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMyJobs.map((job) => (
                <div key={job.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900">{job.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        (job.status || 'open') === 'open'
                          ? 'bg-emerald-100 text-emerald-800'
                          : (job.status || 'open') === 'filled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {(job.status || 'open') === 'open' ? 'Open' : (job.status || 'open') === 'filled' ? 'Filled' : 'Closed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{job.company} • {job.location}</p>
                    <p className="text-xs font-bold text-emerald-700 mt-1">{job.stipendOrSalary}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.requiredSkills.map((rs, idx) => (
                        <span key={idx} className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-medium">
                          {rs.name} (&gt;{rs.minScore}%)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Openings: <strong>{job.openings}</strong></span>
                      <span>Deadline: {job.deadline || '—'}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        onClick={() => openPipeline(job.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] ${
                          pipelineJobId === job.id
                            ? 'bg-indigo-700 text-white'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                        }`}
                        title="Open candidate pipeline for this job"
                      >
                        <Users className="w-3 h-3" />
                        <span>Candidates ({myApps.filter(a => a.jobId === job.id).length})</span>
                      </button>
                      <button
                        onClick={() => startEdit(job)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px]"
                        title="Edit posting"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      {(job.status || 'open') === 'open' ? (
                        <>
                          <button
                            onClick={() => handleLifecycle(job.id, 'closed')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold text-[11px]"
                            title="Stop accepting applications"
                          >
                            <Archive className="w-3 h-3" />
                            <span>Close</span>
                          </button>
                          <button
                            onClick={() => handleLifecycle(job.id, 'filled')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px]"
                            title="Mark position as filled"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Filled</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleLifecycle(job.id, 'open')}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[11px]"
                          title="Reopen for applications"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Reopen</span>
                        </button>
                      )}
                      {(job.status || 'open') !== 'open' && (
                        <button
                          onClick={() => handleLifecycle(job.id, 'delete')}
                          className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-[11px]"
                          title="Delete permanently (no applicants allowed)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
