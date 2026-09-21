import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, GraduationCap, Building2, Briefcase, Landmark, ArrowRight, BrainCircuit,
  Radar, Compass, FileCheck2, ShieldCheck, Award, Sparkles, TrendingUp, Users,
  IndianRupee, Globe, CheckCircle2, Target, Loader2, MapPin, BadgeCheck, MessageSquare
} from 'lucide-react';
import { AlumniRegistrationModal } from '../components/alumni/AlumniRegistrationModal';

interface EcosystemStats {
  students: number;
  jobs: number;
  mous: number;
  problems: number;
  backendOnline: boolean;
}

export const Landing: React.FC = () => {
  const [stats, setStats] = useState<EcosystemStats | null>(null);
  const [alumniModalOpen, setAlumniModalOpen] = useState(false);

  // Pull real ecosystem stats from the health endpoint (falls back silently)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data || !data.counts) return;
        setStats({
          students: parseInt(data.counts.students_count, 10) || 0,
          jobs: parseInt(data.counts.jobs_count, 10) || 0,
          mous: parseInt(data.counts.mous_count, 10) || 0,
          problems: parseInt(data.counts.problems_count, 10) || 0,
          backendOnline: true,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const features = [
    {
      icon: <BrainCircuit className="w-6 h-6" />,
      color: 'from-blue-600 to-indigo-600',
      title: 'AI Skill Assessment',
      desc: 'Role-calibrated MCQ engine spanning DSA, cloud, AI, and core engineering — mapped to industry benchmarks, not just academics.',
    },
    {
      icon: <Radar className="w-6 h-6" />,
      color: 'from-emerald-600 to-teal-600',
      title: 'Skill Gap Radar',
      desc: 'Your verified competency scores vs. live job requirements — see exactly which skills block each opportunity.',
    },
    {
      icon: <Compass className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-600',
      title: 'NPTEL & SWAYAM Roadmaps',
      desc: 'Personalized learning paths built on Govt. of India MOOCs (NPTEL, SWAYAM) and free industry courses, with completion tracking.',
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      color: 'from-purple-600 to-fuchsia-600',
      title: 'Smart Job Matching',
      desc: 'Weighted algorithmic matching across campus MoU drives and live corporate postings — no inflated resume claims.',
    },
    {
      icon: <FileCheck2 className="w-6 h-6" />,
      color: 'from-rose-600 to-red-600',
      title: 'Placement Tracker',
      desc: 'Full ATS-style application pipeline: Applied → Shortlisted → Interview → Offer, with every stage logged.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      color: 'from-sky-600 to-blue-700',
      title: 'Verified Credentials',
      desc: 'AI OCR student-ID verification, digital competency badges with verification hashes, and MoU digital signatures.',
    },
  ];

  const roles = [
    {
      icon: GraduationCap,
      name: 'Students',
      desc: 'Assess, bridge gaps, and apply to verified opportunities',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      href: '/register',
      cta: 'Create free account',
    },
    {
      icon: Building2,
      name: 'Colleges & TPOs',
      desc: 'Department skill-gap analytics, MoUs, placement drives',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      href: '/register',
      cta: 'Onboard your institution',
    },
    {
      icon: Briefcase,
      name: 'Industry & Recruiters',
      desc: 'Post jobs, publish capstone grants, hire pre-vetted talent',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      href: '/register',
      cta: 'Join as corporate partner',
    },
    {
      icon: Landmark,
      name: 'Government',
      desc: 'NEP 2020 compliance, regional employability, skill trends',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      href: '/register',
      cta: 'Access directorate portal',
    },
  ];

  const highlights = [
    'Real OCR-based student-ID and resume verification',
    'NPTEL / SWAYAM / freeCodeCamp aligned curricula',
    'Tier-1 / Tier-2 / Tier-3 city salary benchmarks',
    'DPDP Act 2023 conscious data handling',
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased overflow-hidden relative">
      
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none flex flex-col justify-center">
              <p className="font-bold text-xl tracking-tight text-slate-900">
                S.P.A.R.K.
              </p>
            </div>
          </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
              <a href="#features" className="hover:text-blue-600 transition-colors">Platform</a>
              <a href="#roles" className="hover:text-blue-600 transition-colors">Ecosystem</a>
              <a href="#alumni" className="hover:text-blue-600 transition-colors">Alumni</a>
            </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="fintech-btn-primary py-2 px-5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative z-10 pt-24 pb-20 lg:pt-32 lg:pb-32 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 bg-white">
        
        {/* Subtle, beautiful background glow */}
        <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
        <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-violet-400/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

        <div className="max-w-4xl mx-auto flex flex-col items-center relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm text-xs font-bold text-slate-600 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>NEP 2020 & Skill India Aligned</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.05] mb-6">
            The Readiness<br />
            <span className="fintech-gradient-text">Platform for India.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-500 leading-relaxed max-w-2xl font-medium">
            Bridging the gap between classrooms and boardrooms with intelligent skill assessments, verified passports, and algorithmic placement matching.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/register"
              className="fintech-btn-primary"
            >
              <span>Start Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="fintech-btn-secondary"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats band ─────────────────────────────────────────── */}
      <section id="stats" className="relative z-10 py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <GraduationCap className="w-6 h-6 text-blue-600" />,
                value: stats ? `${stats.students}` : '—',
                label: 'Verified students',
                bgColor: 'bg-blue-50',
              },
              {
                icon: <Briefcase className="w-6 h-6 text-violet-600" />,
                value: stats ? `${stats.jobs}` : '—',
                label: 'Live opportunities',
                bgColor: 'bg-violet-50',
              },
              {
                icon: <Building2 className="w-6 h-6 text-fuchsia-600" />,
                value: stats ? `${stats.mous}` : '—',
                label: 'Active MoUs',
                bgColor: 'bg-fuchsia-50',
              },
              {
                icon: <Target className="w-6 h-6 text-indigo-600" />,
                value: stats ? `${stats.problems}` : '—',
                label: 'Capstone challenges',
                bgColor: 'bg-indigo-50',
              },
            ].map(s => (
              <div key={s.label} className="fintech-card p-6 flex flex-col items-start text-left">
                <div className={`p-3 rounded-xl ${s.bgColor} mb-4`}>
                  {s.icon}
                </div>
                <div>
                  {stats ? (
                    <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                      {s.value}
                    </p>
                  ) : (
                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                  )}
                  <p className="text-sm font-semibold text-slate-500 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ──────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> The Platform
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            One pipeline from skill discovery to placement.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed font-medium">
            Every feature feeds the next: assessments calibrate profiles, profiles power gap analysis,
            gaps generate NPTEL-aligned roadmaps, and verified skills unlock algorithmic job matching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div
              key={f.title}
              className="fintech-card relative flex flex-col group overflow-hidden bg-gradient-to-b from-slate-50/50 to-white"
            >
              <div className="p-8 flex flex-col h-full relative z-10">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${f.color} text-white flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed font-medium">{f.desc}</p>
              </div>

              {/* Decorative Background Blob */}
              <div className={`absolute -bottom-10 -right-10 w-48 h-48 bg-gradient-to-tr ${f.color} rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none`} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Roles ──────────────────────────────────────────────── */}
      <section id="roles" className="bg-slate-50 relative overflow-hidden border-y border-slate-100">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mb-12">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-100 border border-violet-200 px-3 py-1 rounded-full">
              <Users className="w-3.5 h-3.5" /> Five portals, one ecosystem
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Built for every stakeholder in India's talent pipeline.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((r, i) => {
              const Icon = r.icon;
              // Extract the base color to use for the soft background gradient
              const bgGradient = i === 0 ? 'from-blue-50/50' : i === 1 ? 'from-purple-50/50' : i === 2 ? 'from-emerald-50/50' : 'from-amber-50/50';

              return (
                <Link
                  key={r.name}
                  to={r.href}
                  className={`fintech-card relative flex flex-col group overflow-hidden bg-gradient-to-b ${bgGradient} to-white`}
                >
                  <div className="p-6 flex flex-col h-full relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm border ${r.color}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{r.name}</h3>
                    <p className="mt-3 text-sm text-slate-500 leading-relaxed font-medium flex-1">{r.desc}</p>
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                        <span>{r.cta}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                  
                  {/* Decorative Watermark */}
                  <Icon className="absolute -bottom-8 -right-8 w-40 h-40 text-slate-100 opacity-50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 pointer-events-none" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Alumni Network ───────────────────────────────────── */}
      <section id="alumni" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative rounded-[2rem] bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-14 overflow-hidden shadow-2xl shadow-blue-500/20">
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/90">
              <BadgeCheck className="w-3.5 h-3.5" /> Now live
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              The Alumni Mentor Network is here.
            </h2>
            <p className="mt-3 text-sm text-blue-100 leading-relaxed max-w-2xl font-medium">
              Graduates get verified by their own institution's records, then mentor the next batch —
              private 1-on-1 chat rooms, and <strong className="text-white">Fast-Track referrals</strong> that
              skip the standard application queue entirely. Universities review every application before
              anyone goes live in the directory.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setAlumniModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold bg-white text-blue-600 hover:bg-slate-50 transition-all shadow-lg active:scale-95"
              >
                <GraduationCap className="w-4 h-4" />
                Register as Alumni Mentor
              </button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                Students: find your mentor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" /> How it works
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              From assessment to offer letter — one connected workflow.
            </h2>
            <div className="mt-8 space-y-6">
              {[
                {
                  step: '01',
                  title: 'Profile & verification',
                  desc: 'Register, verify email via OTP, scan your student ID with AI OCR, and import skills from your resume.',
                },
                {
                  step: '02',
                  title: 'AI assessment',
                  desc: 'A timed, proctor-aware competency test scores you across role-relevant categories — DSA, cloud, AI, communication.',
                },
                {
                  step: '03',
                  title: 'Gap analysis & roadmap',
                  desc: 'See exactly where you fall short of target roles, then close the gap with NPTEL/SWAYAM modules and verification quizzes.',
                },
                {
                  step: '04',
                  title: 'Matching & tracking',
                  desc: 'Get algorithmically ranked job matches, generate recruiter-ready cover notes, and track every application stage.',
                },
              ].map(s => (
                <div key={s.step} className="flex gap-4">
                  <span className="shrink-0 w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 font-bold font-mono text-sm flex items-center justify-center">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Salary benchmark card (India-specific real-world context) */}
          <div className="lg:justify-self-end w-full max-w-md">
            <div className="fintech-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">2026 Fresher Salary Benchmarks</h3>
                </div>
                <Globe className="w-4 h-4 text-slate-400" />
              </div>
              {[
                { track: 'AI / ML Engineer', t1: '₹18–28 LPA', t2: '₹9–14 LPA' },
                { track: 'Cloud & DevOps', t1: '₹14–22 LPA', t2: '₹7–12 LPA' },
                { track: 'Full Stack', t1: '₹12–20 LPA', t2: '₹6–10 LPA' },
                { track: 'Embedded & EV', t1: '₹9–15 LPA', t2: '₹5–8 LPA' },
              ].map(row => (
                <div key={row.track} className="flex items-center justify-between py-3 border-t border-slate-100 text-xs">
                  <span className="font-bold text-slate-700">{row.track}</span>
                  <span className="flex items-center gap-3 tabular-nums">
                    <span className="text-emerald-600 font-bold">{row.t1}</span>
                    <span className="text-slate-400 font-medium">{row.t2}</span>
                  </span>
                </div>
              ))}
              <p className="mt-4 text-[10px] text-slate-500 leading-relaxed font-medium">
                Indicative Tier-1 (metro product cos) vs Tier-2 city ranges. S.P.A.R.K. uses live benchmark
                data in every job card so students negotiate with context.
              </p>
            </div>

            <div className="mt-4 p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                <strong>Govt-ready reporting:</strong> institutes export NIRF-format registries and
                internship-compliance audits directly from the college portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="relative text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Your readiness score is waiting.
            </h2>
            <p className="relative mt-4 text-sm font-medium text-slate-500 max-w-xl mx-auto">
              Free for students. Built to India's NEP 2020 credit framework and AICTE internship norms.
              Join the platform bridging academia and industry.
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="fintech-btn-primary"
              >
                <Sparkles className="w-4 h-4 text-white" />
                Create your free account
              </Link>
              <Link
                to="/login"
                className="fintech-btn-secondary"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-extrabold tracking-tight text-slate-900">S.P.A.R.K.</p>
                <p className="text-[10px] font-medium text-slate-500">Smart Platform for Academia–Industry Readiness & Knowledge</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> NEP 2020 Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                <Award className="w-3.5 h-3.5 text-amber-600" /> AICTE & Skill India Aligned
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Made in India 🇮🇳
              </span>
            </div>

            <p className="text-[11px] font-semibold text-slate-400">
              © {new Date().getFullYear()} S.P.A.R.K. · All rights reserved
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Alumni Registration Modal */}
      <AlumniRegistrationModal
        isOpen={alumniModalOpen}
        onClose={() => setAlumniModalOpen(false)}
        defaultWorkflow="alumni"
      />
    </div>
  );
};
export default Landing;
