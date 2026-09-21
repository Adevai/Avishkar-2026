import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileCheck2, 
  Clock, 
  CheckCircle2, 
  Award, 
  Building2, 
  Calendar, 
  Sparkles, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export const PlacementTracker: React.FC = () => {
  const { applications, student, setActiveTab } = useApp();

  const stages = ['Applied', 'Under Review', 'Assessment Sent', 'Shortlisted', 'Interview Scheduled', 'Offer Extended'];

  const getStageIdx = (status: string) => {
    if (status === 'Screened') return 1;
    if (status === 'Interview') return 4;
    if (status === 'Offered') return 5;
    const idx = stages.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Step Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold border border-blue-400/30">
                Step 7 of Solution Workflow
              </span>
              <span className="text-xs text-blue-200">Career Outcome Tracking</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Enterprise ATS Application Lifecycle & Placement Pipeline</h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Real-time multi-stage ATS pipeline tracking: from initial application and AI competency screening to technical interviews and official offer rollouts.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 px-4 py-2 rounded-xl backdrop-blur border border-white/20">
            <TrendingUp className="w-5 h-5 text-emerald-300" />
            <div className="text-xs">
              <p className="text-blue-200 font-medium">Placement Status</p>
              <p className="font-bold text-white text-sm">Active in Hiring Drives</p>
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Applied</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{applications.length}</p>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Corporate Drives</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Under Review / Assessed</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {applications.filter(a => a.status === 'Under Review' || a.status === 'Assessment Sent').length}
          </p>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">In Screening Stage</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Shortlisted & Interviews</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {applications.filter(a => a.status === 'Shortlisted' || a.status === 'Interview Scheduled').length}
          </p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Technical & Cultural</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Offers Released</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {applications.filter(a => a.status === 'Offer Extended').length}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">PPO / Full-Time</p>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Active Applications & ATS Stages</h2>
            <p className="text-xs text-slate-500">Live recruitment status synced with industry partners</p>
          </div>
          <button
            onClick={() => setActiveTab('jobs')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            + Apply to More Vacancies
          </button>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-700">No applications submitted yet</p>
            <p className="text-xs text-slate-400 mt-1">Check out Opportunity Matching to apply with 1-click!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => {
              const currentStageIdx = getStageIdx(app.status);

              return (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/40 hover:bg-slate-50/80 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{app.jobTitle}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {app.aiMatchScore}% AI Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{app.company}</span>
                        <span className="text-slate-300">•</span>
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Applied on {app.appliedDate}</span>
                      </p>
                    </div>

                    <span className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full ${
                      app.status === 'Offer Extended' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      app.status === 'Shortlisted' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                      app.status === 'Interview Scheduled' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                      app.status === 'Assessment Sent' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      app.status === 'Under Review' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                      'bg-slate-200 text-slate-800'
                    }`}>
                      Current Stage: {app.status}
                    </span>
                  </div>

                  {/* Visual Stage Stepper */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between relative">
                      {/* Connecting Line */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full z-0" />
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-500 z-0"
                        style={{ width: `${(currentStageIdx / (stages.length - 1)) * 100}%` }}
                      />

                      {stages.map((stage, sIdx) => {
                        const isDone = sIdx <= currentStageIdx;
                        const isCurrent = sIdx === currentStageIdx;

                        return (
                          <div key={stage} className="relative z-10 flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                              isCurrent
                                ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                                : isDone
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border-2 border-slate-200 text-slate-400'
                            }`}>
                              {isDone ? <CheckCircle2 className="w-4 h-4" /> : sIdx + 1}
                            </div>
                            <span className={`text-[10px] mt-1.5 font-semibold text-center hidden sm:block ${
                              isCurrent ? 'text-blue-700 font-bold' : isDone ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Attached Credentials & Verified Scorecard Links */}
                  {(app.attachedScorecardUrl || app.attachedResumeUrl) && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-600" />
                        <span>Attached Credentials:</span>
                      </span>
                      {app.attachedScorecardUrl && (
                        <a
                          href={app.attachedScorecardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 font-semibold text-[11px]"
                        >
                          ✓ AI Verified Competency Scorecard
                        </a>
                      )}
                      {app.attachedResumeUrl && (
                        <a
                          href={app.attachedResumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 font-semibold text-[11px]"
                        >
                          📄 Verified Skill Passport
                        </a>
                      )}
                    </div>
                  )}

                  {/* Feedback / Notes */}
                  {app.notes && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 text-xs text-slate-600">
                      <p className="font-bold text-slate-700 mb-0.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Corporate Recruiter Notes:</span>
                      </p>
                      <p>{app.notes}</p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
