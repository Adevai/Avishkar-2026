import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserCheck,
  BrainCircuit,
  Radar,
  Compass,
  Briefcase,
  FileCheck2,
  Lightbulb,
  Building2,
  Users,
  Handshake,
  BarChart3,
  Search,
  PlusCircle,
  FileText,
  Landmark,
  ClipboardCheck,
  TrendingUp,
  ShieldCheck,
  Award,
  GraduationCap,
  Inbox,
  MessageSquare,
  Zap,
  Lock
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentRole, activeTab, setActiveTab, isAssessmentActive, setNotification } = useApp();

  const studentNav = [
    { id: 'profile', label: '1. Profile & Skills', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'assessment', label: '2. AI Skill Assessment', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'gap-analysis', label: '3. Skill Gap Analysis', icon: <Radar className="w-4 h-4" /> },
    { id: 'roadmap', label: '4. Learning Roadmaps', icon: <Compass className="w-4 h-4" /> },
    { id: 'jobs', label: '5. Opportunity Matching', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'applications', label: '6. Placement Tracking', icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 'analytics', label: '7. Progress Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'collaboration', label: '8. Capstone Challenges', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'mentorship', label: '9. Alumni Mentorship', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  const collegeNav = [
    { id: 'overview', label: 'TPO Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'dept-analysis', label: 'Department Skill Gaps', icon: <Radar className="w-4 h-4" /> },
    { id: 'students', label: 'Student Directory', icon: <Users className="w-4 h-4" /> },
    { id: 'mous', label: 'Industry MoUs', icon: <Handshake className="w-4 h-4" /> },
    { id: 'placement-drives', label: 'Placement Drives', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'alumni-desk', label: 'Alumni Verification Desk', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  const industryNav = [
    { id: 'dashboard', label: 'Recruitment Hub', icon: <Building2 className="w-4 h-4" /> },
    { id: 'talent-search', label: 'AI Talent Search', icon: <Search className="w-4 h-4" /> },
    { id: 'post-job', label: 'Post Vacancy', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'problem-statements', label: 'R&D Capstone Challenges', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'mous', label: 'Academia MoUs', icon: <Handshake className="w-4 h-4" /> },
  ];

  const governmentNav = [
    { id: 'overview', label: 'State Employability', icon: <Landmark className="w-4 h-4" /> },
    { id: 'verification-queue', label: 'Verification Review', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'nep2020', label: 'NEP 2020 Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'skill-trends', label: 'Demand vs Supply', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'regional', label: 'Regional & Tier Analysis', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const alumniNav = [
    { id: 'requests', label: 'Mentorship Requests', icon: <Inbox className="w-4 h-4" /> },
    { id: 'mentees', label: 'My Mentees', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'fasttrack', label: 'Fast-Track Referrals', icon: <Zap className="w-4 h-4" /> },
    { id: 'find-mentor', label: 'Find a Mentor', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  let navItems = studentNav;
  if (currentRole === 'college') navItems = collegeNav;
  if (currentRole === 'industry') navItems = industryNav;
  if (currentRole === 'government') navItems = governmentNav;
  if (currentRole === 'alumni') navItems = alumniNav;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between p-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)] min-h-[calc(100vh-4rem)]">
      <div>
        {/* Role Header Banner */}
        <div className="mb-4 pb-3 border-b border-slate-100 px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              {currentRole} Workspace
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-700 mt-1">
            {currentRole === 'student' && 'Smart Career Roadmap'}
            {currentRole === 'college' && 'Academia Governance'}
            {currentRole === 'industry' && 'Talent & Innovation'}
            {currentRole === 'government' && 'Policy & Macro-Analytics View'}
            {currentRole === 'alumni' && 'Verified Mentor Network'}
          </p>
        </div>

        {/* Navigation Link List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isLocked = isAssessmentActive && item.id !== 'assessment';

            return (
              <button
                key={item.id}
                disabled={isLocked}
                onClick={() => {
                  if (isLocked) {
                    setNotification('⚠️ Assessment in progress! You cannot leave this screen until you submit your test.');
                    return;
                  }
                  setActiveTab(item.id);
                }}
                title={isLocked ? 'Locked: Complete your assessment test first' : item.label}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left border ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white border-transparent shadow-[0_4px_15px_-3px_rgba(37,99,235,0.4)]'
                    : isLocked
                    ? 'text-slate-700 bg-slate-50 border-transparent cursor-not-allowed opacity-100'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={isActive ? 'text-white' : isLocked ? 'text-slate-700' : 'text-slate-700'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {isLocked && <Lock className="w-3 h-3 text-blue-400 shrink-0 ml-1" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Badge */}
      <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-xs shadow-lg">
        <div className="flex items-center gap-2 text-white font-bold mb-1">
          <Award className="w-4 h-4 text-blue-400" />
          <span>S.P.A.R.K. Standard</span>
        </div>
        <p className="text-[11px] text-slate-700 leading-relaxed">
          Aligned to NEP 2020 credits, AICTE internship norms & industry competency benchmarks.
        </p>
      </div>
    </aside>
  );
};
