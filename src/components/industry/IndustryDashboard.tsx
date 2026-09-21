import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Users, 
  Briefcase, 
  Sparkles, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Send,
  MapPin,
  X
} from 'lucide-react';
import { JobType } from '../../types';

export const IndustryDashboard: React.FC = () => {
  const { jobs, addJob, applications, updateApplicationStatus, activeTab, setActiveTab, setNotification } = useApp();
  const [showPostModal, setShowPostModal] = useState(false);

  // New Job Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<JobType>('Internship');
  const [location, setLocation] = useState('Pune / Bengaluru (Hybrid)');
  const [stipendOrSalary, setStipendOrSalary] = useState('₹45,000 / month');
  const [openings, setOpenings] = useState('10');
  const [description, setDescription] = useState('');
  const [minCgpa, setMinCgpa] = useState('7.5');
  const [skillsInput, setSkillsInput] = useState('React.js, Node.js, Docker, REST APIs');

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const skillsArray = skillsInput.split(',').map(s => ({
      name: s.trim(),
      weight: 0.25,
      minScore: 70
    }));

    addJob({
      title,
      company: 'Tata Motors R&D',
      companyLogo: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=120',
      location,
      type,
      stipendOrSalary,
      openings: parseInt(openings) || 5,
      deadline: '2024-11-15',
      description: description || 'Exciting engineering role working on next-generation automotive embedded systems and connected cloud architectures.',
      requiredSkills: skillsArray,
      minCgpa: parseFloat(minCgpa) || 7.0,
      eligibleBranches: ['Computer Science & Engineering', 'AI & Data Science', 'Electronics & Telecommunication'],
    });

    setNotification(`Successfully posted vacancy: "${title}"`);
    setShowPostModal(false);
    setTitle('');
    setDescription('');
    setActiveTab('dashboard');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Recruiter Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-bold border border-blue-400/30">
                Corporate Hiring & Talent ATS
              </span>
              <span className="text-xs text-blue-200">Smart Automation Matching</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Industry Talent Portal</h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Recruit verified, benchmarked student talent with zero resume fraud. Leverage AI-calculated skill compatibility to slash hiring cycle times by 65%.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('post-job')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-105"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post New Vacancy</span>
            </button>
            <button
              onClick={() => setActiveTab('talent-search')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur border border-white/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>AI Candidate Search</span>
            </button>
          </div>
        </div>

        {/* Top Synchronized Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
          {[
            { id: 'dashboard', label: 'Recruitment Hub', icon: <Building2 className="w-4 h-4" /> },
            { id: 'talent-search', label: 'AI Talent Search', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'post-job', label: 'Post Vacancy', icon: <PlusCircle className="w-4 h-4" /> },
            { id: 'problem-statements', label: 'R&D Capstone Challenges', icon: <Briefcase className="w-4 h-4" /> },
            { id: 'mous', label: 'Academia MoUs', icon: <Users className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONDITIONAL VIEW: POST VACANCY */}
      {activeTab === 'post-job' ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md max-w-3xl mx-auto space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Post Campus Internship / Job Vacancy</h2>
                <p className="text-xs text-slate-500 font-medium">Create an AI-benchmarked opening for verified university talent</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              ← Back to ATS Hub
            </button>
          </div>

          <form onSubmit={handlePostSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Job / Internship Title</label>
              <input
                type="text"
                placeholder="e.g. Edge AI Firmware Engineer, Cloud Backend Intern, Full Stack Developer..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Opportunity Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as JobType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Internship">Internship (6 Months)</option>
                  <option value="Full-Time">Full-Time (Graduate Trainee)</option>
                  <option value="Co-op">Co-op Apprenticeship</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Stipend or CTC</label>
                <input
                  type="text"
                  placeholder="e.g. ₹65,000 / mo or ₹14 LPA"
                  value={stipendOrSalary}
                  onChange={(e) => setStipendOrSalary(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Location / Mode</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Number of Openings</label>
                <input
                  type="number"
                  value={openings}
                  onChange={(e) => setOpenings(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Minimum CGPA Cutoff</label>
                <input
                  type="number"
                  step="0.1"
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Required Competencies (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Docker, Kubernetes, React, Python, Data Structures"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Role Description & Responsibilities</label>
              <textarea
                rows={4}
                placeholder="Describe engineering responsibilities, tech stack, and key project outcomes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all hover:scale-105"
              >
                Publish Campus Vacancy
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* CONDITIONAL VIEW: RECRUITMENT HUB & ATS */
        <>
          {/* Corporate Hiring Funnel KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Active Postings</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{jobs.length}</p>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Campus & Off-Campus</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Total Applicants</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{applications.length + 142}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">From 18 Partner Colleges</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">AI Shortlisted (Passed Cutoff)</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {applications.filter(a => a.status === 'Shortlisted' || a.status === 'Interview Scheduled' || a.status === 'Offer Extended').length + 38}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Matched &gt; 80% competency</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Average Time-to-Hire</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">4.2 Days</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">-60% vs traditional job boards</p>
            </div>
          </div>

          {/* Live Applications Pipeline Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Candidate Applications (ATS Pipeline)</h2>
                <p className="text-xs text-slate-500">Live applications scored by AI Skill Mapping</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{applications.length} direct applications</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Target Role</th>
                    <th className="py-3 px-3 text-center">AI Skill Match</th>
                    <th className="py-3 px-3">Applied Date</th>
                    <th className="py-3 px-3">Current Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{app.studentName}</div>
                        <div className="text-[11px] text-slate-400">ID: {app.studentId}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{app.jobTitle}</div>
                        <div className="text-[11px] text-slate-400">{app.company}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[11px] ${
                          (app.aiMatchScore || 85) >= 90
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (app.aiMatchScore || 85) >= 80
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          <span>{app.aiMatchScore || 85}% Compatible</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">{app.appliedDate}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          app.status === 'Offer Extended'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'Interview Scheduled'
                            ? 'bg-purple-100 text-purple-800'
                            : app.status === 'Shortlisted'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'Assessment Sent'
                            ? 'bg-amber-100 text-amber-800'
                            : app.status === 'Under Review'
                            ? 'bg-indigo-100 text-indigo-800'
                            : app.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(app.status === 'Applied' || app.status === 'Under Review') && (
                            <button
                              onClick={() => updateApplicationStatus(app.id, 'Shortlisted')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px]"
                            >
                              Shortlist
                            </button>
                          )}
                          {app.status === 'Shortlisted' && (
                            <button
                              onClick={() => updateApplicationStatus(app.id, 'Interview Scheduled')}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-[11px]"
                            >
                              Interview
                            </button>
                          )}
                          {app.status === 'Interview Scheduled' && (
                            <button
                              onClick={() => updateApplicationStatus(app.id, 'Offer Extended')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px]"
                            >
                              Offer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Job Postings Matrix */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Your Active Job & Internship Postings</h2>
                <p className="text-xs text-slate-500">Managing real-time criteria and college targeting</p>
              </div>
              <button
                onClick={() => setActiveTab('post-job')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create New Post</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900">{job.title}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {job.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{job.company} • {job.location}</p>
                    <p className="text-xs font-bold text-emerald-700 mt-1">{job.stipendOrSalary}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.requiredSkills.map((rs, idx) => (
                        <span key={idx} className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-medium">
                          {rs.name} (&gt;{rs.minScore}%)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Openings: <strong>{job.openings}</strong></span>
                    <span>Deadline: {job.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
