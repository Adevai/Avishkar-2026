import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Compass, 
  CheckCircle2, 
  ExternalLink, 
  Award, 
  Clock, 
  Sparkles, 
  ArrowRight,
  BookMarked,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { CourseVerificationQuizModal } from './CourseVerificationQuizModal';
import { LearningModule } from '../../types';

export const LearningRoadmap: React.FC = () => {
  const { roadmap, verifyAndCompleteModule, student, setActiveTab } = useApp();
  const [quizTarget, setQuizTarget] = useState<{
    milestoneId: string;
    module: LearningModule;
  } | null>(null);

  const totalModules = roadmap.reduce((acc, m) => acc + m.modules.length, 0);
  const completedModules = roadmap.reduce((acc, m) => acc + m.modules.filter(mod => mod.completed).length, 0);
  const completionPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Step Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold border border-blue-400/30">
                Step 5 of Solution Workflow
              </span>
              <span className="text-xs text-blue-200">Smart Bridging Pathways</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Personalized Learning Recommendations</h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              AI-curated learning milestones targeting your identified competency gaps. Complete certified modules from NPTEL, SWAYAM, and industry labs to automatically boost your employability index.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('jobs')}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-slate-900 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105"
          >
            <span>Match Internships & Jobs</span>
            <ArrowRight className="w-4 h-4 text-slate-900" />
          </button>
        </div>

        {/* Global Roadmap Progress */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex justify-between text-xs text-blue-200 mb-1.5 font-medium">
            <span>Overall Roadmap Completion ({completedModules}/{totalModules} Modules)</span>
            <span className="font-bold text-white">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-blue-950/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2.5 transition-all duration-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones Stack */}
      <div className="space-y-6">
        {roadmap.map((milestone) => {
          const mDone = milestone.modules.filter(m => m.completed).length;
          const mTotal = milestone.modules.length;

          return (
            <div
              key={milestone.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4"
            >
              {/* Milestone Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    milestone.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {milestone.completed ? <CheckCircle2 className="w-4 h-4" /> : milestone.phase}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{milestone.phaseTitle}</h2>
                    <p className="text-xs text-slate-500">{milestone.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-semibold">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{milestone.estimatedHours} hrs</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {mDone}/{mTotal} completed
                  </span>
                </div>
              </div>

              {/* Module Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {milestone.modules.map((mod) => {
                  return (
                    <div
                      key={mod.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        mod.completed
                          ? 'bg-emerald-50/40 border-emerald-200 ring-1 ring-emerald-500/20'
                          : 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            mod.provider === 'NPTEL' ? 'bg-orange-100 text-orange-800' :
                            mod.provider === 'SWAYAM' ? 'bg-blue-100 text-blue-800' :
                            mod.provider === 'Coursera' ? 'bg-sky-100 text-sky-800' :
                            'bg-slate-200 text-slate-800'
                          }`}>
                            {mod.provider}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {mod.durationWeeks} Weeks
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-800 leading-snug mb-1">
                          {mod.title}
                        </h3>

                        <div className="flex flex-wrap gap-1 mt-2 mb-3">
                          {(mod.skillsCovered || []).map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[9px] font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        {mod.completed ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{mod.verificationScore !== undefined ? `Verified (${mod.verificationScore}/10)` : 'Verified (+3%)'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuizTarget({ milestoneId: milestone.id, module: mod })}
                              title="Review or retake assessment"
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setQuizTarget({ milestoneId: milestone.id, module: mod })}
                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 transition-colors shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <span>Mark Done (Quiz)</span>
                          </button>
                        )}

                        <a
                          href={mod.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span>Open Course</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Verified Micro-Credentials Earned */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Recognized Micro-Credentials & Badges</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-xs font-bold text-slate-800">NPTEL Cloud Verified</p>
              <p className="text-[10px] text-slate-500">Issued by IIT Kharagpur</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center gap-3">
            <BookMarked className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-xs font-bold text-slate-800">Docker Containerization</p>
              <p className="text-[10px] text-slate-500">In Progress (60%)</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
            <Award className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-xs font-bold text-slate-700">Kubernetes Associate</p>
              <p className="text-[10px] text-slate-400">Locked (Complete Phase 1)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 10-Question Module Verification Quiz Modal */}
      <CourseVerificationQuizModal
        isOpen={!!quizTarget}
        onClose={() => setQuizTarget(null)}
        milestoneId={quizTarget?.milestoneId || ''}
        module={quizTarget?.module || null}
        onVerificationPassed={(milestoneId, moduleId, score) => {
          verifyAndCompleteModule(milestoneId, moduleId, score);
        }}
      />
    </div>
  );
};
