import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  GraduationCap, 
  Briefcase, 
  Landmark, 
  BookOpen, 
  Award, 
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { api } from '../services/api';
import { verifyInstitution, VERIFIED_INSTITUTIONS } from '../data/institutions';
import { verifyAcademicEmail } from '../utils/domainVerifier';
import { CollegeAutocomplete } from '../components/common/CollegeAutocomplete';
import { AcademicSelector } from '../components/common/AcademicSelector';
import { StudentIdCardVerificationModal } from '../components/student/StudentIdCardVerificationModal';

interface ServerInstitutionVerification {
  verified: boolean;
  level: 'verified' | 'recognized' | 'unverified';
  confidence: number;
  matchedName?: string;
  matchedType?: string;
  accreditation?: string;
  nirfRank?: number;
  note: string;
}

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerAccount } = useApp();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Core Identity
  const [accountType, setAccountType] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Email OTP Verification
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  // Step 3: server-side registration failure (surfaced to the user — never silently swallowed)
  const [regError, setRegError] = useState('');

  // Step 3: Student Academic Intake
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('B.Tech');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState('3');
  const [cgpa, setCgpa] = useState('8.20');
  const [graduationYear, setGraduationYear] = useState('2026');
  const [targetRole, setTargetRole] = useState('Full Stack Cloud Engineer');
  const [bio, setBio] = useState('');
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [idCardVerified, setIdCardVerified] = useState(false);
  const [idCardInfo, setIdCardInfo] = useState<{ rollNumber?: string; institutionName?: string } | null>(null);

  // Live server-side verification of the entered college against the accredited registry
  const [instVerification, setInstVerification] = useState<ServerInstitutionVerification | null>(null);
  const [isVerifyingInst, setIsVerifyingInst] = useState(false);

  // Step 3: College / Faculty Intake
  const [facultyDept, setFacultyDept] = useState('Department of Computer Science & Engineering');
  const [designation, setDesignation] = useState('Assistant Professor & TPO Coordinator');

  // Step 3: Industry Partner Intake
  const [companyName, setCompanyName] = useState('');
  const [industryDomain, setIndustryDomain] = useState('Cloud Computing & Enterprise SaaS');
  const [recruiterTitle, setRecruiterTitle] = useState('Senior Technical Recruiter');

  // Step 3: Government Official Intake
  const [govtDept, setGovtDept] = useState('State Directorate of Technical Education (DTE)');
  const [govtJurisdiction, setGovtJurisdiction] = useState('Western Regional Directorate');

  const accountTypes = [
    { 
      id: 'student', 
      label: 'Student', 
      desc: 'Verify skills, scan CV & apply to top jobs',
      icon: GraduationCap 
    },
    { 
      id: 'college', 
      label: 'Institution', 
      desc: 'Curriculum gap analysis, MoUs & TPO',
      icon: Building2 
    },
    { 
      id: 'industry', 
      label: 'Industry', 
      desc: 'Post jobs, publish capstones & hire talent',
      icon: Briefcase 
    },
    
    {
      id: 'alumni',
      label: 'Alumni / Mentor',
      desc: 'Mentor students & provide guidance',
      icon: User
    }
  ] as const;

  const targetRoles = [
    // Tech & Computing
    'Full Stack Cloud Engineer',
    'AI/ML Specialist',
    'DevOps & SRE Engineer',
    'Data Engineer & Analytics Specialist',
    'Cybersecurity Analyst',
    'Embedded & IoT Systems Engineer',
    // Mechanical & Automation
    'Mechanical Design & CAD/CAM Engineer',
    'Thermal & Energy Systems Specialist',
    'Robotics & Mechatronics Engineer',
    'Automotive & EV Systems Engineer',
    // Civil & Infrastructure
    'Structural Analysis & Design Engineer',
    'BIM Specialist & Construction Manager',
    'Geotechnical & Foundation Engineer',
    'Urban Infrastructure & Smart Cities Planner',
    // Medical & Healthcare
    'Clinical Research & Diagnostics Associate',
    'Medical Officer & Healthcare Consultant',
    'Pharmacovigilance & Drug Discovery Specialist',
    'Biomedical Instrumentation Engineer',
    'Public Health & Epidemiological Analyst',
    // Law & Legal Studies
    'Corporate Legal Counsel & Compliance Officer',
    'Intellectual Property & Patent Attorney',
    'Cyber Law & Data Privacy Consultant',
    'Civil & Commercial Litigation Specialist',
    // Arts, Design & Media
    'UI/UX & Digital Product Designer',
    'Industrial & Ergonomic Product Designer',
    'Visual Communication & Brand Strategist',
    'Digital Media & Content Strategist'
  ];

  const handleSendOtp = async (targetEmail: string, targetName: string) => {
    setIsSendingOtp(true);
    setOtpError('');
    try {
      const res = await api.requestRegistrationOtp(targetEmail, targetName);
      setOtpSent(true);
      // devOtp is only present in non-production responses (SMTP fallback) so
      // local testing never requires digging through the database for the code.
      setOtpSuccess(
        res.devOtp
          ? `${res.message || 'Verification code sent'} — dev OTP: ${res.devOtp}`
          : (res.message || `Verification code sent to ${targetEmail}`)
      );
    } catch (err: any) {
      setOtpError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setCurrentStep(2);
    await handleSendOtp(email.trim(), name.trim());
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyingOtp) return; // re-render race guard: drop duplicate submits
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setOtpError('Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      await api.verifyRegistrationOtp(email.trim(), otpCode.trim());
      setOtpSuccess('Email verified successfully!');
      setTimeout(() => {
        setCurrentStep(3);
      }, 500);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // re-render race guard: the first click always wins
    setIsLoading(true);

    try {
      await registerAccount({
        role: accountType,
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        college: accountType === 'student' ? (college.trim() || 'COEP Technological University') : (college.trim() || 'COEP Tech'),
        degree,
        branch,
        semester: parseInt(semester, 10) || 1,
        cgpa: parseFloat(cgpa) || 8.0,
        graduationYear: parseInt(graduationYear, 10) || 2026,
        targetRole,
        bio: bio.trim() || `Undergraduate student passionate about technology and software development.`,
        company: companyName.trim() || 'Enterprise Partner Corp',
        department: accountType === 'college' ? facultyDept : govtDept,
        designation: accountType === 'college' ? designation : (accountType === 'industry' ? recruiterTitle : designation),
        jurisdiction: govtJurisdiction,
      });

      localStorage.setItem('spark_new_registration', 'true');
      localStorage.removeItem('spark_intake_completed');
      navigate('/onboarding');
    } catch (err: any) {
      // The account was NOT persisted — show the real reason instead of
      // navigating away and pretending the signup succeeded.
      const msg = err?.message || 'Registration failed. Please try again.';
      setRegError(msg);
      console.error('Registration failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const stepProgress = currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%';

  // Debounced server verification whenever the college name settles
  React.useEffect(() => {
    if (accountType !== 'student' || currentStep !== 3) return;
    const trimmed = college.trim();
    if (trimmed.length < 4) {
      setInstVerification(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifyingInst(true);
      try {
        const v = await api.verifyInstitution(trimmed);
        setInstVerification(v);
      } catch {
        setInstVerification(null);
      } finally {
        setIsVerifyingInst(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [college, accountType, currentStep]);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Header & Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Step {currentStep} of 3 • {
                currentStep === 1 
                  ? 'Account Setup' 
                  : currentStep === 2 
                  ? 'Email Verification' 
                  : 'Institutional Profile'
              }
            </span>
          </span>
          <span className="text-xs font-semibold text-slate-400">
            {stepProgress} complete
          </span>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          {currentStep === 1 
            ? 'Create your S.P.A.R.K. Account' 
            : currentStep === 2 
            ? 'Verify Your Email Address' 
            : `Complete your ${accountTypes.find(t => t.id === accountType)?.label} Profile`
          }
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          {currentStep === 1
            ? 'Join the AI-powered bridge connecting students, academia, industry, and governance.'
            : currentStep === 2
            ? `We've sent a 6-digit security code to ${email || 'your email'}.`
            : 'Enter your genuine institutional credentials to calibrate personalized skill radars.'}
        </p>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 rounded-full transition-all duration-500"
            style={{ width: stepProgress }}
          />
        </div>
      </div>

      {/* STEP 1: Core Credentials */}
      {currentStep === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Your Portal Role</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {accountTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = accountType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setAccountType(type.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-xs font-bold ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-600 text-blue-700 ring-2 ring-blue-600/20 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1 text-blue-600" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 italic mt-1">
              {accountTypes.find(t => t.id === accountType)?.desc}
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Legal Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white placeholder:text-slate-400"
                placeholder="e.g. Akshat Sharma"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
              {email.includes('@') && (() => {
                const domainInfo = verifyAcademicEmail(email);
                if (domainInfo.isAcademic) {
                  return (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 animate-fadeIn">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>{domainInfo.institutionCode ? `${domainInfo.institutionCode} Academic Domain` : 'Academic Domain Verified'}</span>
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  const newEmail = e.target.value;
                  setEmail(newEmail);
                  // Auto-detect and suggest college if institutional email
                  const domainInfo = verifyAcademicEmail(newEmail);
                  if (domainInfo.isAcademic && domainInfo.institutionName && !college) {
                    setCollege(domainInfo.institutionName);
                  }
                }}
                className="block w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white placeholder:text-slate-400"
                placeholder="you@institution.ac.in (or gmail.com)"
              />
            </div>
            {email.includes('@') && verifyAcademicEmail(email).isAcademic && (
              <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{verifyAcademicEmail(email).notes}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Create Secure Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white placeholder:text-slate-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] mt-6"
          >
            <span>Proceed to Step 2: Email Verification</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* STEP 2: Email OTP Verification */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-400">
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-blue-950">Security OTP Dispatched</h4>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                We sent a 6-digit numeric verification code to <span className="font-bold underline">{email}</span>. Please check your inbox or spam folder.
              </p>
            </div>
          </div>

          {otpError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          {otpSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{otpSuccess}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Enter 6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  autoFocus
                  required
                  className="w-full text-center tracking-[12px] font-mono text-2xl py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-black text-slate-800 placeholder:text-slate-300 placeholder:tracking-normal"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Code expires in 10 minutes. Sent via secure S.P.A.R.K. SMTP Gateway.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setOtpError('');
                  setOtpSuccess('');
                }}
                className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs sm:text-sm font-bold transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Edit Email</span>
              </button>

              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleSendOtp(email.trim(), name.trim())}
                disabled={isSendingOtp}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                <span>{isSendingOtp ? 'Resending Code...' : 'Resend Verification Code'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: Role-Specific Details */}
      {currentStep === 3 && (
        <form onSubmit={handleCompleteRegistration} className="space-y-4">

          {regError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span>{regError}</span>
                <button
                  type="button"
                  onClick={() => setRegError('')}
                  className="block mt-1 text-[11px] underline text-rose-600 hover:text-rose-800"
                >
                  Dismiss and try again
                </button>
              </div>
            </div>
          )}

          {/* STUDENT FORM */}
          {accountType === 'student' && (
            <div className="space-y-3.5">
              <CollegeAutocomplete
                value={college}
                onChange={(name) => setCollege(name)}
                placeholder="Search college, university, or institute (e.g. AIIMS, Patil, COEP, BITS)..."
              />

              {/* Live accredited-registry verification badge */}
              {college.trim().length >= 4 && (
                <div className="flex items-center gap-2 min-h-7">
                  {isVerifyingInst ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying against accredited institutions registry…</span>
                    </span>
                  ) : instVerification ? (
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      instVerification.level === 'verified'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : instVerification.level === 'recognized'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                      {instVerification.level === 'verified' ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : instVerification.level === 'recognized' ? (
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>
                        {instVerification.level === 'verified'
                          ? `${instVerification.matchedName || college} — Verified${instVerification.accreditation ? ` (${instVerification.accreditation})` : ''}`
                          : instVerification.level === 'recognized'
                          ? 'Plausible institution — pending registry confirmation'
                          : 'Not found in accredited registry — please check the spelling'}
                      </span>
                      {instVerification.nirfRank && (
                        <span className="text-[10px] font-mono bg-white/70 px-1.5 py-0.5 rounded">
                          NIRF #{instVerification.nirfRank}
                        </span>
                      )}
                    </span>
                  ) : null}
                </div>
              )}

              {/* Instant ID Card OCR Verification Trigger */}
              <div className="p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-100 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white ${idCardVerified ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{idCardVerified ? 'Student ID Card Verified' : 'Verify with Student ID Card (AI OCR)'}</span>
                      {idCardVerified && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                          {idCardInfo?.rollNumber}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {idCardVerified 
                        ? `Authenticated for ${idCardInfo?.institutionName || college}` 
                        : 'Upload photo of your ID Card to auto-fill & verify college affiliation with Gemini Vision'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsIdModalOpen(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                    idCardVerified
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-white hover:bg-blue-50 text-blue-600 border border-blue-200'
                  }`}
                >
                  {idCardVerified ? 'Rescan ID' : 'Scan Card'}
                </button>
              </div>

              {/* 3-TIER HIERARCHICAL ACADEMIC STRUCTURE (STREAM -> DEGREE -> BRANCH) */}
              <AcademicSelector
                selectedDegree={degree}
                selectedBranch={branch}
                onDegreeChange={(d) => setDegree(d)}
                onBranchChange={(b) => setBranch(b)}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Sem</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium"
                  >
                    <option value="1">1st Sem</option>
                    <option value="2">2nd Sem</option>
                    <option value="3">3rd Sem</option>
                    <option value="4">4th Sem</option>
                    <option value="5">5th Sem</option>
                    <option value="6">6th Sem</option>
                    <option value="7">7th Sem</option>
                    <option value="8">8th Sem</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">CGPA (/ 10.0)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grad Year</label>
                  <select
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium"
                  >
                    {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map((yr) => (
                      <option key={yr} value={yr.toString()}>
                        {yr} {yr === 2029 ? '(Class of 2029)' : yr > 2026 ? '(Future)' : yr === 2026 ? '(Current)' : '(Alumni)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target Industry Track</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium text-slate-800"
                >
                  {targetRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Professional Bio (Optional)</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Passionate undergraduate interested in cloud systems, web architectures, and algorithms..."
                  className="mt-1 block w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white"
                />
              </div>
            </div>
          )}

          {/* COLLEGE FACULTY FORM */}
          {accountType === 'college' && (
            <div className="space-y-3.5">
              <CollegeAutocomplete
                value={college}
                onChange={(name) => setCollege(name)}
                label="Institution / University"
                placeholder="Search college, university, or institute..."
              />
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
                <input
                  type="text"
                  required
                  value={facultyDept}
                  onChange={(e) => setFacultyDept(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Designation / Role</label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white"
                />
              </div>
            </div>
          )}

          {/* INDUSTRY PARTNER FORM */}
          {accountType === 'industry' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Enterprise / Organization Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Tata Consultancy Services / Infosys / Persistent"
                  className="mt-1 block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Industry Domain</label>
                <select
                  value={industryDomain}
                  onChange={(e) => setIndustryDomain(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium"
                >
                  <option value="Cloud Computing & Enterprise SaaS">Cloud Computing & Enterprise SaaS</option>
                  <option value="FinTech & Banking Infrastructure">FinTech & Banking Infrastructure</option>
                  <option value="AI & Autonomous Systems">AI & Autonomous Systems</option>
                  <option value="Automotive & CleanTech">Automotive & CleanTech</option>
                  <option value="HealthTech & BioInformatics">HealthTech & BioInformatics</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Corporate Designation</label>
                <input
                  type="text"
                  required
                  value={recruiterTitle}
                  onChange={(e) => setRecruiterTitle(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white"
                />
              </div>
            </div>
          )}

          {/* GOVERNMENT OFFICIAL FORM */}
          {accountType === 'government' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Directorate / Council</label>
                <input
                  type="text"
                  required
                  value={govtDept}
                  onChange={(e) => setGovtDept(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Regional Jurisdiction</label>
                <input
                  type="text"
                  required
                  value={govtJurisdiction}
                  onChange={(e) => setGovtJurisdiction(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs sm:text-sm font-bold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="fintech-btn-primary flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Provisioning Production Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Setup & Launch Portal</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-xs sm:text-sm text-slate-500 font-medium">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
          Sign in here
        </Link>
      </p>

      {/* Student ID Card OCR Verification Modal */}
      <StudentIdCardVerificationModal
        isOpen={isIdModalOpen}
        onClose={() => setIsIdModalOpen(false)}
        onVerifiedSuccess={(details) => {
          setIdCardVerified(true);
          setIdCardInfo({
            rollNumber: details.rollNumber,
            institutionName: details.institutionName
          });
          if (details.institutionName) {
            setCollege(details.institutionName);
          }
        }}
      />
    </div>
  );
};
