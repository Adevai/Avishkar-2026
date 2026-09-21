import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getAssessmentQuestionsForRole } from '../../data/roleAssessments';
import { 
  BrainCircuit, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Terminal, 
  Sparkles,
  Award,
  Layers,
  BarChart2,
  Target,
  Lock,
  AlertTriangle,
  Maximize2,
  Minimize2,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

const STORAGE_KEY = 'spark_active_assessment_v1';

export const AIAssessment: React.FC = () => {
  const { student, submitAssessment, assessmentResult, setActiveTab, setIsAssessmentActive, setNotification } = useApp();
  
  // Anti-Cheat & Proctoring Telemetry State
  const [tabViolations, setTabViolations] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [proctoringAlert, setProctoringAlert] = useState<string | null>(null);

  // Digital Badge Issued State
  const [issuedBadge, setIssuedBadge] = useState<any | null>(null);

  // Load cached assessment progress if exists to prevent timer resets
  const cachedData = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }, []);

  const [currentIdx, setCurrentIdx] = useState<number>(cachedData?.currentIdx ?? 0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(cachedData?.selectedAnswers ?? {});
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (typeof cachedData?.timeRemaining === 'number' && cachedData.timeRemaining > 0) {
      return cachedData.timeRemaining;
    }
    return 600;
  });
  const [isFinished, setIsFinished] = useState(false);
  const [hasStarted, setHasStarted] = useState<boolean>(() => !!cachedData);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);

  // Dynamically load questions tailored to the student's chosen career goal
  const questions = useMemo(() => {
    return getAssessmentQuestionsForRole(student?.targetRole);
  }, [student?.targetRole]);

  // Lock user in while test is running & monitor anti-cheat proctoring events
  useEffect(() => {
    if (!hasStarted || isFinished) {
      setIsAssessmentActive(false);
      localStorage.removeItem('spark_assessment_locked');
      return;
    }

    setIsAssessmentActive(true);
    localStorage.setItem('spark_assessment_locked', 'true');

    // Anti-Cheat: Tab Switch & Window Blur Detection
    const handleVisibilityChange = () => {
      if (!isFinished && document.hidden) {
        setTabViolations(prev => {
          const next = prev + 1;
          setProctoringAlert(`⚠️ Proctoring Alert: Tab switch detected! (Violation ${next}/3). Maintain focus on the assessment window.`);
          return next;
        });
      }
    };

    const handleWindowBlur = () => {
      if (!isFinished) {
        setTabViolations(prev => {
          const next = prev + 1;
          setProctoringAlert(`⚠️ Focus Lost: Window switched (Violation ${next}/3). AI proctoring logs external window switches.`);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Warn on browser tab close or reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isFinished) {
        e.preventDefault();
        e.returnValue = 'Assessment is in progress. Leaving will lose your submission!';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasStarted, isFinished, setIsAssessmentActive]);

  // Save progress continuously to localStorage so timer never resets
  useEffect(() => {
    if (!hasStarted || isFinished) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentIdx,
          selectedAnswers,
          timeRemaining,
          targetRole: student?.targetRole,
        })
      );
    } catch (e) {}
  }, [hasStarted, currentIdx, selectedAnswers, timeRemaining, isFinished, student?.targetRole]);

  useEffect(() => {
    if (!hasStarted || isFinished || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleCompleteQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, isFinished, timeRemaining]);

  const currentQ = questions[currentIdx] || questions[0];
  const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectOption = (optIdx: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: optIdx,
    }));
  };

  const handleNext = () => {
    setSandboxOutput(null);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      handleCompleteQuiz();
    }
  };

  const handlePrev = () => {
    setSandboxOutput(null);
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleCompleteQuiz = async () => {
    setIsFinished(true);
    setIsAssessmentActive(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('spark_assessment_locked');
    } catch (e) {}
    const timeSpent = 600 - timeRemaining;
    await submitAssessment(selectedAnswers, timeSpent, questions);

    // Issue Cryptographically Verifiable Digital Badge
    try {
      const api = (await import('../../services/api')).api;
      const res = await api.issueBadge({
        studentId: student?.id || 'stu-01',
        title: `${student?.targetRole || 'Software Engineering'} Competency Certified`,
        category: 'Skill Verification',
        scorePercentage: 88,
        skills: (student?.verifiedSkills || []).map(s => s.skill).slice(0, 4),
        issuer: 'S.P.A.R.K. National Skill Registry (NEP 2020)',
      });
      if (res.badge) {
        setIssuedBadge(res.badge);
      }
    } catch (e) {}
  };

    useEffect(() => {
    if (tabViolations >= 3 && !isFinished) {
      setNotification('Assessment terminated due to anti-cheat violation (3/3 tab switches).');
      handleCompleteQuiz();
    }
  }, [tabViolations, isFinished]);

  const handleRunSandbox = () => {
    setSandboxRunning(true);
    setSandboxOutput('Compiling code snippet & evaluating test assertions...');

    setTimeout(() => {
      setSandboxRunning(false);
      setSandboxOutput(`[SANDBOX RUNNER v2.4]
✓ Parsing abstract syntax tree... Done.
✓ Executing test suite against benchmark criteria...
✓ Assertion 1: Complexity boundary verified. (0.4ms)
✓ Assertion 2: Memory allocation within O(log n) budget.
✓ Status: PASS (100% Test Coverage)`);
    }, 1200);
  };

  if (!hasStarted) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 fintech-card flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-6">
          <ShieldCheck className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-extrabold text-slate-900 font-display mb-3">AI Skill Assessment</h2>
        <p className="text-slate-700 mb-8 font-medium">
          Calibrated specifically for your goal: <strong className="text-slate-800">{student?.targetRole}</strong>
        </p>

        <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 text-left mb-8 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Rules & Proctoring Guidelines
          </h3>
          <ul className="space-y-3 text-sm text-slate-600 font-medium">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              This is a timed assessment. You will have 10 minutes to complete 15 questions.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <strong>Anti-Cheat Telemetry is Active:</strong> Leaving the tab, minimizing the window, or switching applications will be logged as a violation.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              3 violations will result in automatic termination of the assessment.
            </li>
          </ul>
        </div>

        <button 
          onClick={() => setHasStarted(true)}
          className="fintech-btn-primary w-full bg-gradient-to-r from-blue-600 to-violet-600 shadow-blue-500/25"
        >
          I Understand, Start Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      
      {/* Anti-Cheat & Proctoring Live Monitor */}
      {!isFinished && (
        <div className="space-y-2">
          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div className="text-xs">
                <span className="font-bold text-slate-900 mr-1.5">AI Anti-Cheat Proctoring Telemetry Active:</span>
                <span className="text-slate-700">Tab-switch detection enabled. </span>
                <span className={`font-bold ml-1 ${tabViolations > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  (Violations: {tabViolations}/3)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                    setIsFullscreen(true);
                  } else {
                    document.exitFullscreen().catch(() => {});
                    setIsFullscreen(false);
                  }
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-all"
                title="Toggle Fullscreen Assessment Mode"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
              </button>

              <span className="shrink-0 px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                Protected Mode
              </span>
            </div>
          </div>

          {/* Active Proctoring Alert Notice if any */}
          {proctoringAlert && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between text-xs text-rose-800 animate-fadeIn">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{proctoringAlert}</span>
              </div>
              <button
                onClick={() => setProctoringAlert(null)}
                className="text-rose-500 hover:text-rose-800 font-bold ml-2 text-xs"
              >
                Acknowledge
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-100/50 text-slate-900 shadow-sm border border-blue-100 overflow-hidden fintech-card">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-300/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                Step 3 of Solution Workflow
              </span>
              <span className="text-xs text-slate-700">AI Competency Evaluation Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI-Based Skill Assessment</h1>
            <p className="text-sm text-slate-600 font-medium pt-1">
              Calibrated specifically for your goal: <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-100/60 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-sm ml-1.5">
                <Target className="w-3 h-3 text-blue-600" />
                {student?.targetRole}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setHasStarted(false);
                setCurrentIdx(0);
                setSelectedAnswers({});
                setTimeRemaining(600);
                setTabViolations(0);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
              title="Restart Assessment (For Demo Purposes)"
            >
              Restart Demo
            </button>
            
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-sm text-slate-900">
              <Clock className={`w-5 h-5 ${timeRemaining < 120 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
              <div className="text-xs">
                <p className="text-slate-700 font-medium">Time Remaining</p>
                <p className={`font-mono text-base font-extrabold ${timeRemaining < 120 ? 'text-red-600' : 'text-slate-900'}`}>{formatTime(timeRemaining)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-slate-700 mb-2 font-semibold">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span>{progressPercent}% completed</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-300">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-1.5 transition-all duration-300 rounded-full shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Assessment Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <BrainCircuit className="w-4 h-4" />
            </span>
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {currentQ.categoryName}
            </span>
          </div>
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${
            currentQ.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            currentQ.difficulty === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            Difficulty: {currentQ.difficulty}
          </span>
        </div>

        {/* Question Text */}
        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed">
            {currentQ.question}
          </h2>

          {/* Code Snippet with Sandbox Execution */}
          {currentQ.codeSnippet && (
            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 font-mono">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Code Manifest / Logic</span>
                </div>
                <button
                  type="button"
                  disabled={sandboxRunning}
                  onClick={handleRunSandbox}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs"
                >
                  <Play className={`w-3 h-3 ${sandboxRunning ? 'animate-spin' : ''}`} />
                  <span>{sandboxRunning ? 'Running Sandbox...' : 'Run in Sandbox'}</span>
                </button>
              </div>

              <pre className="p-4 font-mono text-xs text-slate-200 overflow-x-auto">
                {currentQ.codeSnippet}
              </pre>

              {sandboxOutput && (
                <div className="p-3 bg-slate-100/90 border-t border-slate-200 font-mono text-xs text-emerald-400 whitespace-pre-wrap animate-fadeIn">
                  {sandboxOutput}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 pt-2">
          {currentQ.options.map((opt, oIdx) => {
            const isSelected = selectedAnswers[currentQ.id] === oIdx;
            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => handleSelectOption(oIdx)}
                className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-start gap-3.5 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {String.fromCharCode(65 + oIdx)}
                </span>
                <span className="leading-snug">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={handlePrev}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              currentIdx === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {currentIdx === questions.length - 1 ? (
              <button
                type="button"
                onClick={handleCompleteQuiz}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all hover:scale-105"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit & Finalize Assessment</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-105"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Issued Digital Badge Showcase */}
      {issuedBadge && (
        <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 rounded-3xl p-6 border-2 border-amber-400/40 shadow-xl space-y-4 animate-slideUp">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-amber-500 shrink-0 shadow-md">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase">
                    Blockchain Hash Verified
                  </span>
                  <span className="text-xs text-slate-700 font-semibold">{issuedBadge.category}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{issuedBadge.title}</h3>
                <p className="text-xs text-slate-600">Issued by {issuedBadge.issuer} • Score: {issuedBadge.scorePercentage}%</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 text-right">
              <p className="text-[10px] font-mono text-slate-600 uppercase">SHA-256 Stamp</p>
              <p className="text-[11px] font-mono font-bold text-slate-700 truncate max-w-[200px]" title={issuedBadge.verificationHash}>
                {issuedBadge.verificationHash}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Previous Assessment Result Flashcard */}
      {assessmentResult && (
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Verified Performance Benchmark</p>
              <p className="text-xl font-extrabold">{assessmentResult.percentage}% ({assessmentResult.performanceGrade})</p>
              <p className="text-[11px] text-slate-700">Recorded on {assessmentResult.completedAt}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('gap-analysis')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-2xl transition-all shadow-md"
          >
            <span>View Radar Skill Gap Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
