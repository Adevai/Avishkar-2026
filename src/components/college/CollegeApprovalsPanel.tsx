import React, { useCallback, useEffect, useState } from 'react';
import { GraduationCap, BadgeCheck, XCircle, Loader2, ExternalLink, UserCheck, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

interface PendingStudent {
  id: string;
  name: string;
  email: string;
  student_id: string;
  college: string;
  branch: string;
  graduation_year: number;
  enrollment_number: string | null;
  prn: string | null;
  created_at: string;
}

interface PendingAlumniApp {
  id: string;
  full_name: string;
  email: string;
  college_name: string;
  degree: string;
  graduation_year: number;
  company: string;
  designation: string;
  linkedin_url: string | null;
  created_at: string;
}

/**
 * College TPO one-click approval desk — covers:
 *  - Students who registered with a personal email (PENDING_COLLEGE_APPROVAL)
 *  - Alumni portal registrations awaiting the college vouch (which unlocks
 *    their Enable Mentor Profile toggle)
 */
export const CollegeApprovalsPanel: React.FC = () => {
  const { setNotification } = useApp();
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [alumniApps, setAlumniApps] = useState<PendingAlumniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCollegeApprovals();
      setStudents(res.students || []);
      setAlumniApps(res.alumniApplications || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, kind: 'student' | 'alumni', decision: 'verified' | 'rejected') => {
    setBusyId(id);
    try {
      await api.decideCollegeApproval(id, kind, decision);
      setNotification(decision === 'verified'
        ? `Approved — ${kind === 'alumni' ? 'the mentor profile toggle is now unlocked for this alum.' : 'the student now has full access.'}`
        : 'Rejected.');
      await load();
    } catch (err: any) {
      setNotification(err.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading pending approvals…
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-rose-600 font-semibold p-4">{error}</div>;
  }

  if (students.length === 0 && alumniApps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
        <BadgeCheck className="w-4 h-4" /> No pending approvals — everyone is verified.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {students.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Students awaiting college approval ({students.length})
          </p>
          <div className="space-y-2">
            {students.map(s => (
              <div key={s.id} className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{s.name} <span className="text-xs font-normal text-slate-500">({s.email})</span></p>
                  <p className="text-[11px] text-slate-600">
                    {s.branch || '—'} · Grad {s.graduation_year || '—'}
                    {s.enrollment_number ? ` · Enr. ${s.enrollment_number}` : ''}
                    {s.prn ? ` · PRN ${s.prn}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => decide(s.id, 'student', 'verified')}
                    disabled={busyId === s.id}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => decide(s.id, 'student', 'rejected')}
                    disabled={busyId === s.id}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-rose-50 text-rose-700 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {alumniApps.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Alumni vouch requests ({alumniApps.length})
          </p>
          <div className="space-y-2">
            {alumniApps.map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {a.full_name} <span className="text-xs font-normal text-slate-500">({a.email})</span>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {a.degree} {a.graduation_year} · {a.designation} at {a.company}
                  </p>
                  {a.linkedin_url && (
                    <a href={a.linkedin_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-700 font-semibold inline-flex items-center gap-1 mt-0.5">
                      <ExternalLink className="w-3 h-3" /> LinkedIn profile
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => decide(a.id, 'alumni', 'verified')}
                    disabled={busyId === a.id}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                    Vouch
                  </button>
                  <button
                    onClick={() => decide(a.id, 'alumni', 'rejected')}
                    disabled={busyId === a.id}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-rose-50 text-rose-700 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Approvals are logged in the audit trail and the member is notified instantly.
      </p>
    </div>
  );
};
