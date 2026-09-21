import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { 
  Sparkles, 
  GraduationCap, 
  Building2, 
  Briefcase, 
  Landmark, 
  Bell, 
  Search,
  Cpu,
  SlidersHorizontal,
  ChevronRight,
  User,
  LogOut,
  Database
} from 'lucide-react';

import { SparkLogo } from '../common/SparkLogo';
import { clearSession } from '../../services/api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentRole, 
    isAssessmentActive,
    setNotification,
    setIsCopilotOpen, 
    setIsDbModalOpen, 
    setIsCommandPaletteOpen,
    setIsNotificationsOpen,
    dbHealth,
    student 
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white text-slate-900 border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tagline */}
          <div className="cursor-pointer" onClick={() => setIsCommandPaletteOpen(true)} title="Click to open Command Palette">
            <SparkLogo size="md" theme="light" showTagline={true} />
          </div>

          {/* Center: Command Palette Trigger */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Quick Search / Command Palette Bar */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/40 hover:bg-white/60 text-slate-500 hover:text-slate-900 border border-white/60 text-xs font-medium transition-all shadow-inner group"
            >
              <Search className="w-3.5 h-3.5 group-hover:text-blue-600 transition-colors" />
              <span>Search commands, jobs, skills...</span>
              <kbd className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200/50 font-mono">
                Ctrl K
              </kbd>
            </button>


          </div>

          {/* Right Section: Locked Portal Badge (RBAC), Copilot, Notifications, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Strict RBAC Active Portal Badge (Persona switcher removed for security) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
              {currentRole === 'alumni' && (
                <>
                  <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="text-left leading-none hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">Mentor Network Portal</p>
                    <p className="text-[9px] text-blue-600 font-medium">University-Verified Alumni</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-extrabold border border-blue-200">
                    Mentor
                  </span>
                </>
              )}
              {currentRole === 'college' && (
                <>
                  <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="text-left leading-none hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">Academia & Faculty Portal</p>
                    <p className="text-[9px] text-purple-600 font-medium">Verified Institutional Access</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-extrabold border border-purple-200">
                    Faculty
                  </span>
                </>
              )}

              {currentRole === 'student' && (
                <>
                  <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="text-left leading-none hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">Student Workspace</p>
                    <p className="text-[9px] text-blue-600 font-medium">Candidate Pathway</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-extrabold border border-blue-200">
                    Candidate
                  </span>
                </>
              )}

              {currentRole === 'industry' && (
                <>
                  <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left leading-none hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">Corporate Recruiter Hub</p>
                    <p className="text-[9px] text-emerald-600 font-medium">Enterprise Hiring</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold border border-emerald-200">
                    Recruiter
                  </span>
                </>
              )}

              {currentRole === 'government' && (
                <>
                  <Landmark className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="text-left leading-none hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">State Governance Portal</p>
                    <p className="text-[9px] text-amber-600 font-medium">NEP 2020 Directorate</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-extrabold border border-amber-200">
                    Govt
                  </span>
                </>
              )}
            </div>

            {/* AI Copilot Button */}
            <button
              onClick={() => setIsCopilotOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* Notification Drawer Trigger */}
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-xl transition-colors"
              title="Real-Time Ecosystem Feed"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white animate-pulse" />
            </button>

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 ml-1">
              <img
                src={
                  currentRole === 'college'
                    ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'
                    : currentRole === 'industry'
                    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'
                    : currentRole === 'government'
                    ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256'
                    : currentRole === 'alumni'
                    ? `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(student.email || student.name)}`
                    : student.avatar
                }
                alt={student.name}
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/40 shadow-xs ml-1"
              />
              <div className="hidden 2xl:block text-left text-xs leading-tight">
                <p className="font-bold text-slate-900 truncate max-w-[130px]">
                  {student.name}
                </p>
                <p className="text-[10px] text-amber-600 font-semibold">
                  {currentRole === 'student' && 'Student Candidate'}
                  {currentRole === 'alumni' && 'Verified Alumni Mentor'}
                  {currentRole === 'college' && 'College Faculty / TPO'}
                  {currentRole === 'industry' && 'Corporate Recruiter'}
                  {currentRole === 'government' && 'State Directorate Officer'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                if (isAssessmentActive) {
                  setNotification('🔒 Assessment in progress! Please submit your evaluation before signing out.');
                  return;
                }
                // Fully clear session (JWT + role) before exiting to the public site
                clearSession();
                navigate('/');
              }}
              disabled={isAssessmentActive}
              className={`p-2 ml-1 rounded-xl transition-all ${
                isAssessmentActive
                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                  : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
              }`}
              title={isAssessmentActive ? 'Sign out locked during assessment' : 'Sign out'}
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
