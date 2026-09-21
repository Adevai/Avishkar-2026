import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Code2
} from 'lucide-react';
import { LearningModule, CourseQuizQuestion } from '../../types';
import { getQuizForModule } from '../../data/courseQuizzes';

interface CourseVerificationQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: string;
  module: LearningModule | null;
  onVerificationPassed: (milestoneId: string, moduleId: string, score: number) => void;
}

export const CourseVerificationQuizModal: React.FC<CourseVerificationQuizModalProps> = ({
  isOpen,
  onClose,
  milestoneId,
  module,
  onVerificationPassed
}) => {
  // Hooks must run unconditionally (React rules-of-hooks) — early return moved below
  const [questions, setQuestions] = useState<CourseQuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (module) {
      const qList = getQuizForModule(module.id, module.title);
      setQuestions(qList);
      setCurrentIdx(0);
      setSelectedAnswers({});
      setIsSubmitted(false);
      setShowReview(false);
    }
  }, [module]);

  if (!isOpen || !module) return null;

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIdx]: optionIndex
    }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = questions.length || 10;

  // Compute results
  let score = 0;
  questions.forEach((q, idx) => {
    if (selectedAnswers[idx] === q.correctAnswer) {
      score += 1;
    }
  });

  const percentage = Math.round((score / totalQuestions) * 100);
  const isPassed = percentage >= 70; // Strict >= 70% threshold

  const handleSubmit = () => {
    if (answeredCount < totalQuestions) {
      const confirmSubmit = window.confirm(
        `You have answered ${answeredCount} of ${totalQuestions} questions. Unanswered questions will be counted as incorrect. Do you want to submit anyway?`
      );
      if (!confirmSubmit) return;
    }
    setIsSubmitted(true);
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentIdx(0);
    setIsSubmitted(false);
    setShowReview(false);
  };

  const handleClaimVerification = () => {
    onVerificationPassed(milestoneId, module.id, score);
    onClose();
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-slate-800/60 dark:to-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                  Module Verification Assessment
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Passing Score: 70% (7/10)
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-xl">
                {module.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isSubmitted ? (
            <>
              {/* Question Navigation Bubbles & Progress */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  <span>Question {currentIdx + 1} of {totalQuestions}</span>
                  <span>{answeredCount} answered</span>
                </div>
                <div className="grid grid-cols-10 gap-1.5 mb-4">
                  {questions.map((_, i) => {
                    const isCurrent = i === currentIdx;
                    const isAnswered = selectedAnswers[i] !== undefined;
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentIdx(i)}
                        className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                          isCurrent
                            ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-slate-900 shadow-sm'
                            : isAnswered
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Question Box */}
              {currentQ && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold mt-0.5">
                        {currentIdx + 1}
                      </span>
                      <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                        {currentQ.question}
                      </p>
                    </div>

                    {currentQ.codeSnippet && (
                      <div className="mt-3 p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-700 shadow-inner">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1.5 text-[10px] uppercase font-bold tracking-wider">
                          <Code2 className="w-3.5 h-3.5" /> Snippet
                        </div>
                        <pre>{currentQ.codeSnippet}</pre>
                      </div>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    {currentQ.options.map((option, optIdx) => {
                      const isSelected = selectedAnswers[currentIdx] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 shadow-sm ring-1 ring-blue-600'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm font-medium leading-normal">
                            {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Results Screen */
            <div className="space-y-6 animate-fade-in">
              {/* Outcome Header Banner */}
              <div
                className={`p-6 rounded-2xl border text-center relative overflow-hidden ${
                  isPassed
                    ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-300 dark:border-amber-800'
                }`}
              >
                <div className="inline-flex p-3 rounded-full mb-3 shadow-md bg-white dark:bg-slate-800">
                  {isPassed ? (
                    <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  )}
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {isPassed ? 'Knowledge Verified & Passed!' : 'Verification Score Insufficient'}
                </h3>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  {isPassed
                    ? `Outstanding work! You scored ${score} out of ${totalQuestions} (${percentage}%), surpassing the 70% threshold. Your course completion is certified.`
                    : `You scored ${score} out of ${totalQuestions} (${percentage}%). A minimum of 70% (7/10) is required to certify module completion and credit roadmap progress.`}
                </p>

                {/* Score Pill Display */}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Your Score</span>
                    <p className={`text-xl font-black ${isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {score} / {totalQuestions}
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Accuracy</span>
                    <p className={`text-xl font-black ${isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {percentage}%
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Status</span>
                    <p className={`text-sm font-bold uppercase tracking-wider mt-1 ${isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isPassed ? 'Verified' : 'Retake Required'}
                    </p>
                  </div>
                </div>

                {isPassed && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Completing this module will boost your Industry Readiness Score by +3%
                  </div>
                )}
              </div>

              {/* Action Buttons in Results View */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReview(!showReview)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  {showReview ? 'Hide Question Breakdown' : 'Review Questions & Explanations'}
                </button>

                <div className="flex items-center gap-3">
                  {!isPassed && (
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors shadow-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake Verification Quiz
                    </button>
                  )}

                  {isPassed && (
                    <button
                      type="button"
                      onClick={handleClaimVerification}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Claim Verification & Update Progress
                    </button>
                  )}
                </div>
              </div>

              {/* Explanations Breakdown Accordion */}
              {showReview && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Detailed Answers & Curriculum Feedback
                  </h4>

                  {questions.map((q, idx) => {
                    const studentAns = selectedAnswers[idx];
                    const isCorrect = studentAns === q.correctAnswer;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                            )}
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              Q{idx + 1}. {q.question}
                            </span>
                          </div>
                        </div>

                        {q.codeSnippet && (
                          <div className="my-2 p-2 bg-slate-900 rounded text-emerald-400 font-mono text-[11px] overflow-x-auto">
                            <pre>{q.codeSnippet}</pre>
                          </div>
                        )}

                        <div className="text-xs space-y-1 mt-2">
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-semibold">Your Answer:</span>{' '}
                            {studentAns !== undefined ? (
                              <span className={isCorrect ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-rose-700 dark:text-rose-300 font-medium'}>
                                {q.options[studentAns]}
                              </span>
                            ) : (
                              <span className="italic text-slate-400">Unanswered</span>
                            )}
                          </p>

                          {!isCorrect && (
                            <p className="text-emerald-700 dark:text-emerald-400">
                              <span className="font-semibold">Correct Answer:</span> {q.options[q.correctAnswer]}
                            </p>
                          )}

                          <div className="mt-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-slate-800 dark:text-slate-200">Concept Explanation:</span>{' '}
                            {q.explanation}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls (When Taking Quiz) */}
        {!isSubmitted && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex items-center gap-3">
              {currentIdx < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" /> Submit Assessment
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
