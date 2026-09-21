import React, { useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  durationMs?: number;
}

interface ToastProps {
  message: string | null;
  onClose: () => void;
  type?: 'success' | 'info' | 'warning' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, type = 'success' }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const bgStyles = {
    success: 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50',
    info: 'bg-slate-900/95 border-blue-500/40 text-blue-100 shadow-blue-950/50',
    warning: 'bg-amber-950/95 border-amber-500/40 text-amber-100 shadow-amber-950/50',
    error: 'bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-rose-950/50',
  }[type];

  const iconBg = {
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  }[type];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short transition-all">
      <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl min-w-[340px] max-w-md ${bgStyles}`}>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
          {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
          {type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
          {type === 'error' && <Sparkles className="w-5 h-5 text-rose-400" />}
        </div>

        <div className="flex-1 text-xs leading-relaxed">
          <p className="font-bold text-[13px] tracking-tight">{message}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
