import React, { Suspense, lazy } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { Footer } from '../components/layout/Footer';
import { Toast } from '../components/common/Toast';
import { DatabaseHealthModal } from '../components/common/DatabaseHealthModal';
import { CommandPalette } from '../components/common/CommandPalette';
import { NotificationsDrawer } from '../components/common/NotificationsDrawer';
import { SkillSimulatorModal } from '../components/student/SkillSimulatorModal';
import { AICopilotModal } from '../components/ai/AICopilotModal';

// Default-view stays eager (first paint); everything else is code-split so
// the Dashboard chunk stops carrying the whole app (was 600+ kB).
import { StudentProfile } from '../components/student/StudentProfile';

const AIAssessment = lazy(() => import('../components/student/AIAssessment').then(m => ({ default: m.AIAssessment })));
const SkillGapReport = lazy(() => import('../components/student/SkillGapReport').then(m => ({ default: m.SkillGapReport })));
const LearningRoadmap = lazy(() => import('../components/student/LearningRoadmap').then(m => ({ default: m.LearningRoadmap })));
const JobMatches = lazy(() => import('../components/student/JobMatches').then(m => ({ default: m.JobMatches })));
const PlacementTracker = lazy(() => import('../components/student/PlacementTracker').then(m => ({ default: m.PlacementTracker })));
const ProgressAnalytics = lazy(() => import('../components/student/ProgressAnalytics').then(m => ({ default: m.ProgressAnalytics })));
const CollegeDashboard = lazy(() => import('../components/college/CollegeDashboard').then(m => ({ default: m.CollegeDashboard })));
const CollegeStudentDirectory = lazy(() => import('../components/college/CollegeStudentDirectory').then(m => ({ default: m.CollegeStudentDirectory })));
const CollegeApprovalsPanel = lazy(() => import('../components/college/CollegeApprovalsPanel').then(m => ({ default: m.CollegeApprovalsPanel })));
const MoUManager = lazy(() => import('../components/collaboration/MoUManager').then(m => ({ default: m.MoUManager })));
const IndustryDashboard = lazy(() => import('../components/industry/IndustryDashboard').then(m => ({ default: m.IndustryDashboard })));
const TalentSearch = lazy(() => import('../components/industry/TalentSearch').then(m => ({ default: m.TalentSearch })));
const ProblemStatements = lazy(() => import('../components/collaboration/ProblemStatements').then(m => ({ default: m.ProblemStatements })));
const GovtDashboard = lazy(() => import('../components/government/GovtDashboard').then(m => ({ default: m.GovtDashboard })));
const VerificationQueue = lazy(() => import('../components/government/VerificationQueue').then(m => ({ default: m.VerificationQueue })));
const AdminVerificationPanel = lazy(() => import('../components/government/AdminVerificationPanel').then(m => ({ default: m.AdminVerificationPanel })));
const WelcomeIntakeModal = lazy(() => import('../components/student/WelcomeIntakeModal').then(m => ({ default: m.WelcomeIntakeModal })));
const MentorDashboard = lazy(() => import('../components/alumni/MentorDashboard').then(m => ({ default: m.MentorDashboard })));
const StudentMentorship = lazy(() => import('../components/alumni/StudentMentorship').then(m => ({ default: m.StudentMentorship })));
const UniversityAlumniVerificationDesk = lazy(() => import('../components/alumni/UniversityAlumniVerificationDesk').then(m => ({ default: m.UniversityAlumniVerificationDesk })));

const TabSuspense: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-500">Loading module…</p>
      </div>
    </div>
  }>
    {children}
  </Suspense>
);

import { useApp } from '../context/AppContext';
import { useSparkEvents } from '../hooks/useSparkEvents';
import { api } from '../services/api';
import {
  Cpu,
  UserCheck, 
  BrainCircuit, 
  Radar, 
  Compass, 
  Briefcase, 
  FileCheck2,
  Zap,
  Lock,
  Clock,
  BadgeCheck,
  ShieldAlert,
  FileText,
  Loader2
} from 'lucide-react';

/**
 * Banner shown to college/industry accounts rejected at the admin desk:
 * explains why and offers a signed-link re-download of their own uploaded
 * certificate so they can inspect and re-submit it.
 */
