import React, { useState, useEffect } from 'react';
import { Search, BadgeCheck, Building2, MapPin, Star, MessageSquare, Loader2, Users, X, Send, GraduationCap } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

interface AlumniCard {
  id: string;
  name: string;
  company: string;
  designation: string;
  collegeName: string;
  degree: string;
  graduationYear: number;
  expertise: string[];
  bio: string;
  experienceYears: number;
  avatarUrl?: string;
  activeMentees?: number;
  mentorCapacity: number;
  rating?: number;
}

export const AlumniDirectory: React.FC = () => {
  const { student, setNotification, currentRole } = useApp();
  const [alumni, setAlumni] = useState<AlumniCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AlumniCard | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [requested, setRequested] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getAlumniDirectory(query);
        setAlumni(data);
      } catch {
        setAlumni([]);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [query]);

  const openRequest = (a: AlumniCard) => {
    if (currentRole !== 'student') {
      setNotification('Sign in as a student to request mentorship.');
      return;
    }
    setSelected(a);
    setRequestMessage(`Hello ${a.name}, I'm ${student.name}, a ${student.branch} student at ${student.college}. I'd love your guidance on preparing for a ${student.targetRole} role.`);
  };

  const sendRequest = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await api.sendMentorshipRequest({
        alumniId: selected.id,
        studentId: student.id,
        studentName: student.name,
        studentCollege: student.college,
        studentBranch: student.branch,
        message: requestMessage,
      });
      setRequested(prev => [...prev, selected.id]);
      setNotification(`Mentorship request sent to ${selected.name}!`);
      setSelected(null);
    } catch (err: any) {
      setNotification(err.message || 'Could not send request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + search */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><GraduationCap className="w-3.5 h-3.5" /> Verified Network</span>
          <h2 className="display-3 text-ink-900 mt-1">Alumni Mentor Directory</h2>
          <p className="text-sm text-ink-500 mt-1">
            Every mentor here was verified by their institution's records before joining.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, company, skill…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm focus:border-gold-500"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading verified mentors…
        </div>
      ) : alumni.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Users className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <h3 className="font-bold text-ink-900">No verified alumni yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
            Graduates appear here after their institution approves them through the Alumni Verification Desk.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {alumni.map(a => {
            const slotsFull = (a.activeMentees ?? 0) >= a.mentorCapacity;
            const isRequested = requested.includes(a.id);
            return (
              <div key={a.id} className="premium-card premium-card-hover p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={a.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(a.name)}`}
                    alt={a.name}
                    className="w-12 h-12 rounded-full border-2 border-gold-500/40 bg-ivory"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-ink-900 truncate">{a.name}</h3>
                      <BadgeCheck className="w-4 h-4 text-gold-500 shrink-0" />
                    </div>
                    <p className="text-xs font-semibold text-ink-600 truncate">{a.designation}</p>
                    <p className="text-xs text-ink-400 flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3" /> {a.company}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-ink-500 line-clamp-2 mb-3">{a.bio}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {a.expertise.slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-700 border border-gold-500/20">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-ink-400 mb-3">
                  <span>{a.degree} '{String(a.graduationYear).slice(2)}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {a.collegeName.split(',')[0]}
                  </span>
                  {a.rating ? (
                    <span className="flex items-center gap-0.5 text-gold-600 font-bold">
                      <Star className="w-3 h-3 fill-current" /> {a.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <button
                  onClick={() => openRequest(a)}
                  disabled={isRequested || slotsFull}
                  className={`mt-auto w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    isRequested
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : slotsFull
                      ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                      : 'btn-ink'
                  }`}
                >
                  {isRequested ? <><BadgeCheck className="w-4 h-4" /> Request Sent</>
                    : slotsFull ? 'Mentee Slots Full'
                    : <><MessageSquare className="w-4 h-4" /> Request Mentorship</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Request modal */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-ivory rounded-3xl shadow-2xl border border-ink-900/10 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selected.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(selected.name)}`}
                  alt={selected.name}
                  className="w-12 h-12 rounded-full border-2 border-gold-500/40"
                />
                <div>
                  <h3 className="font-bold text-ink-900">{selected.name}</h3>
                  <p className="text-xs text-ink-500">{selected.designation} · {selected.company}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-ink-400 hover:text-ink-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-xs font-bold text-ink-700 mb-1.5">Your message to the mentor</label>
            <textarea
              value={requestMessage}
              onChange={e => setRequestMessage(e.target.value)}
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm resize-none focus:border-gold-500"
            />
            <p className="text-[11px] text-ink-400 mt-2">
              Mentors see your message and profile before accepting. Once accepted, a private chat room opens for both of you.
            </p>

            <button onClick={sendRequest} disabled={sending || !requestMessage.trim()} className="btn-gold w-full mt-4">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
