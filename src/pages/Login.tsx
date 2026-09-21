import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Mail, Lock, User, Eye, EyeOff, AlertCircle, GraduationCap, Building2, Briefcase, Landmark, ShieldCheck, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { api, clearSession } from '../services/api';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentRole, updateStudentProfile } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for login & personalization
  const [selectedRole, setSelectedRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('spark_user_role');
    return (saved as UserRole) || 'student';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');

  const accountTypes = [
    { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Candidate' },
    { id: 'alumni', label: 'Alumni Mentor', icon: Award, desc: 'Verified Graduate' },
    { id: 'college', label: 'College Faculty', icon: Building2, desc: 'Academia & TPO' },
    { id: 'industry', label: 'Corporate', icon: Briefcase, desc: 'Recruiter' },
    { id: 'government', label: 'Govt Officer', icon: Landmark, desc: 'Governance' },
  ] as const;

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const lower = val.toLowerCase();
    if (lower.includes('@college') || lower.includes('@edu') || lower.includes('@faculty')) {
      setSelectedRole('college');
    } else if (lower.includes('@industry') || lower.includes('@corp') || lower.includes('@company')) {
      setSelectedRole('industry');
    } else if (lower.includes('@gov') || lower.includes('@nic.in')) {
      setSelectedRole('government');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ---- Client-side validation ----
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name@college.ac.in).');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    // Government officers must use an official domain, mirroring real gov portals.
    if (selectedRole === 'government' && !/\.(gov|nic)\.in$/.test(trimmedEmail.split('@')[1] || '')) {
      setError('Government portal access requires an official @gov.in or @nic.in email address.');
      return;
    }

    setIsLoading(true);

    // Real credential verification against the users table via POST /api/login.
    // The backend bcrypt-compares the password and returns a signed JWT.
    try {
      const result = await api.login(trimmedEmail, password);

      // Signed in! Sync the local profile with the authenticated account.
      const displayName = name.trim() || result.user.name;
      updateStudentProfile({
        name: displayName,
        email: result.user.email,
      });

      const role = (result.user.role as UserRole) || selectedRole;
      localStorage.setItem('spark_user_role', role);
      localStorage.setItem('spark_session', JSON.stringify({
        email: result.user.email,
        role,
        signedInAt: new Date().toISOString(),
      }));
      setCurrentRole(role);
      setIsLoading(false);
      navigate('/onboarding');
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Unable to sign in. Check your credentials and try again.');
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign In to S.P.A.R.K.</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Select your authorized portal to access your role-specific dashboard.
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" />
          <span>JWT-secured · bcrypt credentials</span>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        
        {/* Role Picker (Strict Portal Access) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Select Portal / Role</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {accountTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedRole === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedRole(type.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-[0_0_15px_rgba(37,99,235,0.15)]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold leading-tight">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">Your Name</label>
            <span className="text-[11px] text-slate-400 font-medium">Session Identity</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white/50 focus:bg-white placeholder:text-slate-400"
              placeholder={selectedRole === 'college' ? 'Prof. / Dean Name' : selectedRole === 'industry' ? 'Recruiter Name' : 'Your Full Name'}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white/50 focus:bg-white placeholder:text-slate-400"
              placeholder={selectedRole === 'college' ? 'faculty@college.edu' : selectedRole === 'industry' ? 'hr@company.com' : 'you@student.edu'}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white/50 focus:bg-white placeholder:text-slate-400"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Validation error banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in duration-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="fintech-btn-primary w-full mt-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Enter {accountTypes.find(t => t.id === selectedRole)?.label} Workspace <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 font-medium">
        New to S.P.A.R.K.?{' '}
        <Link to="/register" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
          Create your free account
        </Link>
      </p>

      {/* S.P.A.R.K. Password Recovery Modal with Real Gmail OTP Dispatch */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
