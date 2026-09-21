import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { 
  Search, 
  Sparkles, 
  GraduationCap, 
  Building2, 
  Briefcase, 
  Landmark, 
  Compass, 
  Radar, 
  FileCheck2, 
  Lightbulb, 
  Database,
  ArrowRight,
  X
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDbModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenDbModal }) => {
  const { currentRole, setActiveTab, setIsCopilotOpen, jobs, mous } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle palette
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    // Student Workspace Actions
    ...(currentRole === 'student' ? [
      { category: 'Student Actions', title: '1. Profile & Skill Intake', icon: <GraduationCap className="w-4 h-4 text-blue-600" />, action: () => { setActiveTab('profile'); onClose(); } },
      { category: 'Student Actions', title: '2. Take AI Skill Assessment', icon: <Sparkles className="w-4 h-4 text-amber-500" />, action: () => { setActiveTab('assessment'); onClose(); } },
      { category: 'Student Actions', title: '3. View Skill Gap Radar Report', icon: <Radar className="w-4 h-4 text-indigo-600" />, action: () => { setActiveTab('gap-analysis'); onClose(); } },
      { category: 'Student Actions', title: '4. Personalized Learning Roadmaps', icon: <Compass className="w-4 h-4 text-emerald-600" />, action: () => { setActiveTab('roadmap'); onClose(); } },
      { category: 'Student Actions', title: '5. Match Internships & Jobs', icon: <Briefcase className="w-4 h-4 text-blue-600" />, action: () => { setActiveTab('jobs'); onClose(); } },
      { category: 'Student Actions', title: '6. Placement & Career Tracking', icon: <FileCheck2 className="w-4 h-4 text-purple-600" />, action: () => { setActiveTab('applications'); onClose(); } },
    ] : []),

    // College / Academia Actions
    ...(currentRole === 'college' ? [
      { category: 'Faculty & TPO Actions', title: 'TPO Placement & Batch Overview', icon: <Building2 className="w-4 h-4 text-purple-600" />, action: () => { setActiveTab('overview'); onClose(); } },
      { category: 'Faculty & TPO Actions', title: 'Department Skill Gap Analytics', icon: <Radar className="w-4 h-4 text-purple-600" />, action: () => { setActiveTab('dept-analysis'); onClose(); } },
      { category: 'Faculty & TPO Actions', title: 'Student Talent Directory', icon: <GraduationCap className="w-4 h-4 text-purple-600" />, action: () => { setActiveTab('students'); onClose(); } },
      { category: 'Faculty & TPO Actions', title: 'Manage Industry MoUs', icon: <Building2 className="w-4 h-4 text-purple-600" />, action: () => { setActiveTab('mous'); onClose(); } },
      { category: 'Faculty & TPO Actions', title: 'Campus Placement Drives', icon: <Briefcase className="w-4 h-4 text-purple-600" />, action: () => { setActiveTab('placement-drives'); onClose(); } },
    ] : []),

    // Industry Actions
    ...(currentRole === 'industry' ? [
      { category: 'Recruiter Actions', title: 'Corporate Recruitment Hub', icon: <Briefcase className="w-4 h-4 text-emerald-600" />, action: () => { setActiveTab('dashboard'); onClose(); } },
      { category: 'Recruiter Actions', title: 'AI Competency Talent Search', icon: <GraduationCap className="w-4 h-4 text-emerald-600" />, action: () => { setActiveTab('talent-search'); onClose(); } },
      { category: 'Recruiter Actions', title: 'Post New Vacancy / Internship', icon: <Briefcase className="w-4 h-4 text-emerald-600" />, action: () => { setActiveTab('post-job'); onClose(); } },
      { category: 'Recruiter Actions', title: 'Publish R&D Problem Statement', icon: <Building2 className="w-4 h-4 text-emerald-600" />, action: () => { setActiveTab('problem-statements'); onClose(); } },
      { category: 'Recruiter Actions', title: 'Manage Academia MoUs', icon: <Building2 className="w-4 h-4 text-emerald-600" />, action: () => { setActiveTab('mous'); onClose(); } },
    ] : []),

    // Government Actions
    ...(currentRole === 'government' ? [
      { category: 'Governance Actions', title: 'State Employability Dashboard', icon: <Landmark className="w-4 h-4 text-amber-600" />, action: () => { setActiveTab('overview'); onClose(); } },
      { category: 'Governance Actions', title: 'NEP 2020 Compliance Matrix', icon: <Landmark className="w-4 h-4 text-amber-600" />, action: () => { setActiveTab('nep2020'); onClose(); } },
      { category: 'Governance Actions', title: 'Skill Supply & Demand Trends', icon: <Landmark className="w-4 h-4 text-amber-600" />, action: () => { setActiveTab('skill-trends'); onClose(); } },
    ] : []),
    
    // System Actions
    { category: 'System Tools', title: 'Launch S.P.A.R.K. AI Copilot', icon: <Sparkles className="w-4 h-4 text-amber-400" />, action: () => { setIsCopilotOpen(true); onClose(); } },
    { category: 'System Tools', title: 'Inspect PostgreSQL 18 Live Telemetry', icon: <Database className="w-4 h-4 text-emerald-600" />, action: () => { onOpenDbModal(); onClose(); } },
  ];

  // Also include matching jobs for students
  const jobActions = currentRole === 'student' ? jobs.map(j => ({
    category: 'Job & Internship Openings',
    title: `${j.title} @ ${j.company} (${j.stipendOrSalary})`,
    icon: <Briefcase className="w-4 h-4 text-blue-600" />,
    action: () => { setActiveTab('jobs'); onClose(); },
  })) : [];

  const allActions = [...actions, ...jobActions];

  const filtered = allActions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/60 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/90 overflow-hidden">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-700 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, role, or search opportunities (e.g. Cloud, Assessment, MoU)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-600 font-medium"
          />
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
            ESC
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-700 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-700">
              No matching actions found for "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-100/50 text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-white/60 flex items-center justify-center border border-slate-200/80 shrink-0 transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-700 font-medium">
                      {item.category}
                    </p>
                  </div>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-700">
          <span>Tip: Press <strong>Ctrl + K</strong> from any screen to search</span>
          <span className="font-semibold text-slate-700">S.P.A.R.K. Command Engine</span>
        </div>

      </div>
    </div>
  );
};
