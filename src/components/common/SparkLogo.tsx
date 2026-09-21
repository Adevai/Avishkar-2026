import React from 'react';
import { Zap, Sparkles } from 'lucide-react';

interface SparkLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  theme?: 'dark' | 'light';
  className?: string;
}

export const SparkLogo: React.FC<SparkLogoProps> = ({
  size = 'md',
  showTagline = true,
  theme = 'dark',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 rounded-xl',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-2xl',
    xl: 'w-14 h-14 rounded-3xl',
  };

  const zapSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* High-Tech Glowing Spark Emblem */}
      <div className="relative group shrink-0">
        <div className={`${iconSizes[size]} bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/40 relative overflow-hidden`}>
          {/* Subtle light sweep reflection */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
          
          <Zap className={`${zapSizes[size]} fill-blue-300 text-white drop-shadow-md animate-pulse`} />
        </div>
      </div>

      {/* Typography Lockup */}
      <div className="leading-none">
        <div className="flex items-center gap-2">
          <span className={`font-black tracking-wider uppercase font-mono ${titleSizes[size]} ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-blue-400 via-indigo-300 to-slate-100 bg-clip-text text-transparent' 
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 bg-clip-text text-transparent'
          }`}>
            S.P.A.R.K.
          </span>
          <span className={`uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full text-[9px] border ${
            theme === 'dark'
              ? 'bg-blue-400/10 text-blue-300 border-blue-400/30 shadow-xs'
              : 'bg-blue-50 text-blue-800 border-blue-300 shadow-xs'
          }`}>
            Smart Automation
          </span>
        </div>

        {showTagline && (
          <p className={`font-medium tracking-tight mt-1 truncate max-w-xs sm:max-w-md ${subtitleSizes[size]} ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Smart Platform for Academia—Industry Readiness and Knowledge
          </p>
        )}
      </div>
    </div>
  );
};