const RejectedVerificationBanner: React.FC = () => {
  const { setNotification } = useApp();
  const [dismissed, setDismissed] = React.useState<boolean>(() => {
    try { return sessionStorage.getItem('spark_rejected_banner_dismissed') === '1'; } catch { return false; }
  });
  const [busy, setBusy] = React.useState(false);

  const reDownload = async () => {
    setBusy(true);
    try {
      const { url } = await api.getMyDocumentUrl();
      window.open(url, '_blank', 'noopener');
    } catch (err: any) {
      setNotification(err.message || 'Could not open your certificate.');
    } finally {
      setBusy(false);
    }
  };

  if (dismissed) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-rose-50/90 border border-rose-300 flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-rose-900 flex items-center gap-2">
          Verification was not approved
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200/70 text-rose-900">
            REJECTED
          </span>
        </p>
        <p className="text-xs text-rose-800 mt-1 leading-relaxed">
          The platform admin could not verify your uploaded certificate — check the reason in your
          notifications. You can re-download it below, then re-upload a corrected scan to resubmit.
        </p>
        <button
          onClick={reDownload}
          disabled={busy}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-bold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          Re-download my certificate
        </button>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          try { sessionStorage.setItem('spark_rejected_banner_dismissed', '1'); } catch { /* ignore */ }
        }}
        className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
};

/**
 * Banner shown to students whose account is still awaiting their college's
 * TPO approval (personal-email registrations). Fully functional browsing is
 * allowed — the banner just explains why a "pending" chip appears.
 */
