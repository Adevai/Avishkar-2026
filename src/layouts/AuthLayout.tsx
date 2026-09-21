import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sparkles, Zap, BadgeCheck, MessageSquare, Briefcase } from 'lucide-react';
import { SparkLogo } from '../components/common/SparkLogo';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex relative overflow-hidden selection:bg-blue-500/30">
      {/* Left side: Premium Fintech Branding Panel (Desktop) */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative z-10 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden border-r border-slate-200">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 -left-24 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <SparkLogo size="lg" theme="light" showTagline={true} />

          <div className="mt-16 max-w-md">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-100 border border-violet-200 px-3 py-1 rounded-full">
              India's Readiness Platform
            </span>
            <h1 className="mt-6 text-4xl font-display font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Bridging <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Academia</span> and{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Industry</span>, with proof.
            </h1>
            <p className="mt-4 text-sm text-slate-500 leading-relaxed font-medium">
              AI skill assessment, university-verified alumni mentorship, NPTEL-aligned
              roadmaps, and algorithmic placement matching — one connected ecosystem for
              students, colleges, recruiters, and government.
            </p>
          </div>

          {/* Proof points */}
          <div className="mt-10 space-y-4 max-w-sm">
            {[
              { icon: <BadgeCheck className="w-5 h-5 text-blue-600" />, text: 'Verified credentials — OCR IDs, badges, institution-gated alumni' },
              { icon: <MessageSquare className="w-5 h-5 text-blue-600" />, text: 'Private 1-on-1 mentorship with Fast-Track referrals' },
              { icon: <Briefcase className="w-5 h-5 text-blue-600" />, text: 'Live India job market data with freshness attribution' },
            ].map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                  {p.icon}
                </div>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed pt-1">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Badge */}
        <div className="relative z-10 flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-w-sm hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shrink-0 text-white shadow-lg shadow-blue-500/20">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">S.P.A.R.K. Automation</p>
            <p className="text-xs text-slate-500 font-medium">Empowering Students, Colleges & Enterprise</p>
          </div>
        </div>
      </div>

      {/* Right side: Form (Outlet) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 bg-white">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8">
          <SparkLogo size="md" theme="light" showTagline={false} />
        </div>

        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
