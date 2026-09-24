import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDisplayDate } from '../../utils/formatDate';
import { 
  Lightbulb, 
  PlusCircle, 
  Award, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Send, 
  X,
  Building2,
  Users
} from 'lucide-react';

export const ProblemStatements: React.FC = () => {
  const { problems, addProblem, currentRole, setNotification } = useApp();
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedProb, setSelectedProb] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('Tata Motors R&D');
  const [domain, setDomain] = useState('Smart Automation & AI');
  const [rewardOrGrant, setRewardOrGrant] = useState('₹2,00,000 Seed Grant + Incubation');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('Edge AI, Computer Vision, Robotics');

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const tags = tagsInput.split(',').map(t => t.trim());
    const deadline = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    addProblem({
      title,
      company,
      domain,
      description,
      rewardOrGrant,
      deadline,
      tags,
    });

    setShowPostModal(false);
    setTitle('');
    setDescription('');
  };

  const handleSubmitProposal = (probTitle: string) => {
    setNotification(`Proposal submitted for challenge: "${probTitle}"!`);
    setSelectedProb(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>Real-World Industry Problem Statements & Capstones</span>
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Joint R&D
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Industry partners post actual technical bottlenecks; university student-faculty teams submit capstone solutions for seed grants and pre-placement offers.
          </p>
        </div>

        {currentRole === 'industry' && (
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Industry Challenge</span>
          </button>
        )}
      </div>

      {/* Problem Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {problems.map((prob) => (
          <div
            key={prob.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                  {prob.domain}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {prob.submissionsCount} Teams Submitted
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                {prob.title}
              </h2>

              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-3">
                <Building2 className="w-3.5 h-3.5" />
                <span>{prob.company}</span>
              </p>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4">
                {prob.description}
              </p>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs mb-4">
                <p className="font-bold text-emerald-900 text-[11px] flex items-center gap-1 mb-0.5">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Funding & Reward:</span>
                </p>
                <p className="text-emerald-800 font-extrabold text-xs">{prob.rewardOrGrant}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {prob.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Deadline: {formatDisplayDate(prob.deadline)}</span>
              </span>

              {currentRole === 'student' ? (
                <button
                  onClick={() => handleSubmitProposal(prob.title)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Submit Proposal</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-blue-600">
                  Status: {prob.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Post Challenge Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Post R&D Capstone Problem Statement</h3>
              </div>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Challenge Title</label>
                <input
                  type="text"
                  placeholder="e.g. Edge AI Optical Defect Inspection on Assembly Lines..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / R&D Division</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Technology Domain</label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Seed Grant / Prize Pool</label>
                <input
                  type="text"
                  value={rewardOrGrant}
                  onChange={(e) => setRewardOrGrant(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Problem Description & Acceptance Criteria</label>
                <textarea
                  rows={4}
                  placeholder="State the technical specifications, latency cutoffs, data formats, and deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keywords / Tags (Comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  Publish Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
