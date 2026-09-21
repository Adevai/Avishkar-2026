import React, { useState, useEffect, useCallback } from 'react';
import { Inbox, BadgeCheck, XCircle, Loader2, Building2, GraduationCap, FileText, Search } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { searchInstitutionsApi } from '../../data/institutions';

export const UniversityAlumniVerificationDesk: React.FC = () => {
  const { student, setNotification } = useApp();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedCollege, setSelectedCollege] = useState(() => {
    // Default to the TPO's own institution when known
    return localStorage.getItem('desk_college_id') || '';
  });
  const [collegeQuery, setCollegeQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!selectedCollege) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.getPendingAlumniApplications(selectedCollege);
      setApplications(data);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCollege]);

  useEffect(() => { load(); }, [load]);

  // Institution search for the desk selector
  useEffect(() => {
    if (!collegeQuery || collegeQuery.length < 3) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const results = await searchInstitutionsApi(collegeQuery);
        setSuggestions(results.slice(0, 5));
      } catch { setSuggestions([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [collegeQuery]);

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    setProcessing(id);
    try {
      await api.reviewAlumniApplication(id, decision, notes[id]);
      setNotification(decision === 'approved'
        ? 'Application approved — alumnus added to the verified directory.'
        : 'Application rejected with review note.');
      await load();
    } catch (err: any) {
      setNotification(err.message || 'Review failed.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow"><GraduationCap className="w-3.5 h-3.5" /> Institutional Records Check</span>
        <h2 className="display-3 text-ink-900 mt-1">Alumni Verification Desk</h2>
        <p className="text-sm text-ink-500 mt-1">
          Applications route here from graduates of your institution. Approve only what your academic records confirm.
        </p>
      </div>

      {/* Institution selector */}
      <div className="premium-card p-4">
        <label className="block text-xs font-bold text-ink-700 mb-1.5">Verification desk for institution</label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            value={collegeQuery || selectedCollege}
            onChange={e => { setCollegeQuery(e.target.value); localStorage.removeItem('desk_college_id'); }}
            placeholder="Select your college / university…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm focus:border-gold-500"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-ink-900/10 shadow-card-hover overflow-hidden">
              {suggestions.map(inst => (
                <button
                  key={inst.code}
                  onClick={() => {
                    setSelectedCollege(inst.code);
                    setCollegeQuery('');
                    localStorage.setItem('desk_college_id', inst.code);
                    setSuggestions([]);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-gold-500/10 transition-colors border-b border-ink-900/5 last:border-0"
                >
                  <p className="text-sm font-semibold text-ink-900">{inst.name}</p>
                  <p className="text-[11px] text-ink-500">{inst.type} · {inst.state}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        {!selectedCollege && (
          <p className="text-[11px] text-amber-600 mt-2 font-medium">
            Select your institution to start receiving and reviewing alumni applications.
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading applications…
        </div>
      ) : !selectedCollege ? (
        <div className="premium-card p-12 text-center">
          <Building2 className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <h3 className="font-bold text-ink-900">No institution selected</h3>
          <p className="text-sm text-ink-500 mt-1">Choose your institution above to review its alumni applications.</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Inbox className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <h3 className="font-bold text-ink-900">Queue is clear</h3>
          <p className="text-sm text-ink-500 mt-1">No pending alumni applications for this institution right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app.id} className="premium-card p-5">
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Applicant identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-white flex items-center justify-center font-extrabold shrink-0">
                      {app.fullName?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink-900 truncate">{app.fullName}</h3>
                      <p className="text-xs text-ink-500">{app.email}</p>
                    </div>
                    <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      PENDING
                    </span>
                  </div>

                  {/* Academic records section */}
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                    <p><span className="text-ink-400 text-xs font-bold uppercase tracking-wide">Degree</span><br />{app.degree}</p>
                    <p><span className="text-ink-400 text-xs font-bold uppercase tracking-wide">Graduation Year</span><br />{app.graduationYear}</p>
                    <p><span className="text-ink-400 text-xs font-bold uppercase tracking-wide">Current Company</span><br />{app.company}</p>
                    <p><span className="text-ink-400 text-xs font-bold uppercase tracking-wide">Designation</span><br />{app.designation}</p>
                  </div>

                  {app.expertise?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {app.expertise.map((s: string) => (
                        <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-700 border border-gold-500/20">{s}</span>
                      ))}
                    </div>
                  )}

                  {app.bio && <p className="text-xs text-ink-600 mb-3">{app.bio}</p>}

                  {app.credentialDocName && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 bg-ivory-deep border border-ink-900/[0.06] px-2.5 py-1.5 rounded-lg">
                      <FileText className="w-3.5 h-3.5 text-gold-600" /> {app.credentialDocName}
                    </p>
                  )}
                </div>

                {/* Decision panel */}
                <div className="lg:w-80 shrink-0 space-y-2.5">
                  <label className="block text-xs font-bold text-ink-700">Review note (shared with applicant)</label>
                  <textarea
                    rows={2}
                    value={notes[app.id] || ''}
                    onChange={e => setNotes(n => ({ ...n, [app.id]: e.target.value }))}
                    placeholder="e.g. Verified against 2019 CSE batch records"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm resize-none focus:border-gold-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(app.id, 'approved')}
                      disabled={processing === app.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-60"
                    >
                      {processing === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => review(app.id, 'rejected')}
                      disabled={processing === app.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-ink-900/10 text-ink-600 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
