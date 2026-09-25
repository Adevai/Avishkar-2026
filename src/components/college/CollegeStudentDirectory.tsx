import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { StudentProfile } from '../../types';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  Award, 
  GraduationCap, 
  FileText, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Radio
} from 'lucide-react';

export const CollegeStudentDirectory: React.FC = () => {
  const { setNotification } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');

  // Live student registry from PostgreSQL — no fake fallback rows.
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStudents = () => {
    setIsLoading(true);
    setLoadError(null);
    let cancelled = false;
    api.getStudents()
      .then(data => {
        if (cancelled) return;
        setStudents(data || []);
        setIsLive(true);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setLoadError(e?.message || 'Failed to load the student registry.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  };

  useEffect(() => loadStudents(), []);

  const filtered = students.filter(s => {
    if (selectedBranch !== 'All' && !s.branch.includes(selectedBranch)) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        s.targetRole.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleVerify = (name: string) => {
    setNotification(`Institutional Skill Endorsement verified for ${name}!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Student Competency Directory & Verifier</span>
            </h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
              isLive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <Radio className={`w-3 h-3 ${isLive ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <span>{isLoading ? 'Syncing registry…' : loadError ? 'Connection error' : isLive ? 'Live institutional registry' : 'No students yet'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional verification of declared project portfolios, academic marks, and AI skill benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotification('Exporting Student Skill Registry as Excel (NIRF Audit format)...')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Export NIRF Excel
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate name, track or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Branch Filter:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-none"
          >
            <option value="All">All Engineering Branches</option>
            <option value="Computer">Computer Science</option>
            <option value="Artificial Intelligence">AI & Data Science</option>
            <option value="Electronics">Electronics & Telecom</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">Loading student registry…</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl p-12 border border-rose-200 shadow-xs text-center">
          <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-800">Could not load students</p>
          <p className="text-xs text-slate-500 mt-1">{loadError}</p>
          <button
            onClick={loadStudents}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
          >
            ↻ Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">No students match your filters</p>
          <p className="text-xs text-slate-400 mt-1">Adjust the branch filter or clear the search to see the full registry.</p>
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Branch & Semester</th>
                <th className="py-3.5 px-4 text-center">CGPA</th>
                <th className="py-3.5 px-4">Target Track</th>
                <th className="py-3.5 px-4 text-center">AI Readiness</th>
                <th className="py-3.5 px-4">Verified Skills</th>
                <th className="py-3.5 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={s.avatar}
                        alt={s.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800">{s.branch}</p>
                    <p className="text-[10px] text-slate-400">Semester {s.semester} • Class of {s.graduationYear}</p>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded">
                      {s.cgpa}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-blue-700">
                    {s.targetRole}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      s.readinessScore >= 85 ? 'bg-emerald-100 text-emerald-800' :
                      s.readinessScore >= 70 ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {s.readinessScore}%
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {s.verifiedSkills.slice(0, 3).map((vs, vIdx) => (
                        <span key={vIdx} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                          {vs.skill} ({vs.score}%)
                        </span>
                      ))}
                      {s.verifiedSkills.length > 3 && (
                        <span className="text-[9px] text-slate-400">+{s.verifiedSkills.length - 3} more</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleVerify(s.name)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl transition-colors inline-flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Endorse</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
