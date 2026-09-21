import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, MessageSquare, Zap, Clock, CheckCircle2, XCircle, Briefcase, MapPin, Users } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { MentorshipChat } from './MentorshipChat';
import { AlumniDirectory } from './AlumniDirectory';

export const StudentMentorship: React.FC = () => {
  const { student, setNotification } = useApp();
  const [view, setView] = useState<'directory' | 'chats' | 'referrals'>('directory');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [fastTrack, setFastTrack] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [reqs, rms, ft] = await Promise.all([
        api.getMentorshipRequests({ studentId: student.id }).catch(() => []),
        api.getMentorshipRooms(student.id).catch(() => []),
        api.getFastTrackOpportunities(student.id).catch(() => []),
      ]);
      setMyRequests(reqs);
      setRooms(rms);
      setFastTrack(ft);
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => { load(); }, [load]);

  const applyToFastTrack = async (id: string) => {
    setApplying(id);
    try {
      const res = await api.applyFastTrack(id, student.id);
      setNotification(res.alreadyApplied ? 'Already applied — mentor will review.' : 'Application sent directly to your mentor!');
      await load();
    } catch (err: any) {
      setNotification(err.message || 'Apply failed.');
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow"><Users className="w-3.5 h-3.5" /> Mentorship Network</span>
        <h2 className="display-3 text-ink-900 mt-1">Alumni Mentorship</h2>
        <p className="text-sm text-ink-500 mt-1">
          Get verified mentors from your college network, chat privately, and access exclusive fast-track referrals.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-ink-900/[0.04] rounded-2xl w-fit">
        {([
          { id: 'directory', label: 'Find a Mentor', icon: <Users className="w-4 h-4" /> },
          { id: 'chats', label: `My Chats (${rooms.length})`, icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'referrals', label: `Fast-Track (${fastTrack.length})`, icon: <Zap className="w-4 h-4" /> },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => { setView(t.id as any); setActiveRoom(null); }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              view === t.id ? 'bg-ink-900 text-white shadow-card' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center py-10 gap-2 text-ink-400"><Loader2 className="w-5 h-5 animate-spin" /></div>}

      {activeRoom ? (
        <MentorshipChat roomId={activeRoom} onBack={() => { setActiveRoom(null); load(); }} />
      ) : (
        <>
          {view === 'directory' && !loading && (
            <>
              {/* Request status strip */}
              {myRequests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {myRequests.slice(0, 5).map(r => (
                    <span key={r.id} className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                      r.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : r.status === 'declined' ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {r.status === 'accepted' ? <CheckCircle2 className="w-3 h-3" />
                        : r.status === 'declined' ? <XCircle className="w-3 h-3" />
                        : <Clock className="w-3 h-3" />}
                      {r.alumniId === 'alum-xxx' ? 'Mentor' : 'Request'} · {r.status}
                    </span>
                  ))}
                </div>
              )}
              <AlumniDirectory />
            </>
          )}

          {view === 'chats' && !loading && (
            rooms.length === 0 ? (
              <div className="premium-card p-12 text-center">
                <MessageSquare className="w-10 h-10 text-ink-300 mx-auto mb-3" />
                <h3 className="font-bold text-ink-900">No chat rooms yet</h3>
                <p className="text-sm text-ink-500 mt-1">When a mentor accepts your request, your private room appears here.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {rooms.map(r => (
                  <button key={r.id} onClick={() => setActiveRoom(r.id)} className="premium-card premium-card-hover p-4 text-left">
                    <div className="flex items-center gap-3">
                      <img src={r.alumniAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(r.alumniName || 'M')}`} className="w-11 h-11 rounded-full border-2 border-gold-500/40" alt="" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink-900 text-sm truncate">{r.alumniName}</p>
                        <p className="text-xs text-ink-500 truncate">{r.alumniDesignation} · {r.alumniCompany}</p>
                        <p className="text-xs text-ink-400 truncate mt-0.5">{r.lastMessage || 'New room'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {view === 'referrals' && !loading && (
            fastTrack.length === 0 ? (
              <div className="premium-card p-12 text-center">
                <Zap className="w-10 h-10 text-gold-400 mx-auto mb-3" />
                <h3 className="font-bold text-ink-900">No fast-track referrals yet</h3>
                <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
                  Once you're in a mentorship, your mentor can post exclusive openings at their company — bypassing the standard queue.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {fastTrack.map(j => {
                  const applied = j.applicantIds?.includes(student.id);
                  return (
                    <div key={j.id} className="premium-card p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-700 flex items-center justify-center">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-ink-900 text-sm truncate">{j.title}</h3>
                          <p className="text-xs text-ink-500">{j.company} · {j.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-ink-400 mb-3">
                        {j.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{j.location}</span>}
                        {j.stipendOrSalary && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{j.stipendOrSalary}</span>}
                      </div>
                      <p className="text-xs text-ink-500 line-clamp-2 mb-3">{j.description}</p>
                      <p className="text-[10px] font-bold text-gold-700 mb-3">Referred by {j.alumniName}</p>
                      <button
                        onClick={() => applyToFastTrack(j.id)}
                        disabled={applied || applying === j.id}
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                          applied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'btn-gold'
                        }`}
                      >
                        {applying === j.id ? <Loader2 className="w-4 h-4 animate-spin" />
                          : applied ? <><CheckCircle2 className="w-4 h-4" /> Applied — Direct to Mentor</>
                          : <><Zap className="w-4 h-4" /> Fast-Track Apply</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};
