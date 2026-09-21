import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { Footer } from '../components/layout/Footer';
import { Toast } from '../components/common/Toast';
import { DatabaseHealthModal } from '../components/common/DatabaseHealthModal';
import { CommandPalette } from '../components/common/CommandPalette';
import { NotificationsDrawer } from '../components/common/NotificationsDrawer';
import { SkillSimulatorModal } from '../components/student/SkillSimulatorModal';
import { AICopilotModal } from '../components/ai/AICopilotModal';

import { StudentProfile } from '../components/student/StudentProfile';
import { AIAssessment } from '../components/student/AIAssessment';
import { SkillGapReport } from '../components/student/SkillGapReport';
import { LearningRoadmap } from '../components/student/LearningRoadmap';
import { JobMatches } from '../components/student/JobMatches';
import { PlacementTracker } from '../components/student/PlacementTracker';
import { ProgressAnalytics } from '../components/student/ProgressAnalytics';
import { CollegeDashboard } from '../components/college/CollegeDashboard';
import { CollegeStudentDirectory } from '../components/college/CollegeStudentDirectory';
import { MoUManager } from '../components/collaboration/MoUManager';
import { IndustryDashboard } from '../components/industry/IndustryDashboard';
import { TalentSearch } from '../components/industry/TalentSearch';
import { ProblemStatements } from '../components/collaboration/ProblemStatements';
import { GovtDashboard } from '../components/government/GovtDashboard';
import { VerificationQueue } from '../components/government/VerificationQueue';
import { WelcomeIntakeModal } from '../components/student/WelcomeIntakeModal';
import { MentorDashboard } from '../components/alumni/MentorDashboard';
import { StudentMentorship } from '../components/alumni/StudentMentorship';
import { UniversityAlumniVerificationDesk } from '../components/alumni/UniversityAlumniVerificationDesk';

import { useApp } from '../context/AppContext';
import { useSparkEvents } from '../hooks/useSparkEvents';
import { 
  Cpu,
  UserCheck, 
  BrainCircuit, 
  Radar, 
  Compass, 
  Briefcase, 
  FileCheck2,
  Zap,
  Lock
} from 'lucide-react';

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

          {/* Dynamic Component Views */}
          <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
            {currentRole === 'student' && (
              <>
                {(activeTab === 'profile' || !['assessment', 'gap-analysis', 'roadmap', 'jobs', 'applications', 'analytics', 'collaboration', 'mentorship'].includes(activeTab)) && <StudentProfile />}
                {activeTab === 'assessment' && <AIAssessment />}
                {activeTab === 'gap-analysis' && <SkillGapReport />}
                {activeTab === 'roadmap' && <LearningRoadmap />}
                {activeTab === 'jobs' && <JobMatches />}
                {activeTab === 'applications' && <PlacementTracker />}
                {activeTab === 'analytics' && <ProgressAnalytics />}
                {activeTab === 'collaboration' && <ProblemStatements />}
                {activeTab === 'mentorship' && <StudentMentorship />}
              </>
            )}

            {currentRole === 'college' && (
              <>
                {(activeTab === 'overview' || activeTab === 'dept-analysis' || activeTab === 'placement-drives' || !['students', 'mous', 'alumni-desk'].includes(activeTab)) && <CollegeDashboard />}
                {activeTab === 'students' && <CollegeStudentDirectory />}
                {activeTab === 'mous' && <MoUManager />}
                {activeTab === 'alumni-desk' && <UniversityAlumniVerificationDesk />}
              </>
            )}

            {currentRole === 'industry' && (
              <>
                {(activeTab === 'dashboard' || activeTab === 'post-job' || !['talent-search', 'problem-statements', 'mous'].includes(activeTab)) && <IndustryDashboard />}
                {activeTab === 'talent-search' && <TalentSearch />}
                {activeTab === 'problem-statements' && <ProblemStatements />}
                {activeTab === 'mous' && <MoUManager />}
              </>
            )}

            {currentRole === 'government' && (
              <>
                {activeTab === 'verification-queue' ? <VerificationQueue /> : <GovtDashboard />}
              </>
            )}

            {currentRole === 'alumni' && <MentorDashboard initialSection={activeTab} />}
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
