import React, { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck, ShieldCheck, Building2, IdCard, CheckCircle2, XCircle,
  Clock, RefreshCw, Loader2, AlertCircle, Search
} from 'lucide-react';
import { api, getToken } from '../../services/api';

interface ReviewItem {
  id: string;
  kind: 'institution' | 'id_card';
  submitted_value: string;
  level: 'verified' | 'recognized' | 'unverified';
  confidence: number;
  matched_name: string | null;
  accreditation: string | null;
  student_id: string | null;
  student_name: string | null;
  roll_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
}

interface QueueData {
  success: boolean;
  reviews: ReviewItem[];
  counts: Record<string, number>;
}

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const VerificationQueue: React.FC = () => {
  const [data, setData] = useState<QueueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [kindFilter, setKindFilter] = useState<'all' | 'institution' | 'id_card'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/verification-queue?status=${statusFilter}&kind=${kindFilter}`,
        { headers: { Authorization: `Bearer ${getToken() || ''}` } }
      );
      if (res.status === 401) {
        setActionError('Session expired — sign in again to access the review queue.');
        setData(null);
        return;
      }
      const json: QueueData = await res.json();
      setData(json);
      setActionError(null);
    } catch {
      setActionError('Failed to load the verification queue.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, kindFilter]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/verification-queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() || ''}` },
        body: JSON.stringify({ status, reviewNote: status === 'approved' ? 'Institution confirmed by directorate review' : 'Could not be verified against official records' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Review action failed');
      }
      await load();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = (data?.reviews || []).filter(r => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.submitted_value.toLowerCase().includes(q) ||
      (r.student_name || '').toLowerCase().includes(q) ||
      (r.roll_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-amber-100 text-[11px] font-bold border border-white/20 mb-2">
              <ClipboardCheck className="w-3 h-3" />
              Directorate Review
            </span>
            <h1 className="text-xl font-bold">Verification Review Queue</h1>
            <p className="text-amber-100/80 text-xs mt-1 max-w-2xl">
              Institutions and student ID cards flagged as <em>recognized/pending</em> during
              registration or OCR scanning. Approve to confirm the credential, or reject with a reason.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data && (
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {data.counts?.pending ?? 0} pending
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  {data.counts?.approved ?? 0} approved
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-400/20 text-rose-200 border border-rose-300/30">
                  {data.counts?.rejected ?? 0} rejected
                </span>
              </div>
            )}
            <button
              onClick={load}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search institution, student, or roll number…"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl text-xs font-semibold">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  statusFilter === s ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            {([
              { id: 'all', label: 'All types' },
              { id: 'institution', label: 'Institutions' },
              { id: 'id_card', label: 'ID Cards' },
            ] as const).map(k => (
              <button
                key={k.id}
                onClick={() => setKindFilter(k.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  kindFilter === k.id ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Queue list */}
      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
          <p className="text-xs font-semibold text-slate-500">Loading review queue…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-14 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            {statusFilter === 'pending' ? 'Queue is clear' : 'No items match these filters'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {statusFilter === 'pending'
              ? 'Every institution and ID card has been reviewed. New submissions flagged during registration or OCR scanning will appear here automatically.'
              : 'Try a different status or type filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      item.kind === 'institution'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {item.kind === 'institution' ? <Building2 className="w-3 h-3" /> : <IdCard className="w-3 h-3" />}
                      {item.kind === 'institution' ? 'Institution claim' : 'ID card OCR'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      item.level === 'recognized'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}>
                      {item.level}
                    </span>

                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {item.confidence}% confidence
                    </span>

                    <span className="text-[10px] text-slate-400">· {timeAgo(item.created_at)}</span>

                    {item.status !== 'pending' && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        item.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-rose-50 text-rose-700 border-rose-300'
                      }`}>
                        {item.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {item.status}{item.reviewed_by ? ` by ${item.reviewed_by}` : ''}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-extrabold text-slate-900">{item.submitted_value}</p>

                  {item.matched_name && item.matched_name !== item.submitted_value && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Closest registry match: <span className="font-bold text-slate-700">{item.matched_name}</span>
                      {item.accreditation ? ` (${item.accreditation})` : ''}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600 flex-wrap">
                    {item.student_name && (
                      <span>Student: <span className="font-bold text-slate-800">{item.student_name}</span></span>
                    )}
                    {item.roll_number && (
                      <span className="font-mono">Roll: <span className="font-bold">{item.roll_number}</span></span>
                    )}
                    {item.student_id && <span className="font-mono text-slate-400">{item.student_id}</span>}
                  </div>

                  {item.review_note && (
                    <p className="mt-2 text-[11px] text-slate-500 italic">“{item.review_note}”</p>
                  )}
                </div>

                {item.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => decide(item.id, 'approved')}
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                    >
                      {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => decide(item.id, 'rejected')}
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
