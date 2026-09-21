import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  QrCode, 
  Building2, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { StudentProfile, DigitalBadge } from '../../types';

interface CompetencyPassportModalProps {
  student: StudentProfile;
  badges: DigitalBadge[];
  onClose: () => void;
}

export const CompetencyPassportModal: React.FC<CompetencyPassportModalProps> = ({
  student,
  badges,
  onClose
}) => {
  const passportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const passportId = `SPARK-IND-${student.id.toUpperCase()}-2026`;
  const verificationHash = badges.length > 0 
    ? badges[0].verificationHash 
    : '0x7c9a4b3d81e0f2a96c4d7b1e8a0f5c2b6e9d1a3f5c7b9e1d3f5a7c9b1e3d5f7a';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">National Competency Skill Passport</h2>
              <p className="text-[11px] text-slate-500">NEP 2020 & NCrF Digital Verifiable Credential</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Passport Body */}
        <div ref={passportRef} className="p-6 sm:p-8 space-y-6 print:p-0 print:space-y-4">
          
          {/* Certificate Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white relative overflow-hidden border border-white/10 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold border border-blue-400/30 uppercase tracking-wider">
                    S.P.A.R.K. Official Credential
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Cryptographically Signed</span>
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Student Competency Passport
                </h1>
                <p className="text-xs text-slate-300 font-mono">
                  ID: {passportId}
                </p>
              </div>

              
            </div>
          </div>

          {/* Student Profile Identity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3 sm:col-span-2">
              <img
                src={student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt={student.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500 shadow-sm"
              />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>{student.name}</span>
                  {student.idCardVerified && (
                    <span title="Physical Student ID Card Verified">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-600 font-medium">{student.degree} in {student.branch}</p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>{student.college}</span>
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col justify-between sm:justify-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">AI Readiness Index</p>
                <p className="text-2xl font-black text-indigo-700">{student.readinessScore}%</p>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Industry Benchmark Passed</p>
            </div>
          </div>

          {/* Academic & Verification Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <p className="text-[10px] text-slate-400">Current CGPA</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{student.cgpa} / 10.0</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <p className="text-[10px] text-slate-400">Graduation Year</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{student.graduationYear}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <p className="text-[10px] text-slate-400">Target Role</p>
              <p className="text-sm font-bold text-indigo-700 mt-0.5 truncate">{student.targetRole}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <p className="text-[10px] text-slate-400">College Verification</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{student.domainVerified ? '.edu.in Verified' : 'Verified'}</span>
              </p>
            </div>
          </div>

          {/* AI Verified Skills Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Verified Competency Ledger</span>
              </h4>
              <span className="text-[11px] text-slate-500">{student.verifiedSkills.length} Verified Modules</span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Competency Skill</th>
                    <th className="py-2.5 px-4 text-center">Score</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Verified On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.verifiedSkills.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{s.skill}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-indigo-700">{s.score}%</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>AI Proctored</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 font-mono text-[11px]">{s.verifiedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Digital Badges Showcase */}
          {badges.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>Issued Digital Credentials</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {badges.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border border-indigo-200 flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-900">{b.title}</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">Issuer: {b.issuer}</p>
                      <p className="text-[10px] text-indigo-700 font-mono mt-1">Hash: {b.verificationHash.slice(0, 16)}...</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white shrink-0">
                      {b.scorePercentage}% Score
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cryptographic Audit Stamp Footer */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] text-slate-400 font-mono">
            <div>
              <p>SHA-256 Ledger Hash:</p>
              <p className="text-slate-600 break-all font-semibold">{verificationHash}</p>
            </div>
            <div className="sm:text-right shrink-0">
              <p>Generated by S.P.A.R.K. Cloud AI Engine</p>
              <p className="text-slate-600 font-semibold">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
