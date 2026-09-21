import { ShieldCheck, Award, Zap, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="ink-mesh mt-16 py-10 text-xs text-slate-400 relative overflow-hidden">
      <div className="absolute -top-24 left-1/3 w-96 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gold-400 to-gold-600 flex items-center justify-center shadow-glow-sm">
              <Zap className="w-4.5 h-4.5 text-ink-950 fill-ink-950" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-wider text-white">S.P.A.R.K.</p>
              <p className="text-[10px] text-slate-400">Smart Platform for Academia–Industry Readiness & Knowledge</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>NEP 2020 Compliant</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200">
              <Award className="w-3.5 h-3.5 text-gold-400" />
              <span>AICTE & Skill India Aligned</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Made in India 🇮🇳</span>
            </span>
          </div>

          <p className="text-[11px] text-slate-500 text-center md:text-right">
            © {new Date().getFullYear()} S.P.A.R.K. · All rights reserved
          </p>
        </div>

        <div className="gold-hairline mt-8" />
        <p className="text-center text-[10px] text-slate-500 mt-4">
          Verified mentorship · University-gated alumni network · DPDP Act 2023 conscious data handling
        </p>
      </div>
    </footer>
  );
};
