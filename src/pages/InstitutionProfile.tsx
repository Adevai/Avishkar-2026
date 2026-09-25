import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, BadgeCheck, ShieldAlert, Loader2, Globe, Hash, Users, Briefcase, GraduationCap, ArrowLeft } from 'lucide-react';

interface InstitutionData {
  institution: {
    id: string;
    userId: string;
    name: string;
    tpoName?: string;
    aisheCode: string | null;
    officialDomain: string | null;
    verificationStatus: string;
    verified: boolean;
    memberSince: string;
  };
  stats: {
    campus_postings: number;
    registered_students: number;
    verified_students: number;
  };
}

const timeAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 30) return days <= 0 ? 'today' : `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

/**
 * Public institution profile — shows the AISHE code, official domain,
 * verification status, and live platform stats. Reachable from the
 * "Verified Campus" badge on job cards posted by verified institutions.
 */
export const InstitutionProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/institutions/profile/${encodeURIComponent(id || '')}`)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Institution not found.');
        }
        return res.json();
      })
      .then(d => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading institution profile…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="font-bold text-rose-900">Institution profile unavailable</h2>
        <p className="text-sm text-rose-700 mt-1">{error}</p>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-blue-700 hover:text-blue-800">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const { institution: inst, stats } = data;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header card with verification badge */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur">
              <Building2 className="w-8 h-8 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5 flex-wrap">
                {inst.name}
                {inst.verified && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                    title="AISHE-verified institution on the S.P.A.R.K. platform"
                  >
                    <BadgeCheck className="w-4 h-4" /> Verified Campus
                  </span>
                )}
              </h1>
              {inst.tpoName && (
                <p className="text-xs text-slate-400 mt-1">TPO office · {inst.tpoName}</p>
              )}
            </div>
          </div>
          {!inst.verified && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/40">
              <ShieldAlert className="w-3.5 h-3.5" /> Verification {inst.verificationStatus.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Registry identifiers */}
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Hash className="w-3 h-3" /> AISHE Code
            </p>
            <p className="mt-1 font-mono font-bold text-lg text-white">{inst.aisheCode || '—'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Ministry of Education registry</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Official Domain
            </p>
            <p className="mt-1 font-mono font-bold text-lg text-white">{inst.officialDomain || '—'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Emails verified against this host</p>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/70 text-center">
          <Briefcase className="w-5 h-5 text-blue-600 mx-auto" />
          <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{stats.campus_postings}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Campus Postings</p>
        </div>
        <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200/70 text-center">
          <Users className="w-5 h-5 text-violet-600 mx-auto" />
          <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{stats.registered_students}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Registered Students</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-center">
          <GraduationCap className="w-5 h-5 text-emerald-600 mx-auto" />
          <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{stats.verified_students}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verified Students</p>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        Member on S.P.A.R.K. since {timeAgo(inst.memberSince)} · Verification handled by the Platform Admin desk
      </p>
    </div>
  );
};
