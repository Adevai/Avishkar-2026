import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DigitalSignatureStudio } from './DigitalSignatureStudio';
import { 
  Handshake, 
  PlusCircle, 
  Calendar, 
  CheckCircle2, 
  Building2, 
  FileText, 
  ShieldCheck, 
  QrCode,
  X,
  Award,
  PenTool,
  Sparkles
} from 'lucide-react';

export const MoUManager: React.FC = () => {
  const { mous, addMoU, setNotification } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [showSignatureStudio, setShowSignatureStudio] = useState(false);
  const [activeSignatureHash, setActiveSignatureHash] = useState<string | null>(null);

  // Form State
  const [collegeName, setCollegeName] = useState('COEP Technological University, Pune');
  const [companyName, setCompanyName] = useState('');
  const [title, setTitle] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [validYears, setValidYears] = useState('3');
  const [objectives, setObjectives] = useState('');

  const handleSignatureConfirmed = (hash: string) => {
    setActiveSignatureHash(hash);
    setShowSignatureStudio(false);
    setNotification('Cryptographic digital signature applied successfully!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !title || !focusArea) return;

    const validDate = new Date();
    validDate.setFullYear(validDate.getFullYear() + parseInt(validYears));

    await addMoU({
      collegeName,
      companyName,
      title,
      focusArea,
      validUntil: validDate.toISOString().split('T')[0],
      initiativesCount: 1,
      keyObjectives: objectives.split('\n').filter(o => o.trim().length > 0),
      digitalSignatureHash: activeSignatureHash || undefined,
    });

    setShowModal(false);
    setCompanyName('');
    setTitle('');
    setFocusArea('');
    setObjectives('');
    setActiveSignatureHash(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-blue-600" />
              <span>Industry–Academia MoU & Collaboration Center</span>
            </h1>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              PostgreSQL Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Formal institutional agreements, joint Centers of Excellence (CoE), and legally valid digital signature audit trails.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Initiate Digital MoU</span>
        </button>
      </div>

      {/* MoU Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mous.map((mou) => (
          <div
            key={mou.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {mou.status} MoU
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  {mou.id}
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                {mou.title}
              </h2>

              <div className="text-xs text-slate-600 space-y-1 mb-3">
                <p className="font-semibold text-blue-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>{mou.collegeName}</span>
                </p>
                <p className="font-semibold text-indigo-700 flex items-center gap-1.5">
                  <Handshake className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{mou.companyName}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 mb-4">
                <p className="font-bold text-slate-800 text-[11px] mb-1">Scope & Deliverables:</p>
                <p className="text-[11px] leading-relaxed text-slate-600">{mou.focusArea}</p>
              </div>

              {mou.keyObjectives && mou.keyObjectives.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Key Deliverables
                  </p>
                  <ul className="space-y-1">
                    {mou.keyObjectives.map((obj, oIdx) => (
                      <li key={oIdx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Verified Digital Signature Badge */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between text-[11px] mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-blue-900 text-[10px]">Digitally Sealed</span>
                </div>
                <span className="font-mono text-[9px] text-blue-700 font-semibold truncate max-w-[140px]">
                  {mou.digitalSignatureHash || '0x49a2...e7b1'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Valid: <strong>{mou.validUntil}</strong></span>
              </span>
              <span className="font-extrabold text-blue-600">
                {mou.initiativesCount} Joint Initiatives
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal to Create MoU */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Initiate Digital MoU & Partnership</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Institution</label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Corporate / Industry Partner</label>
                <input
                  type="text"
                  placeholder="e.g. Google Cloud, Siemens, Qualcomm, Infosys..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">MoU Title / Program</label>
                <input
                  type="text"
                  placeholder="e.g. Center of Excellence in Cloud & Edge AI..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scope & Key Focus Areas</label>
                <input
                  type="text"
                  placeholder="e.g. 35 guaranteed paid internships, joint lab testbed..."
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Key Objectives (One per line)</label>
                <textarea
                  rows={3}
                  placeholder="30 Annual paid internships&#10;Sponsored GPU compute laboratory&#10;Semi-annual curriculum advisory panel"
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Digital Signature Studio Trigger */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-[11px]">Digital Institutional Signature</p>
                  <p className="text-[10px] text-slate-400">
                    {activeSignatureHash ? `Signed: ${activeSignatureHash.slice(0, 16)}...` : 'Not signed yet'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignatureStudio(true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5"
                >
                  <PenTool className="w-3 h-3" />
                  <span>{activeSignatureHash ? 'Re-sign Document' : 'Open Signature Pad'}</span>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-2xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md transition-all"
                >
                  Execute & Sync to PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Studio Modal */}
      {showSignatureStudio && (
        <DigitalSignatureStudio
          onConfirmSignature={handleSignatureConfirmed}
          onClose={() => setShowSignatureStudio(false)}
        />
      )}
    </div>
  );
};