const PendingApprovalBanner: React.FC = () => {
  const [status, setStatus] = React.useState<string | null>(null);
  const [dismissed, setDismissed] = React.useState<boolean>(() => {
    try { return sessionStorage.getItem('spark_pending_banner_dismissed') === '1'; } catch { return false; }
  });

  React.useEffect(() => {
    let cancelled = false;
    api.getVerificationStatus()
      .then(r => { if (!cancelled) setStatus(r.verificationStatus || null); })
      .catch(() => { /* banner is informational only */ });
    return () => { cancelled = true; };
  }, []);

  if (dismissed || status !== 'pending_college_approval') return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-300 flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
          Account pending college approval
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/70 text-amber-900">
            <Clock className="w-3 h-3" /> PENDING_COLLEGE_APPROVAL
          </span>
        </p>
        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
          You signed up with a personal email address, so your college's Training &amp; Placement office needs to
          confirm you. Everything below still works — a verified badge appears automatically once they approve.
          Registered with your college domain (e.g. @college.ac.in)? You'd be verified instantly.
        </p>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          try { sessionStorage.setItem('spark_pending_banner_dismissed', '1'); } catch { /* ignore */ }
        }}
        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { 
    currentRole, 
    activeTab, 
    setActiveTab, 
    isAssessmentActive,
    notification, 
    setNotification,
    isDbModalOpen,
    setIsDbModalOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isNotificationsOpen,
    setIsNotificationsOpen,
    isSimulatorOpen,
    setIsSimulatorOpen
  } = useApp();

  // Real-time push updates: application stages, new jobs, MoUs (SSE)
  useSparkEvents();

  // Welcome Intake modal for newly registered or uncalibrated students
  const [isWelcomeIntakeOpen, setIsWelcomeIntakeOpen] = React.useState<boolean>(() => {
    if (currentRole !== 'student') return false;
    const completed = localStorage.getItem('spark_intake_completed');
    const isNewRegistration = localStorage.getItem('spark_new_registration');
    return isNewRegistration === 'true' || completed !== 'true';
  });

  const solutionWorkflowSteps = [
    { id: 'profile', step: 1, title: 'Student Profile', desc: 'Skill Intake', icon: <UserCheck className="w-3.5 h-3.5" /> },
    { id: 'assessment', step: 2, title: 'AI Assessment', desc: 'Competency Test', icon: <BrainCircuit className="w-3.5 h-3.5" /> },
    { id: 'gap-analysis', step: 3, title: 'Gap Analysis', desc: 'Radar Benchmarks', icon: <Radar className="w-3.5 h-3.5" /> },
    { id: 'roadmap', step: 4, title: 'Learning Roadmap', desc: 'NPTEL & SWAYAM', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'jobs', step: 5, title: 'Smart Matching', desc: 'Internships & Jobs', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'applications', step: 6, title: 'Outcome Tracking', desc: 'ATS & Placements', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-500/30 selection:text-blue-900 antialiased animate-in fade-in duration-500 relative">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <div className="flex-1 max-w-[1400px] w-full mx-auto flex">
          <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          
          {/* Pending college approval explainer (students) */}
          {currentRole === 'student' && <PendingApprovalBanner />}

          {/* Rejected verification explainer + certificate re-download (college/industry) */}
          {(currentRole === 'college' || currentRole === 'industry') && <RejectedVerificationBanner />}

          {/* Solution Workflow Interactive Visualizer (Linear Style Pipeline) */}
          {currentRole === 'student' && (
            <div className="mb-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hidden xl:block">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600 fill-blue-500" />
                  <span>S.P.A.R.K. End-to-End Solution Workflow</span>
                </span>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 tracking-wide">
                  Smart Automation Pipeline
                </span>
              </div>

              <div className="grid grid-cols-6 gap-3 relative">
                {solutionWorkflowSteps.map((s) => {
                  const isActive = activeTab === s.id;
                  const isLocked = isAssessmentActive && s.id !== 'assessment';

                  return (
                    <button
                      key={s.id}
                      disabled={isLocked}
                      onClick={() => {
                        if (isLocked) {
                          setNotification('⚠️ Assessment in progress! You must complete and submit your test before switching steps.');
                          return;
                        }
                        setActiveTab(s.id);
                      }}
                      title={isLocked ? 'Locked: Complete your assessment test first' : s.title}
                      className={`flex items-center gap-3 p-3 rounded-xl text-left border transition-all duration-300 relative overflow-hidden group ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white border-transparent shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)]'
                          : isLocked
                          ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-100'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : isLocked
                          ? 'bg-slate-200/60 text-slate-700'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600'
                      }`}>
                        {isLocked ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : s.step}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : isLocked ? 'text-slate-500' : 'text-slate-900'}`}>
                            {s.title}
                          </p>
                          {isLocked && <Lock className="w-2.5 h-2.5 text-blue-400 shrink-0" />}
                        </div>
                        <p className={`text-[10px] font-medium truncate ${isActive ? 'text-white/80' : 'text-slate-700'}`}>
                          {isLocked ? 'Evaluation Locked' : s.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Component Views (code-split via TabSuspense) */}
          <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
            {currentRole === 'student' && (
              <TabSuspense>
                {(activeTab === 'profile' || !['assessment', 'gap-analysis', 'roadmap', 'jobs', 'applications', 'analytics', 'collaboration', 'mentorship'].includes(activeTab)) && <StudentProfile />}
                {activeTab === 'assessment' && <AIAssessment />}
                {activeTab === 'gap-analysis' && <SkillGapReport />}
                {activeTab === 'roadmap' && <LearningRoadmap />}
                {activeTab === 'jobs' && <JobMatches />}
                {activeTab === 'applications' && <PlacementTracker />}
                {activeTab === 'analytics' && <ProgressAnalytics />}
                {activeTab === 'collaboration' && <ProblemStatements />}
                {activeTab === 'mentorship' && <StudentMentorship />}
              </TabSuspense>
            )}

            {currentRole === 'college' && (
              <TabSuspense>
                {(activeTab === 'overview' || activeTab === 'dept-analysis' || activeTab === 'placement-drives' || !['students', 'mous', 'alumni-desk', 'approvals'].includes(activeTab)) && <CollegeDashboard />}
                {activeTab === 'students' && <CollegeStudentDirectory />}
                {activeTab === 'mous' && <MoUManager />}
                {activeTab === 'alumni-desk' && <UniversityAlumniVerificationDesk />}
                {activeTab === 'approvals' && <CollegeApprovalsPanel />}
              </TabSuspense>
            )}

            {currentRole === 'industry' && (
              <TabSuspense>
                {(activeTab === 'dashboard' || activeTab === 'post-job' || !['talent-search', 'problem-statements', 'mous'].includes(activeTab)) && <IndustryDashboard />}
                {activeTab === 'talent-search' && <TalentSearch />}
                {activeTab === 'problem-statements' && <ProblemStatements />}
                {activeTab === 'mous' && <MoUManager />}
              </TabSuspense>
            )}

            {currentRole === 'government' && (
              <TabSuspense>
                {activeTab === 'verification-queue' && <VerificationQueue />}
                {activeTab === 'admin-desk' && <AdminVerificationPanel />}
                {activeTab !== 'verification-queue' && activeTab !== 'admin-desk' && <GovtDashboard />}
              </TabSuspense>
            )}

            {currentRole === 'alumni' && (
              <TabSuspense>
                <MentorDashboard initialSection={activeTab} />
              </TabSuspense>
            )}
          </div>
        </main>
      </div>

      <Footer />

      {/* Floating Modern Modals & Drawers */}
      <Toast message={notification} onClose={() => setNotification(null)} />
      <DatabaseHealthModal isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)} />
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenDbModal={() => setIsDbModalOpen(true)}
      />
      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <SkillSimulatorModal isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} />
      <AICopilotModal />
      <WelcomeIntakeModal 
        isOpen={isWelcomeIntakeOpen} 
        onClose={() => {
          setIsWelcomeIntakeOpen(false);
          localStorage.setItem('spark_intake_completed', 'true');
          localStorage.removeItem('spark_new_registration');
        }} 
      />
      </div>
    </div>
  );
};
