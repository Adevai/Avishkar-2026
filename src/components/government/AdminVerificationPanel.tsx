import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Factory, BadgeCheck, XCircle, Loader2, FileText,
  ExternalLink, Inbox, RefreshCw, ShieldAlert, Clock, AlertOctagon, Layers,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { SPARK_QUEUE_EVENT } from '../../hooks/useSparkEvents';

interface AdminQueueAccount {
  id: string;
  name: string;
  email: string;
  role: 'college' | 'industry';
  verificationStatus: string;
  createdAt: string;
  aisheCode: string | null;
  officialDomain: string | null;
  cinGstin: string | null;
  hasDocument: boolean;
}

interface AdminStats {
  queueVolume: number | { role: string; count: number }[];
  medianDecisionHours: number | null;
  decisionsCounted: number;
  rejectionReasons: { reason: string; count: number }[];
}

const totalOf = (v: AdminStats['queueVolume']) =>
  typeof v === 'number' ? v : v.reduce((sum, r) => sum + r.count, 0);

/**
 * Metrics strip above the queue: live volume, median time-to-decision and
 * the most common rejection reasons (from admin review notes).
 */
const MetricsStrip: React.FC<{ stats: AdminStats | null }> = ({ stats }) => {
  if (!stats) return null;
  const volume = totalOf(stats.queueVolume);
  const median = stats.medianDecisionHours;
  const medianLabel = median === null
    ? '--'
    : median < 48
      ? `${Math.round(median)}h`
      : `${Math.round((median / 24) * 10) / 10} days`;
  const topReason = stats.rejectionReasons[0];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <Layers className="w-4 h-4" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Queue volume</span>
        </div>
        <p className="mt-1 text-2xl font-black text-blue-900">{volume}</p>
        <p className="text-[10px] text-blue-600">accounts awaiting document review</p>
      </div>
      <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
        <div className="flex items-center gap-2 text-violet-700">
          <Clock className="w-4 h-4" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Median decision time</span>
        </div>
        <p className="mt-1 text-2xl font-black text-violet-900">{medianLabel}</p>
        <p className="text-[10px] text-violet-600">
          across {stats.decisionsCounted} recorded decision{stats.decisionsCounted === 1 ? '' : 's'}
        </p>
      </div>
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertOctagon className="w-4 h-4" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Top rejection reason</span>
        </div>
        <p className="mt-1 text-sm font-bold text-rose-900 leading-snug">
          {topReason ? `"${topReason.reason}"` : 'No rejections recorded'}
        </p>
        {topReason && (
          <p className="text-[10px] text-rose-600">
            {topReason.count} time{topReason.count === 1 ? '' : 's'}
            {stats.rejectionReasons.length > 1
              ? ` + ${stats.rejectionReasons.length - 1} other reason${stats.rejectionReasons.length > 2 ? 's' : ''}`
              : ' (from review notes)'}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Platform Admin verification desk (Government role): institution and
 * industry accounts that registered with a Udyam/Incorporation or AICTE
 * affiliation certificate. Reviewers can open the uploaded certificate via
 * an expiring signed URL and approve or reject the account.
 */
export const AdminVerificationPanel: React.FC = () => {
  const { setNotification } = useApp();
  const [accounts, setAccounts] = useState<AdminQueueAccount[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [docBusyId, setDocBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queue, s] = await Promise.all([
        api.getAdminVerificationQueue(),
        api.getAdminStats().catch(() => null),
      ]);
      setAccounts(queue.accounts || []);
      setStats(s);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load the verification queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates: SSE verification-queue pushes (new certificate, decision
  // elsewhere) refresh the queue and metrics without a manual reload.
  useEffect(() => {
    const onQueue = () => load();
    window.addEventListener(SPARK_QUEUE_EVENT, onQueue);
    return () => window.removeEventListener(SPARK_QUEUE_EVENT, onQueue);
  }, [load]);

  const decide = async (acct: AdminQueueAccount, decision: 'verified' | 'rejected') => {
    setBusyId(acct.id);
    try {
      await api.decideAdminVerification(acct.id, decision);
      setNotification(decision === 'verified'
        ? `${acct.name} verified — they've been notified.`
        : `${acct.name} rejected. They can re-upload documents and resubmit.`);
      await load();
    } catch (err: any) {
      setNotification(err.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const openDocument = async (acct: AdminQueueAccount) => {
    setDocBusyId(acct.id);
    try {
      const { url } = await api.getVerificationDocumentUrl(acct.id);
      window.open(url, '_blank', 'noopener');
    } catch (err: any) {
      setNotification(err.message || 'Could not open the certificate.');
    } finally {
      setDocBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading verification queue…
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-rose-600 font-semibold p-4">{error}</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-3">
        <MetricsStrip stats={stats} />
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
          <Inbox className="w-4 h-4" /> No accounts awaiting document verification.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <MetricsStrip stats={stats} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Accounts awaiting review ({accounts.length})
        </p>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {accounts.map(acct => {
        const isRejected = acct.verificationStatus === 'rejected';
        const isCollege = acct.role === 'college';
        return (
          <div
            key={acct.id}
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-4 ${
              isRejected ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`p-2.5 rounded-xl shrink-0 ${isCollege ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                {isCollege ? <Building2 className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">
                  {acct.name}
                  <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {isCollege ? 'Institution' : 'Industry'}
                  </span>
                  {isRejected && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600">
                      <ShieldAlert className="w-3 h-3" /> previously rejected
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{acct.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  {isCollege ? (
                    <>
                      <span className="font-mono font-bold">AISHE: {acct.aisheCode || '—'}</span>
                      <span className="font-mono">Domain: {acct.officialDomain || '—'}</span>
                    </>
                  ) : (
                    <span className="font-mono font-bold">CIN/GSTIN: {acct.cinGstin || 'not provided (certificate path)'}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {acct.hasDocument && (
                <button
                  onClick={() => openDocument(acct)}
                  disabled={docBusyId === acct.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-50"
                  title="Opens the certificate via a 10-minute signed link"
                >
                  {docBusyId === acct.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  Certificate
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => decide(acct, 'verified')}
                disabled={busyId === acct.id}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {busyId === acct.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                Verify
              </button>
              <button
                onClick={() => decide(acct, 'rejected')}
                disabled={busyId === acct.id}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-rose-50 text-rose-700 text-xs font-bold disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-slate-400">
        Certificates open through expiring signed links (10 minutes) — direct document URLs are never exposed.
        Decisions are audit-logged and the account is notified instantly.
      </p>
    </div>
  );
};
