import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BrainCircuit, Loader2, CheckCircle2, Zap } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useApp();
  const [step, setStep] = useState(0);

  const steps = [
    "Authenticating credentials...",
    "Loading role configurations...",
    `Provisioning ${currentRole} workspace...`,
    "Optimizing AI modules...",
    "Ready."
  ];

  useEffect(() => {
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setStep(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      }
    }, 800); // 800ms per step

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-1000">
        <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-8 relative shadow-xl shadow-amber-500/20">
          <Zap className="w-8 h-8 text-white fill-amber-300" />
          <div className="absolute inset-0 border border-amber-400 rounded-2xl animate-ping opacity-30" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Preparing your workspace</h2>
        <p className="text-slate-400 font-medium mb-12 text-center text-sm">
          Please wait while we calibrate your tailored <strong className="text-amber-400 font-bold">S.P.A.R.K.</strong> ecosystem.
        </p>

        <div className="w-full space-y-4">
          {steps.map((text, i) => {
            const isCompleted = i < step;
            const isCurrent = i === step;
            const isPending = i > step;

            return (
              <div 
                key={i} 
                className={`flex items-center gap-3 text-sm font-medium transition-all duration-500 ${
                  isCompleted ? 'text-blue-400' : isCurrent ? 'text-white' : 'text-slate-600'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin shrink-0 text-blue-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-700 shrink-0" />
                )}
                <span className={isCurrent ? 'animate-pulse' : ''}>{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
