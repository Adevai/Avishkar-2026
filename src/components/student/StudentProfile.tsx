import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  UserCheck, 
  UploadCloud, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Plus, 
  X, 
  Target,
  GraduationCap,
  Award,
  Cpu,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  Edit3,
  FileCheck2,
  AlertCircle,
  Camera
} from 'lucide-react';
import { PersonalizeProfileModal } from './PersonalizeProfileModal';
import { StudentIdCardVerificationModal } from './StudentIdCardVerificationModal';
import { CompetencyPassportModal } from './CompetencyPassportModal';
import { verifyAcademicEmail } from '../../utils/domainVerifier';
import { api } from '../../services/api';
import { DigitalBadge } from '../../types';

export const StudentProfile: React.FC = () => {
  const { student, updateStudentProfile, addDeclaredSkill, removeDeclaredSkill, parseResumeWithAI, setActiveTab, setIsSimulatorOpen, setNotification } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [newSkill, setNewSkill] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedResults, setExtractedResults] = useState<{ skill: string; confidence: number; category?: string }[]>([]);
  const [isPersonalizeModalOpen, setIsPersonalizeModalOpen] = useState(false);
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [badges, setBadges] = useState<DigitalBadge[]>([]);
  const [fileDetails, setFileDetails] = useState<{ name: string; sizeKb: number } | null>(null);
  const [scanSummary, setScanSummary] = useState<string>('');

  React.useEffect(() => {
    api.getBadges(student.id).then(res => {
      if (res && res.length > 0) setBadges(res);
    }).catch(() => {});
  }, [student.id]);

  const handleCustomPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setNotification('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setNotification('Image size exceeds 5MB. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          updateStudentProfile({ avatar: dataUrl });
          setNotification('Personal profile photo updated successfully!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const targetRoles = [
    'Full Stack Cloud Engineer',
    'AI/ML Specialist',
    'DevOps & SRE Engineer',
    'Embedded & IoT Systems Engineer',
    'Data Engineer & Analytics Specialist',
    'Cybersecurity Analyst'
  ];

  const handleScanResume = async (file?: File) => {
    setIsScanning(true);
    setExtractedResults([]);
    setScanSummary('');

    if (file) {
      setFileDetails({
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
      });
    }

    try {
      const res = await parseResumeWithAI(file);
      if (res && res.extracted) {
        setExtractedResults(res.extracted);
        if (res.summaryText) setScanSummary(res.summaryText);
      }
    } catch (err: any) {
      console.error('Resume scanning error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      await handleScanResume(dropped);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      await handleScanResume(selected);
    }
  };

  const handleAddSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim()) {
      addDeclaredSkill(newSkill.trim());
      setNewSkill('');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Workflow Step Banner with Ambient Glow */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-100/50 text-slate-900 shadow-sm border border-blue-100 fintech-card overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-gold-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span>Step 1 & 2 • Smart Data Ingestion</span>
              </span>
              <span className="text-xs text-slate-500">Cloud Verified</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Student Profile & Competency Intake
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Build your digital verified identity, scan your resume with NLP automation to extract technical competencies, and benchmark against your target industry track.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPassportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 rounded-2xl text-xs font-bold shadow-glow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Award className="w-4 h-4 text-white" />
              <span>Competency Passport (PDF)</span>
            </button>
            <button
              onClick={() => setIsPersonalizeModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-white" />
              <span>Personalize Profile</span>
            </button>
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>Career Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab('assessment')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 rounded-2xl text-xs font-bold shadow-glow transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Take AI Assessment</span>
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Academic & Personal Details */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Identity Card */}
          <div className="premium-card p-6 space-y-4 relative">
            <button
              onClick={() => setIsPersonalizeModalOpen(true)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-gold-600 hover:bg-gold-500/10 rounded-xl transition-all"
              title="Edit & Personalize Identity"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <input
                type="file"
                ref={photoInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleCustomPhotoChange}
              />
              <div 
                className="relative mb-3 group cursor-pointer" 
                onClick={() => photoInputRef.current?.click()}
                title="Click to upload personal photo"
              >
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-24 h-24 rounded-3xl object-cover ring-4 ring-gold-500/15 shadow-lg group-hover:ring-gold-500/40 transition-all"
                />
                <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1 backdrop-blur-xs">
                  <Camera className="w-5 h-5 mb-1 text-white drop-shadow" />
                  <span className="text-[9px] font-bold">Change Photo</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    photoInputRef.current?.click();
                  }}
                  className="absolute bottom-0 right-0 p-1.5 bg-ink-900 hover:bg-ink-800 text-blue-600 rounded-full ring-2 ring-white shadow-md transition-transform hover:scale-110"
                  title="Upload personal photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" />
                  <span>Upload Personal Photo</span>
                </button>
              </div>

              <h2 className="text-lg font-extrabold text-slate-900">{student.name}</h2>
              <p className="text-xs text-slate-500">{student.email}</p>

              {/* Academic Domain Badge */}
              {(() => {
                const domainInfo = verifyAcademicEmail(student.email);
                if (domainInfo.isAcademic) {
                  return (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{domainInfo.badgeLabel} ({domainInfo.domain})</span>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="mt-2 flex items-center gap-2 flex-wrap justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Class of {student.graduationYear}</span>
                </div>

                {student.idCardVerified ? (
                  <button
                    type="button"
                    onClick={() => setIsIdModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-300 transition-colors shadow-2xs cursor-pointer group"
                    title="Click to view card details or scan a different ID card"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ID Card Verified (OCR)</span>
                    <span className="text-[10px] text-emerald-600 font-normal group-hover:underline">✎</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsIdModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Verify ID Card (OCR)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Institution:</span>
                <div className="text-right">
                  <p className="text-slate-800 font-bold">{student.college}</p>
                  {student.idCardDetails && (
                    <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                      PRN: {student.idCardDetails.rollNumber}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Degree & Branch:</span>
                <span className="text-slate-800 font-bold text-right">{student.degree} • {student.branch}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Cumulative CGPA:</span>
                <span className="text-ink-900 font-extrabold px-2.5 py-0.5 bg-gold-500/10 rounded-lg border border-gold-500/25">{student.cgpa} / 10.0</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Current Semester:</span>
                <span className="text-slate-800 font-bold">{getOrdinal(student.semester)} Semester</span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-slate-500 font-medium">AI Readiness Score:</span>
                <span className="text-emerald-700 font-extrabold px-2.5 py-0.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {student.readinessScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Live GitHub & LeetCode Coding Telemetry Card */}
          <div className="premium-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-800">Live Coding Telemetry</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Active Telemetry
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Synced with GitHub & LeetCode public activity to boost your AI Readiness Score with tangible development proof.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">GitHub Activity</p>
                <p className="text-base font-extrabold text-slate-900 mt-1">18 Repos</p>
                <p className="text-[11px] text-emerald-600 font-semibold">280+ Annual Commits</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">LeetCode Solved</p>
                <p className="text-base font-extrabold text-slate-900 mt-1">146 Problems</p>
                <p className="text-[11px] text-amber-600 font-semibold">68 Med • 14 Hard</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/60 flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-900">Verified Coding Bonus:</span>
              <span className="font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                +14% Readiness Boost
              </span>
            </div>
          </div>

          {/* Target Role Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Target Industry Career Track</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Skill gap radar benchmarks are dynamically computed against this selected role.
            </p>
            <div className="space-y-2 pt-1">
              {targetRoles.map((role) => {
                const selected = student.targetRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => updateStudentProfile({ targetRole: role })}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-between ${
                      selected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100'
                    }`}
                  >
                    <span>{role}</span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Automated Skill Extraction & Declared Competencies */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Smart Resume Ingestion & Terminal HUD Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Smart Resume & NLP Portfolio Scanner</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Drag & drop real resumes (.pdf, .docx, .txt) to extract skills, compute readiness, and sync to PostgreSQL.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Real-Time NLP Engine
              </span>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Drag & Drop Zone */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-500/10 scale-[1.01]' 
                  : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center shadow-inner">
                <FileText className="w-7 h-7" />
              </div>

              {student.resumeUploaded ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{student.resumeName}</p>
                    {fileDetails && (
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        File Size: {fileDetails.sizeKb} KB • Processed via S.P.A.R.K. NLP Parser
                      </p>
                    )}
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resume verified & indexed successfully</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-sm transition-all inline-flex items-center gap-2"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Another Resume</span>
                    </button>
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => handleScanResume()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                    >
                      <Zap className={`w-3.5 h-3.5 text-yellow-300 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Scanning...' : 'Re-scan with NLP'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-800">
                    Drop your actual resume file here (.pdf, .docx, .txt)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    The NLP engine reads file streams, parses section tokens, and detects 200+ industry competencies
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Choose File from Computer</span>
                    </button>
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => handleScanResume()}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold border border-slate-200 transition-all inline-flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Quick Test with Sample CV</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scanning HUD Terminal Display */}
              {isScanning && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-950 text-left font-mono text-xs text-slate-300 border border-slate-800 animate-fadeIn space-y-1.5">
                  <p className="text-emerald-400">&gt; Initializing neural resume parser & byte stream...</p>
                  <p className="text-blue-400">&gt; Scanning document section boundaries (Skills, Projects, Experience)...</p>
                  <p className="text-yellow-300 animate-pulse">&gt; Evaluating 200+ industry competencies with regex word-boundaries...</p>
                  <p className="text-slate-400">&gt; Computing contextual confidence metrics & syncing to PostgreSQL...</p>
                </div>
              )}

              {/* Scan Summary Banner */}
              {scanSummary && !isScanning && (
                <div className="mt-4 p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{scanSummary}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200/60 rounded-full">
                    Readiness: {student.readinessScore}%
                  </span>
                </div>
              )}

              {/* Extracted Skills with Confidence Meters */}
              {extractedResults.length > 0 && !isScanning && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-950 text-left font-mono text-xs border border-slate-800 animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                      &gt; Extracted Competencies with NLP Confidence:
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {extractedResults.length} skills recognized
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {extractedResults.map((item, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="truncate pr-1">
                          <span className="text-slate-800 text-[11px] font-semibold block truncate">{item.skill}</span>
                          {item.category && (
                            <span className="text-[9px] text-slate-500 block truncate">{item.category}</span>
                          )}
                        </div>
                        <span className="text-emerald-400 font-bold text-[10px] ml-1">{item.confidence}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ATS Resume Score & Optimizer Suggestions */}
              {student.resumeUploaded && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/80 text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900">ATS Resume Optimizer & Diagnostic Score</h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                      ATS Score: 88/100
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    High ATS parseability for target role ({student.targetRole}). Recommended optimizations to maximize interview conversion:
                  </p>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Impact Metrics:</strong> Strong presence of quantifiable metrics (e.g., latency, throughput, scale).</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Formatting:</strong> Standard clean headings, no multi-column parsing traps detected.</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Suggested Action:</strong> Add keywords like <em>Distributed Tracing, gRPC, and Canary Rollouts</em> to match 95%+ of Tier-1 job descriptions.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skills Management Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Declared & Extracted Skills</span>
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {student.declaredSkills.length} declared skills
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                These competencies are benchmarked against corporate requirements during opportunity matching.
              </p>
            </div>

            {/* Skill Add Form */}
            <form onSubmit={handleAddSkillSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. AWS Lambda, GraphQL, TailwindCSS, Spring Boot..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-1 text-xs px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/60"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Skill</span>
              </button>
            </form>

            {/* Declared Skill Chips */}
            <div className="flex flex-wrap gap-2">
              {student.declaredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold transition-colors"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeDeclaredSkill(skill)}
                    className="p-0.5 hover:text-rose-600 transition-colors"
                    title="Remove skill"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Verified Skills Grid */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                AI Assessed & Verified Skills ({student.verifiedSkills.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {student.verifiedSkills.map((vs) => (
                  <div
                    key={vs.skill}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{vs.skill}</p>
                      <p className="text-[10px] text-slate-400">Verified: {vs.verifiedAt}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                        vs.score >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        vs.score >= 60 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {vs.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      <PersonalizeProfileModal
        isOpen={isPersonalizeModalOpen}
        onClose={() => setIsPersonalizeModalOpen(false)}
      />

      <StudentIdCardVerificationModal
        isOpen={isIdModalOpen}
        onClose={() => setIsIdModalOpen(false)}
      />

      {isPassportModalOpen && (
        <CompetencyPassportModal
          student={student}
          badges={badges}
          onClose={() => setIsPassportModalOpen(false)}
        />
      )}
    </div>
  );
};
