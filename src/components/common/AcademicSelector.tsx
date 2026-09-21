import React, { useState, useEffect } from 'react';
import { Layers, GraduationCap, GitBranch, Edit3, Check } from 'lucide-react';
import { ACADEMIC_STREAMS, AcademicStream, inferStreamFromDegreeOrBranch } from '../../data/academicHierarchy';

interface AcademicSelectorProps {
  selectedDegree: string;
  selectedBranch: string;
  onDegreeChange: (degree: string) => void;
  onBranchChange: (branch: string) => void;
  className?: string;
  compact?: boolean;
}

export const AcademicSelector: React.FC<AcademicSelectorProps> = ({
  selectedDegree,
  selectedBranch,
  onDegreeChange,
  onBranchChange,
  className = '',
  compact = false
}) => {
  // Infer active stream based on initial degree/branch
  const [activeStreamId, setActiveStreamId] = useState<string>(() => {
    return inferStreamFromDegreeOrBranch(selectedDegree, selectedBranch).id;
  });

  const [customBranch, setCustomBranch] = useState<string>('');
  const [isCustomBranchMode, setIsCustomBranchMode] = useState<boolean>(() => {
    const stream = ACADEMIC_STREAMS.find(s => s.id === activeStreamId);
    return stream ? !stream.branches.includes(selectedBranch) && selectedBranch.trim().length > 0 : false;
  });

  const activeStream: AcademicStream = 
    ACADEMIC_STREAMS.find(s => s.id === activeStreamId) || ACADEMIC_STREAMS[0];

  // Handle stream change
  const handleStreamChange = (newStreamId: string) => {
    setActiveStreamId(newStreamId);
    const targetStream = ACADEMIC_STREAMS.find(s => s.id === newStreamId) || ACADEMIC_STREAMS[0];
    
    // Automatically select the first degree and branch of the new stream
    const defaultDegree = targetStream.degrees[0]?.name || '';
    const defaultBranch = targetStream.branches[0] || '';
    
    onDegreeChange(defaultDegree);
    onBranchChange(defaultBranch);
    setIsCustomBranchMode(false);
    setCustomBranch('');
  };

  // Handle branch select change
  const handleBranchSelect = (branchVal: string) => {
    if (branchVal.startsWith('Other') || branchVal === '__custom__') {
      setIsCustomBranchMode(true);
      onBranchChange(customBranch || 'Interdisciplinary Specialization');
    } else {
      setIsCustomBranchMode(false);
      onBranchChange(branchVal);
    }
  };

  const handleCustomBranchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomBranch(val);
    onBranchChange(val);
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      
      {/* 1. PRIMARY STREAM / PARENT DOMAIN */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Primary Academic Stream</span>
          </label>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {activeStream.badge}
          </span>
        </div>

        <select
          value={activeStreamId}
          onChange={(e) => handleStreamChange(e.target.value)}
          className="mt-1 block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-slate-50/70 hover:bg-slate-50 font-semibold text-slate-800 transition-colors"
        >
          {ACADEMIC_STREAMS.map((stream) => (
            <option key={stream.id} value={stream.id}>
              {stream.name} ({stream.badge})
            </option>
          ))}
        </select>
      </div>

      {/* 2 & 3. DEGREE TYPE & BRANCH / SPECIALIZATION */}
      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        
        {/* Degree Selection */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Degree / Program</span>
          </label>
          <select
            value={selectedDegree}
            onChange={(e) => onDegreeChange(e.target.value)}
            className="mt-1 block w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium text-slate-800"
          >
            {activeStream.degrees.map((deg) => (
              <option key={deg.id} value={deg.name}>
                {deg.name} � {deg.durationYears} Yrs
              </option>
            ))}
          </select>
        </div>

        {/* Branch / Specialization Selection */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
            <span>Branch / Core Discipline</span>
          </label>

          {!isCustomBranchMode ? (
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchSelect(e.target.value)}
              className="mt-1 block w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium text-slate-800"
            >
              {activeStream.branches.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
              <option value="__custom__">? Other / Specialized Course (Type custom)...</option>
            </select>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                required
                autoFocus
                value={customBranch}
                onChange={handleCustomBranchInput}
                placeholder="Type custom discipline (e.g. Mechatronics, Bio-Law)..."
                className="flex-1 px-3 py-2.5 text-xs sm:text-sm border border-blue-400 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomBranchMode(false);
                  onBranchChange(activeStream.branches[0]);
                }}
                className="px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                title="Return to standard list"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
