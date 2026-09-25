import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

import { api } from '../../services/api';
import { StudentProfile } from '../../types';
import { 
  Search, 
  Sparkles, 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Send, 
  Filter,
  SlidersHorizontal,
  Mail,
  ExternalLink,
  RefreshCw,
  Radio,
  AlertTriangle
} from 'lucide-react';

export const TalentSearch: React.FC = () => {
  const { setNotification } = useApp();
  const [minScore, setMinScore] = useState<number>(70);
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Live talent pool from PostgreSQL — no fake fallback rows; the UI
  // shows honest loading / error / empty states instead.
  const [talentPool, setTalentPool] = useState<StudentProfile[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoadingPool, setIsLoadingPool] = useState<boolean>(true);
  const [poolError, setPoolError] = useState<string | null>(null);

  const loadPool = () => {
    setIsLoadingPool(true);
    setPoolError(null);
    let cancelled = false;
    api.getStudents()
      .then(students => {
        if (cancelled) return;
        setTalentPool(students || []);
        setIsLive(true);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setPoolError(e?.message || 'Failed to load the talent pool.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPool(false);
      });
    return () => { cancelled = true; };
  };

  useEffect(() => loadPool(), []);

  const filteredTalent = talentPool.filter(s => {
    if (s.readinessScore < minScore) return false;
    if (roleFilter !== 'All' && !s.targetRole.includes(roleFilter)) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.college.toLowerCase().includes(q) ||
        s.declaredSkills.some(sk => sk.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSendInvite = (studentName: string) => {
    setNotification(`Direct Interview Invitation sent to ${studentName}!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span>AI Automated Candidate Search & Talent Filter</span>
            </h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
              isLive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <Radio className={`w-3 h-3 ${isLive ? 'text-emerald-600' : 'text-slate-400'} ${isLive ? 'animate-pulse' : ''}`} />
              <span>{isLoadingPool ? 'Syncing talent pool…' : poolError ? 'Connection error' : isLive ? 'Live PostgreSQL pool' : 'No candidates yet'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Zero resume exaggeration: Screen students based on verified coding, cloud, and systems benchmarks.
          </p>
        </div>

        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 self-start sm:self-auto">
          {isLoadingPool ? (
            <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> Loading…</span>
          ) : (
            `${filteredTalent.length} Pre-vetted Candidates Available`
          )}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by skill (e.g. Docker, React), name, college..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>Min AI Readiness:</span>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="bg-transparent font-bold text-blue-700 focus:outline-none"
            >
              <option value={60}>&gt;= 60%</option>
              <option value={70}>&gt;= 70% (Proficient)</option>
              <option value={80}>&gt;= 80% (High Performer)</option>
              <option value={90}>&gt;= 90% (Elite Tier)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span>Career Track:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-700 focus:outline-none"
            >
              <option value="All">All Tracks</option>
              <option value="Cloud">Cloud & Full Stack</option>
              <option value="AI">AI & Data Science</option>
              <option value="DevOps">DevOps & SRE</option>
              <option value="Embedded">Embedded & IoT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Honest empty / error states — no fake candidate rows */}
      {isLoadingPool ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">Loading live talent pool…</p>
        </div>
      ) : poolError ? (
        <div className="bg-white rounded-2xl p-12 border border-rose-200 shadow-xs text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-800">Could not load candidates</p>
          <p className="text-xs text-slate-500 mt-1">{poolError}</p>
          <button
            onClick={loadPool}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
          >
            ↻ Retry
          </button>
        </div>
      ) : filteredTalent.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">No candidates match your filters</p>
          <p className="text-xs text-slate-400 mt-1">Try widening the readiness threshold or clearing the search.</p>
        </div>
      ) : null}

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTalent.map((candidate) => (
          <div
            key={candidate.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={candidate.avatar}
                    alt={candidate.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-snug">{candidate.name}</h2>
                    <p className="text-xs text-slate-500">{candidate.college}</p>
                    <p className="text-[11px] font-semibold text-blue-700 mt-0.5">{candidate.targetRole}</p>
                  </div>
                </div>

                <div className="text-center px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <p className="text-sm font-extrabold">{candidate.readinessScore}%</p>
                  <p className="text-[9px] font-bold uppercase">AI Readiness</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 mb-3">
                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                  {candidate.branch}
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                  CGPA: {candidate.cgpa}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  Graduating {candidate.graduationYear}
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                {candidate.bio}
              </p>

              {/* Verified Skills */}
              <div className="space-y-1.5 mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  AI-Verified Competency Scores
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {candidate.verifiedSkills.map((vs, idx) => (
                    <div key={idx} className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="font-medium text-slate-700 truncate pr-1">{vs.skill}</span>
                      <span className="font-bold text-emerald-700 shrink-0">{vs.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Resume: {candidate.resumeUploaded ? 'Verified PDF' : 'Not Provided'}
              </span>
              <button
                onClick={() => handleSendInvite(candidate.name)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Interview Invite</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
