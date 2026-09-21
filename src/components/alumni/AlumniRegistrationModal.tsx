import React, { useState, useEffect } from 'react';
import { X, GraduationCap, BadgeCheck, Building2, Send, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { searchInstitutionsApi } from '../../data/institutions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultWorkflow?: 'student' | 'alumni' | 'university';
}

const WORKFLOWS = [
  {
    id: 'alumni',
    label: 'Alumni (Mentor)',
    icon: <GraduationCap className="w-5 h-5" />,
    desc: 'Get verified by your institution, mentor students, post fast-track referrals.',
  },
  {
    id: 'student',
    label: 'Student',
    icon: <BadgeCheck className="w-5 h-5" />,
    desc: 'Connect with verified alumni mentors from your college network.',
  },
  {
    id: 'university',
    label: 'University',
    icon: <Building2 className="w-5 h-5" />,
    desc: 'Review and approve alumni applications against academic records.',
  },
] as const;

type WorkflowId = typeof WORKFLOWS[number]['id'];

export const AlumniRegistrationModal: React.FC<Props> = ({ isOpen, onClose, defaultWorkflow = 'alumni' }) => {
  const [workflow, setWorkflow] = useState<WorkflowId>(defaultWorkflow);
  const [step, setStep] = useState<'workflow' | 'details' | 'done'>('workflow');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Professional details form
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    collegeQuery: '',
    collegeId: '',
    collegeName: '',
    collegeVerified: false,
    degree: 'B.Tech',
    graduationYear: new Date().getFullYear() - 3,
    company: '',
    designation: '',
    experienceYears: 3,
    linkedinUrl: '',
    githubUrl: '',
    expertiseRaw: 'Cloud, Backend, System Design',
    bio: '',
    credentialDocName: '',
  });

  // Institution autocomplete
  const [suggestions, setSuggestions] = useState<{ name: string; code: string; type: string; state: string; accreditation?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('workflow');
      setWorkflow(defaultWorkflow);
      setError(null);
    }
  }, [isOpen, defaultWorkflow]);

  useEffect(() => {
    if (!form.collegeQuery || form.collegeQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const results = await searchInstitutionsApi(form.collegeQuery);
        setSuggestions(results.slice(0, 5));
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [form.collegeQuery]);

  if (!isOpen) return null;

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const pickInstitution = (inst: { name: string; code: string; type: string; accreditation?: string }) => {
    set({ collegeName: inst.name, collegeId: inst.code, collegeVerified: true, collegeQuery: inst.name });
    setShowSuggestions(false);
  };

  const submit = async () => {
    setError(null);
    if (!form.fullName || !form.email || !form.collegeId || !form.company || !form.designation) {
      setError('Please fill all required fields (name, email, institution, company, designation).');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitAlumniApplication({
        workflow,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        collegeId: form.collegeId,
        collegeName: form.collegeName || form.collegeQuery,
        degree: form.degree,
        graduationYear: form.graduationYear,
        company: form.company,
        designation: form.designation,
        experienceYears: form.experienceYears,
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl,
        expertise: form.expertiseRaw.split(',').map(s => s.trim()).filter(Boolean),
        bio: form.bio,
        credentialDocName: form.credentialDocName,
      });
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
  }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-ivory rounded-3xl shadow-2xl border border-ink-900/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-ink-900/[0.07] ink-mesh overflow-hidden">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="eyebrow" style={{ color: '#D4B368' }}>Alumni Network</span>
              <h3 className="text-xl font-bold text-white mt-1">Join the Verified Mentorship Network</h3>
              <p className="text-xs text-white/60 mt-0.5">Applications route to your institution's verification desk — never auto-approved.</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'workflow' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink-800 mb-4">Choose your registration workflow</p>
              {WORKFLOWS.map(wf => (
                <button
                  key={wf.id}
                  onClick={() => { setWorkflow(wf.id); setStep('details'); }}
                  className="w-full text-left p-4 rounded-2xl border border-ink-900/10 bg-white hover:border-gold-500/60 hover:shadow-card transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-600 flex items-center justify-center group-hover:bg-gold-500/20 transition-colors">
                      {wf.icon}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-ink-900">{wf.label}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{wf.desc}</p>
                    </div>
                    <Send className="w-4 h-4 text-ink-300 group-hover:text-gold-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={e => set({ fullName: e.target.value })}
                    placeholder="e.g. Ananya Deshpande"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set({ email: e.target.value })}
                    placeholder="you@alumni.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm focus:border-gold-500"
                  />
                </div>
              </div>

              {/* Institution autocomplete with verification badge */}
              <div className="relative">
                <label className="block text-xs font-bold text-ink-700 mb-1.5">Institution *</label>
                <input
                  type="text"
                  value={form.collegeQuery}
                  onChange={e => { set({ collegeQuery: e.target.value, collegeVerified: false }); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Start typing your college / university…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm focus:border-gold-500"
                />
                {form.collegeVerified && (
                  <span className="absolute right-3 top-9 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="w-3 h-3" /> Verified registry match
                  </span>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-ink-900/10 shadow-card-hover overflow-hidden">
                    {suggestions.map(inst => (
                      <button
                        key={inst.code}
                        onClick={() => pickInstitution(inst)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-gold-500/10 transition-colors border-b border-ink-900/5 last:border-0"
                      >
                        <p className="text-sm font-semibold text-ink-900">{inst.name}</p>
                        <p className="text-[11px] text-ink-500">{inst.type} · {inst.state}{inst.accreditation ? ` · ${inst.accreditation}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">Degree *</label>
                  <select
                    value={form.degree}
                    onChange={e => set({ degree: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm"
                  >
                    {['B.Tech', 'B.E.', 'B.Sc', 'BCA', 'M.Tech', 'M.Sc', 'MCA', 'MBA', 'Ph.D'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">Graduation Year *</label>
                  <input
                    type="number"
                    min={1970}
                    max={new Date().getFullYear()}
                    value={form.graduationYear}
                    onChange={e => set({ graduationYear: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">Current Company *</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => set({ company: e.target.value })}
                    placeholder="e.g. Razorpay"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">Designation *</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => set({ designation: e.target.value })}
                    placeholder="e.g. Senior Backend Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    value={form.experienceYears}
                    onChange={e => set({ experienceYears: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">LinkedIn URL</label>
                  <input
                    type="url"
                    value={form.linkedinUrl}
                    onChange={e => set({ linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/…"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1.5">Expertise Areas (comma-separated)</label>
                <input
                  type="text"
                  value={form.expertiseRaw}
                  onChange={e => set({ expertiseRaw: e.target.value })}
                  placeholder="Cloud, Backend, System Design"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1.5">Short Bio / Mentorship Focus</label>
                <textarea
                  value={form.bio}
                  onChange={e => set({ bio: e.target.value })}
                  rows={3}
                  placeholder="What can you help students with? Interviews, career switches, higher studies…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-900/10 bg-white text-sm resize-none"
                />
              </div>

              {/* Credential attachment (document name only — real upload backend-ready) */}
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1.5">Official Credential (Degree Certificate / Alumni ID)</label>
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-ink-900/20 bg-white/60 cursor-pointer hover:border-gold-500/60 transition-colors">
                  <FileText className="w-5 h-5 text-ink-400" />
                  <span className="text-sm text-ink-600 flex-1 truncate">
                    {form.credentialDocName || 'Attach a document to speed up verification (optional)'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => set({ credentialDocName: e.target.files?.[0]?.name || '' })}
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('workflow')} className="btn-ghost flex-1">Back</button>
                <button onClick={submit} disabled={submitting} className="btn-gold flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-10">
              <div className="inline-flex p-4 rounded-full bg-emerald-50 border border-emerald-200 mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h4 className="display-3 text-ink-900">Application Submitted</h4>
              <p className="text-sm text-ink-600 mt-2 max-w-sm mx-auto">
                Your application has been routed to <strong>{form.collegeName || form.collegeQuery}</strong>'s verification desk.
                Once approved, you'll appear in the verified Alumni Directory with mentorship access.
              </p>
              <button onClick={onClose} className="btn-ink mt-6">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
