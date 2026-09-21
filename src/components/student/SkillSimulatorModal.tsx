import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  SlidersHorizontal, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  X,
  Target,
  Award
} from 'lucide-react';

interface SkillSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkillSimulatorModal: React.FC<SkillSimulatorModalProps> = ({ isOpen, onClose }) => {
  const { student, updateStudentProfile, setNotification, setActiveTab } = useApp();

  const [simK8s, setSimK8s] = useState<number>(38);
  const [simDocker, setSimDocker] = useState<number>(54);
  const [simSysDesign, setSimSysDesign] = useState<number>(62);

  if (!isOpen) return null;

  // Calculate simulated readiness
  const baseReadiness = student.readinessScore;
  const k8sDelta = Math.max(0, simK8s - 38) * 0.25;
  const dockerDelta = Math.max(0, simDocker - 54) * 0.2;
  const sysDelta = Math.max(0, simSysDesign - 62) * 0.15;
  const simulatedReadiness = Math.min(99, Math.round(baseReadiness + k8sDelta + dockerDelta + sysDelta));

  // Simulated Job Matches
  const msftMatch = Math.min(98, Math.round(62 + (simK8s * 0.25) + (simDocker * 0.15)));
  const tcsMatch = Math.min(99, Math.round(82 + (simSysDesign * 0.15)));

  const handleApplySimulated = async () => {
    // Update student verified skills and readiness score based on simulation
    const updatedVerified = (student.verifiedSkills || []).map(v => {
      if (v.skill.includes('CI/CD') || v.skill.includes('Kubernetes')) {
        return { ...v, score: Math.max(v.score, simK8s) };
      }
      if (v.skill.includes('Cloud') || v.skill.includes('Docker')) {
        return { ...v, score: Math.max(v.score, simDocker) };
      }
      if (v.skill.includes('System Design')) {
        return { ...v, score: Math.max(v.score, simSysDesign) };
      }
      return v;
    });

    await updateStudentProfile({
      readinessScore: simulatedReadiness,
      verifiedSkills: updatedVerified
    });

    setNotification(`Simulated career goals applied! Target readiness calibrated to ${simulatedReadiness}%.`);
    onClose();
    setActiveTab('gap-analysis');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">"What-If" Career & Skill Gap Simulator</h3>
              <p className="text-[11px] text-slate-400">Model how bridging competency deficits impacts your dream job offers</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Score Comparison Gauge */}
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-300 font-medium">Current Readiness</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{student.readinessScore}%</p>
          </div>

          <div className="text-center px-3 py-1 bg-white/10 rounded-xl border border-white/10">
            <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto animate-bounce" />
            <span className="text-[10px] text-emerald-300 font-bold">+{simulatedReadiness - baseReadiness}% Boost</span>
          </div>

          <div className="text-right">
            <p className="text-xs text-emerald-300 font-medium">Simulated Readiness</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">{simulatedReadiness}%</p>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4 my-4 text-xs">
          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>Kubernetes & CI/CD Pipelines</span>
              <span className="text-blue-600">{simK8s}% (Baseline: 38%)</span>
            </div>
            <input
              type="range"
              min={38}
              max={95}
              value={simK8s}
              onChange={(e) => setSimK8s(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>Cloud & Multi-stage Docker</span>
              <span className="text-blue-600">{simDocker}% (Baseline: 54%)</span>
            </div>
            <input
              type="range"
              min={54}
              max={95}
              value={simDocker}
              onChange={(e) => setSimDocker(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-1">
              <span>Distributed System Design</span>
              <span className="text-blue-600">{simSysDesign}% (Baseline: 62%)</span>
            </div>
            <input
              type="range"
              min={62}
              max={95}
              value={simSysDesign}
              onChange={(e) => setSimSysDesign(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        {/* Impact on Job Matches */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 mb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Real-Time Predicted Corporate Matching
          </p>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60 text-xs">
            <div>
              <p className="font-bold text-slate-800">Microsoft Cloud & SRE Intern</p>
              <p className="text-[10px] text-slate-400">Previous match: 62% (Skill Deficit)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
              {msftMatch}% Match (Eligible!)
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60 text-xs">
            <div>
              <p className="font-bold text-slate-800">TCS Digital Innovator</p>
              <p className="text-[10px] text-slate-400">Previous match: 82% (Shortlisted)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-extrabold text-xs">
              {tcsMatch}% Match (Top 5%)
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleApplySimulated}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Lock Target in Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
