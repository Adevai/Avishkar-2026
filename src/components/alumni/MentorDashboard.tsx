import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox, MessageSquare, Zap, CheckCircle2, XCircle, Loader2, Users,
  GraduationCap, Plus, Building2, Clock, Send, ToggleLeft, ToggleRight, Save,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { MentorshipRequest } from '../../types';
import { MentorshipChat } from './MentorshipChat';
import { AlumniDirectory } from './AlumniDirectory';

/**
 * Enable Mentor Profile toggle — visible once the alumni record exists
 * (college-approved). Persist company / role / tech stack and opt in or out
 * of the mentor directory.
 */
const MentorProfileToggle: React.FC<{ mentorId: string; onChanged?: () => void }> = ({ mentorId, onChanged }) => {
  const { student, setNotification } = useApp();
  const [isMentor, setIsMentor] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [techStack, setTechStack] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [capacity, setCapacity] = useState(5);

  useEffect(() => {
    let cancelled = false;
    api.getMyAlumniProfile(student.email || '')
      .then(res => {
        if (cancelled || !res.found) return;
        const p: any = res.profile;
        setIsMentor(!!p.isMentor);
        setTechStack(Array.isArray(p.mentorTechStack) ? p.mentorTechStack.join(', ') : '');
        setCurrentCompany(p.company || '');
        setCurrentRole(p.designation || '');
        setCapacity(p.mentorCapacity || 5);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [student.email]);

  const save = async (nextIsMentor: boolean) => {
    setSaving(true);
    try {
      const res = await api.updateMentorProfile({
        isMentor: nextIsMentor,
        mentorCapacity: capacity,
        techStack: techStack.split(',').map(s => s.trim()).filter(Boolean),
        currentCompany: currentCompany || undefined,
        currentRole: currentRole || undefined,
      });
      setIsMentor(!!(res.profile?.is_mentor ?? nextIsMentor));
      setNotification(nextIsMentor ? 'Mentor profile enabled — students can now discover you.' : 'Mentor profile paused.');
      onChanged?.();
    } catch (err: any) {
      setNotification(err.message || 'Failed to update the mentor profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-ink-900 flex items-center gap-2">
            {isMentor ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-ink-300" />}
            Mentor Profile
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            {isMentor
              ? 'You are listed in the verified mentor directory.'
              : 'Enable to appear in the verified mentor directory and receive student requests.'}
          </p>
        </div>
        <button
          onClick={() => save(!isMentor)}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
            isMentor ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-ink-900 hover:bg-ink-800 text-white'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isMentor ? 'Pause Mentoring' : 'Enable Mentor Profile'}
        </button>
      </div>
      {isMentor && (
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Current Company</label>
            <input
              value={currentCompany}
              onChange={e => setCurrentCompany(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs border border-ink-900/10 rounded-xl bg-white"
              placeholder="e.g. Google"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Current Role</label>
            <input
              value={currentRole}
              onChange={e => setCurrentRole(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs border border-ink-900/10 rounded-xl bg-white"
              placeholder="e.g. Senior Backend Engineer"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Tech Stack (comma-separated)</label>
            <input
              value={techStack}
              onChange={e => setTechStack(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs border border-ink-900/10 rounded-xl bg-white"
              placeholder="React, Kubernetes, LLMs"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Mentee Capacity</label>
            <input
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={e => setCapacity(Number(e.target.value) || 5)}
              className="mt-1 w-full px-3 py-2 text-xs border border-ink-900/10 rounded-xl bg-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-900/[0.06] hover:bg-ink-900/10 text-ink-800 text-xs font-bold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save profile details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface Room {
  id: string;
  studentId: string;
  alumniName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount: number;
}

interface FastTrackJob {
  id: string;
  title: string;
  company: string;
  type: string;
  applicantIds: string[];
  postedAt: string;
}

export const MentorDashboard: React.FC<{ initialSection?: string }> = ({ initialSection }) => {
  const { student, setNotification } = useApp();
  const [section, setSection] = useState<'requests' | 'mentees' | 'fasttrack' | 'find-mentor'>(
    (initialSection as any) || 'requests'
  );
  // The signed-in mentor's verified alumni profile — resolved by login email
  // (the alumni id differs from the users/students id).
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [identityState, setIdentityState] = useState<'loading' | 'ready' | 'pending-review' | 'not-found'>('loading');
  const [identityMessage, setIdentityMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const email = student.email || '';
    if (!email) { setIdentityState('not-found'); return; }
    api.getMyAlumniProfile(email)
      .then(res => {
        if (cancelled) return;
        if (res.found) {
          setMentorId(res.profile.id);
          setIdentityState('ready');
        } else {
          setIdentityState(res.applicationStatus === 'pending' ? 'pending-review' : 'not-found');
          setIdentityMessage(res.message);
        }
      })
      .catch(() => { if (!cancelled) setIdentityState('not-found'); });
    return () => { cancelled = true; };
  }, [student.email]);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [fastTrack, setFastTrack] = useState<FastTrackJob[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);

  const load = useCallback(async () => {
    if (!mentorId) return;
    try {
      const [reqs, rms, ft] = await Promise.all([
        api.getMentorshipRequests({ alumniId: mentorId }),
        api.getMentorshipRooms(mentorId),
        api.getFastTrackOpportunities(),
      ]);
      setRequests(reqs);
      setRooms(rms);
      setFastTrack(ft.filter((j: any) => j.alumniId === mentorId));
    } catch {
      // backend unreachable
    } finally {
      setLoading(false);
    }
  }, [mentorId]);

  useEffect(() => { load(); }, [load]);

  const pending = requests.filter(r => r.status === 'pending');

  const respond = async (id: string, decision: 'accepted' | 'declined') => {
    setResponding(id);
    try {
      const res = await api.respondToMentorshipRequest(id, decision);
      if (decision === 'accepted' && res.roomId) {
        setNotification('Mentorship accepted — private chat room created!');
      } else {
        setNotification('Request declined.');
      }
      await load();
    } catch (err: any) {
      setNotification(err.message || 'Action failed.');
    } finally {
      setResponding(null);
    }
  };

  const tabs = [
    { id: 'requests' as const, label: 'Requests', icon: <Inbox className="w-4 h-4" />, badge: pending.length },
    { id: 'mentees' as const, label: 'My Mentees', icon: <MessageSquare className="w-4 h-4" />, badge: rooms.length },
    { id: 'fasttrack' as const, label: 'Fast-Track', icon: <Zap className="w-4 h-4" />, badge: fastTrack.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="eyebrow"><GraduationCap className="w-3.5 h-3.5" /> Mentor Workspace</span>
        <h2 className="display-3 text-ink-900 mt-1">Mentor Dashboard</h2>
        <p className="text-sm text-ink-500 mt-1">
          Review mentorship requests, chat 1-on-1 with mentees, and share fast-track referrals.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 p-1 bg-ink-900/[0.04] rounded-2xl w-fit flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setSection(t.id); setActiveRoom(null); }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              section === t.id ? 'bg-ink-900 text-white shadow-card' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                section === t.id ? 'bg-gold-500 text-ink-950' : 'bg-gold-500/20 text-gold-700'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Enable Mentor Profile toggle — unlocked once the college vouches the alumni record */}
      {mentorId && (
        <MentorProfileToggle
          mentorId={mentorId}
          onChanged={() => { /* requests/rooms refresh themselves via load() */ }}
        />
      )}

      {/* Identity gate: mentor profile must be resolved (university-approved) */}
      {identityState === 'loading' && section !== 'find-mentor' ? (
        <div className="flex items-center justify-center py-16 gap-2 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Resolving your mentor profile…
        </div>
      ) : identityState === 'pending-review' ? (
        <div className="premium-card p-12 text-center">
          <GraduationCap className="w-10 h-10 text-gold-500 mx-auto mb-3" />
          <h3 className="font-bold text-ink-900">Verification in progress</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">{identityMessage}</p>
          <p className="text-xs text-ink-400 mt-3">
            Until your institution approves you, you can explore the directory below —
            mentorship tools unlock after verification.
          </p>
        </div>
      ) : identityState === 'not-found' && section !== 'find-mentor' ? (
        <div className="premium-card p-12 text-center">
          <GraduationCap className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <h3 className="font-bold text-ink-900">No verified alumni profile yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">{identityMessage || 'Register through the Alumni Registration portal to get verified by your institution.'}</p>
        </div>
      ) : loading && section !== 'find-mentor' ? (
        <div className="flex items-center justify-center py-16 gap-2 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading your mentorship data…
        </div>
      ) : activeRoom ? (
        <MentorshipChat roomId={activeRoom} onBack={() => { setActiveRoom(null); load(); }} />
      ) : section === 'find-mentor' ? (
        <AlumniDirectory />
      ) : (
        <>
          {/* REQUESTS */}
          {section === 'requests' && (
            pending.length === 0 ? (
              <div className="premium-card p-12 text-center">
                <Inbox className="w-10 h-10 text-ink-300 mx-auto mb-3" />
                <h3 className="font-bold text-ink-900">No pending requests</h3>
                <p className="text-sm text-ink-500 mt-1">When students request your mentorship, they'll appear here for review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(req => (
                  <div key={req.id} className="premium-card p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="w-11 h-11 rounded-full bg-gold-500/10 text-gold-700 flex items-center justify-center font-extrabold text-lg shrink-0">
                        {req.studentName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-ink-900">{req.studentName}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink-900/[0.05] text-ink-600">
                            {req.studentBranch || 'Student'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> {req.studentCollege || 'Institution not specified'}
                        </p>
                        <p className="text-sm text-ink-700 mt-2.5 p-3 rounded-xl bg-ivory-deep border border-ink-900/[0.05]">
                          "{req.message}"
                        </p>
                        <p className="text-[11px] text-ink-400 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <button
                          onClick={() => respond(req.id, 'accepted')}
                          disabled={responding === req.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-60"
                        >
                          {responding === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Accept
                        </button>
                        <button
                          onClick={() => respond(req.id, 'declined')}
                          disabled={responding === req.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-ink-900/10 text-ink-600 text-sm font-bold hover:bg-ink-900/[0.04] transition-colors disabled:opacity-60"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* MENTEES / CHAT ROOMS */}
          {section === 'mentees' && (
            rooms.length === 0 ? (
              <div className="premium-card p-12 text-center">
                <Users className="w-10 h-10 text-ink-300 mx-auto mb-3" />
                <h3 className="font-bold text-ink-900">No mentees yet</h3>
                <p className="text-sm text-ink-500 mt-1">Accept a mentorship request to open a private chat room.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {rooms.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoom(r.id)}
                    className="premium-card premium-card-hover p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-ink-900 text-gold-400 flex items-center justify-center font-extrabold">
                        {(r.studentId.replace(/^std-/, '').charAt(0) || 'S').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink-900 text-sm truncate">Mentee · {r.studentId.replace(/^std-/, '')}</p>
                        <p className="text-xs text-ink-500 truncate">{r.lastMessage || 'New mentorship room'}</p>
                      </div>
                      <span className="text-[10px] font-extrabold text-ink-400">{r.messageCount} msgs</span>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* FAST-TRACK */}
          {section === 'fasttrack' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-500">Referrals bypass the standard queue — mentees see them instantly via live push.</p>
                <button onClick={() => setShowPostForm(v => !v)} className="btn-gold !px-4 !py-2 text-xs">
                  <Plus className="w-4 h-4" /> Post Referral
                </button>
              </div>

              {showPostForm && (
                <FastTrackForm
                  mentorId={mentorId || ''}
                  onPosted={async () => { setShowPostForm(false); await load(); setNotification('Fast-Track opportunity posted to your mentees!'); }}
                  onCancel={() => setShowPostForm(false)}
                />
              )}

              {fastTrack.length === 0 ? (
                <div className="premium-card p-10 text-center">
                  <Zap className="w-8 h-8 text-gold-400 mx-auto mb-2" />
                  <h3 className="font-bold text-ink-900">No referrals posted yet</h3>
                  <p className="text-sm text-ink-500 mt-1">Share openings at your company exclusively with your mentees.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fastTrack.map(j => (
                    <div key={j.id} className="premium-card p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-700 flex items-center justify-center">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-ink-900 text-sm truncate">{j.title} · {j.company}</p>
                        <p className="text-xs text-ink-500">{j.type} · {j.applicantIds.length} mentee application(s)</p>
                      </div>
                      <span className="text-[11px] text-ink-400">
                        {new Date(j.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Fast-Track post form ──────────────────────────────────────────────
const FastTrackForm: React.FC<{ mentorId: string; onPosted: () => void; onCancel: () => void }> = ({ mentorId, onPosted, onCancel }) => {
  const { student } = useApp();
  const [form, setForm] = useState({ title: '', company: '', type: 'Internship', stipendOrSalary: '', location: '', description: '', expiryDays: 14 });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.title || !form.company) { setError('Title and company are required.'); return; }
    setPosting(true);
    try {
      await api.postFastTrackOpportunity({
        alumniId: mentorId,
        alumniName: student.name,
        title: form.title,
        company: form.company,
        type: form.type as 'Internship' | 'Full-Time',
        stipendOrSalary: form.stipendOrSalary,
        location: form.location,
        description: form.description,
        expiryDays: form.expiryDays,
      });
      onPosted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="premium-card p-5 space-y-3">
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <input placeholder="Role title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm" />
        <input placeholder="Company *" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm" />
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm">
          <option>Internship</option><option>Full-Time</option>
        </select>
        <input placeholder="Stipend / Salary (e.g. ₹40k/month)" value={form.stipendOrSalary} onChange={e => setForm(f => ({ ...f, stipendOrSalary: e.target.value }))} className="px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm" />
        <input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm" />
        <input type="number" min={1} max={90} value={form.expiryDays} onChange={e => setForm(f => ({ ...f, expiryDays: parseInt(e.target.value, 10) || 14 }))} className="px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm" />
      </div>
      <textarea placeholder="Role description, requirements, referral process…" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm resize-none" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-ghost !px-4 !py-2 text-xs">Cancel</button>
        <button onClick={submit} disabled={posting} className="btn-gold !px-4 !py-2 text-xs">
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post to Mentees
        </button>
      </div>
    </div>
  );
};
