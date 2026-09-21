import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { COLLEGE_DEPARTMENT_STATS } from '../../data/mockData';
import {
  Building2,
  Users,
  GraduationCap,
  Award,
  Handshake,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Briefcase,
  ChevronRight,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  PlusCircle,
  Layers
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const CollegeDashboard: React.FC = () => {
  const { mous, activeTab, setActiveTab, setNotification } = useApp();
  const [driveFilter, setDriveFilter] = useState<'all' | 'ongoing' | 'upcoming'>('all');

  const handleExportReport = () => {
    setNotification('Generated Batch Placement & Skill Readiness Report (CSV / PDF)!');
  };

  const campusDrives = [
    {
      company: 'Tata Motors R&D',
      logo: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=120',
      role: 'Autonomous Systems & Battery Controls Engineer',
      packageCtc: '₹14.5 LPA',
      eligibleCount: 28,
      scheduledDate: '2024-10-22',
      currentRound: 'Technical Interview & Coding',
      status: 'ongoing',
      minCgpa: 8.0,
      departments: ['CSE', 'AI & DS', 'E&TC']
    },
    {
      company: 'TCS Digital',
      logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=120',
      role: 'Digital Innovator & Cloud Native Engineer',
      packageCtc: '₹9.0 LPA',
      eligibleCount: 92,
      scheduledDate: '2024-10-18',
      currentRound: 'Online Coding Assessment (Round 1)',
      status: 'ongoing',
      minCgpa: 7.5,
      departments: ['CSE', 'IT', 'AI & DS', 'E&TC']
    },
    {
      company: 'Persistent Systems',
      logo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=120',
      role: 'Cloud Security & DevOps Specialist',
      packageCtc: '₹11.0 LPA',
      eligibleCount: 34,
      scheduledDate: '2024-10-28',
      currentRound: 'Pre-Placement Talk & Assessment',
      status: 'upcoming',
      minCgpa: 7.5,
      departments: ['CSE', 'IT']
    },
    {
      company: 'Infosys Springboard',
      logo: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=120',
      role: 'Specialized Systems Engineer (AI Tracks)',
      packageCtc: '₹9.5 LPA',
      eligibleCount: 65,
      scheduledDate: '2024-11-04',
      currentRound: 'Resume Screening & Shortlisting',
      status: 'upcoming',
      minCgpa: 7.0,
      departments: ['All Departments']
    },
    {
      company: 'L&T Technology Services',
      logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=120',
      role: 'Embedded Systems & Industrial IoT Engineer',
      packageCtc: '₹10.2 LPA',
      eligibleCount: 22,
      scheduledDate: '2024-11-10',
      currentRound: 'Application Window Open',
      status: 'upcoming',
      minCgpa: 7.2,
      departments: ['Mechanical & Automation', 'E&TC']
    },
  ];

  const filteredDrives = driveFilter === 'all'
    ? campusDrives
    : campusDrives.filter(d => d.status === driveFilter);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* College Institutional Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-bold border border-blue-400/30">
                Institutional TPO & Dean Portal
              </span>
              <span className="text-xs text-blue-200">NAAC / NBA / NIRF Compliant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">COEP Technological University, Pune</h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Centralized Training & Placement Cell Dashboard: Real-time departmental skill gap analytics, industry MoU governance, and campus recruitment metrics.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-105"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Accreditation Report</span>
            </button>
            <button
              onClick={() => setActiveTab('mous')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur border border-white/20 transition-all"
            >
              <Handshake className="w-4 h-4" />
              <span>Manage MoUs</span>
            </button>
          </div>
        </div>

        {/* Top Synchronized Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
          {[
            { id: 'overview', label: 'TPO Overview', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'dept-analysis', label: 'Department Skill Gaps', icon: <Layers className="w-4 h-4" /> },
            { id: 'placement-drives', label: 'Placement Drives', icon: <Briefcase className="w-4 h-4" /> },
            { id: 'students', label: 'Student Directory', icon: <Users className="w-4 h-4" /> },
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

      {/* VIEW 1: TPO OVERVIEW */}
      {(activeTab === 'overview' || !['dept-analysis', 'placement-drives'].includes(activeTab)) && (
        <div className="space-y-6 animate-fadeIn">
          {/* College KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Enrolled Final Years</p>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><Users className="w-4 h-4" /></span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">710</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">91.4% AI-Assessed</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Avg Readiness Index</p>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Award className="w-4 h-4" /></span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">76.2%</p>
              <p className="text-[11px] text-slate-500 mt-1">+11% vs State Average</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Total Placed & Offers</p>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600"><GraduationCap className="w-4 h-4" /></span>
              </div>
              <p className="text-2xl font-extrabold text-purple-700 mt-2">533</p>
              <p className="text-[11px] text-purple-600 font-semibold mt-1">75.1% Batch Placement Rate</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Active Industry MoUs</p>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><Handshake className="w-4 h-4" /></span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{mous.length}</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">16 Joint Research Projects</p>
            </div>
          </div>

          {/* Department Readiness & Placement Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Departmental Skill Readiness vs Placement Success Rate (%)
                </h2>
                <p className="text-xs text-slate-500">
                  Correlating AI-verified competency levels with corporate placement conversion
                </p>
              </div>
              <button
                onClick={() => setActiveTab('dept-analysis')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Full Skill Deficit Matrix</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COLLEGE_DEPARTMENT_STATS} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="avgReadiness" name="AI Skill Readiness %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="placementPercentage" name="Placement Conversion %" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Snapshot: Drives & Deficits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">Active Campus Recruitment Drives</h2>
                </div>
                <button
                  onClick={() => setActiveTab('placement-drives')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-3 text-xs">
                {campusDrives.slice(0, 3).map((drive, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{drive.company}</p>
                      <p className="text-slate-500 text-[11px]">{drive.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {drive.packageCtc}
                      </span>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{drive.eligibleCount} Eligible</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <h2 className="text-sm font-bold text-slate-900">Top Identified Skill Deficits</h2>
                </div>
                <button
                  onClick={() => setActiveTab('dept-analysis')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  View Matrix →
                </button>
              </div>
              <div className="space-y-3 text-xs">
                {COLLEGE_DEPARTMENT_STATS.slice(0, 3).map((dept, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{dept.department}</p>
                      <p className="text-rose-600 font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3" />
                        <span>{dept.topSkillGap}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setNotification(`Initiated Industry Workshop for ${dept.department}`)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
                    >
                      Schedule FDP
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEPARTMENT SKILL GAPS (dept-analysis) */}
      {activeTab === 'dept-analysis' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Departmental Skill Deficit Action Matrix */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Critical Departmental Skill Deficits & Curriculum Intervention Matrix</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actionable feedback loop for curriculum modernization, elective tracks, and faculty development programs (FDP)
                </p>
              </div>
              <button
                onClick={() => setActiveTab('students')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 self-start sm:self-auto"
              >
                View Student Roster →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Department</th>
                    <th className="pb-3 text-center">Batch Size</th>
                    <th className="pb-3 text-center">Assessed %</th>
                    <th className="pb-3 text-center">Avg Readiness</th>
                    <th className="pb-3">Primary Identified Skill Gap</th>
                    <th className="pb-3 text-right">Accreditation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COLLEGE_DEPARTMENT_STATS.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-bold text-slate-800">{dept.department}</td>
                      <td className="py-3.5 text-center text-slate-600">{dept.totalStudents}</td>
                      <td className="py-3.5 text-center text-emerald-600 font-bold">
                        {Math.round((dept.assessedCount / dept.totalStudents) * 100)}%
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                          {dept.avgReadiness}%
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{dept.topSkillGap}</span>
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => setNotification(`Initiated Industry FDP for ${dept.department}`)}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                        >
                          Schedule Industry FDP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Departmental Readiness vs Placement Conversion Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Departmental Skill Readiness vs Placement Success Rate (%)
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COLLEGE_DEPARTMENT_STATS} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="avgReadiness" name="AI Skill Readiness %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="placementPercentage" name="Placement Conversion %" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PLACEMENT DRIVES (placement-drives) */}
      {activeTab === 'placement-drives' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Placement Season KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Active Campus Drives</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-2">12</p>
              <p className="text-[11px] text-slate-500 mt-1">Across Core & IT Sectors</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Total Offers Rolled Out</p>
              <p className="text-2xl font-extrabold text-purple-600 mt-2">533</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">75.1% Batch Placed</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Highest CTC Offered</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">₹44.0 LPA</p>
              <p className="text-[11px] text-slate-500 mt-1">Microsoft Cloud & AI</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Average Batch CTC</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-2">₹11.2 LPA</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">+14% vs Last Year</p>
            </div>
          </div>

          {/* Drives List with Filters */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Campus Placement Drives & Corporate Recruitment Schedule</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track ongoing interview rounds, eligible student counts, and schedule new company visits
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDriveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    driveFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All ({campusDrives.length})
                </button>
                <button
                  onClick={() => setDriveFilter('ongoing')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    driveFilter === 'ongoing' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Ongoing
                </button>
                <button
                  onClick={() => setDriveFilter('upcoming')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    driveFilter === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setNotification('New campus drive registration wizard opened.')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ml-2"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Schedule Drive</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredDrives.map((drive, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 bg-slate-50/50 hover:bg-white/60 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={drive.logo} alt={drive.company} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">{drive.company}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            drive.status === 'ongoing'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {drive.status === 'ongoing' ? 'Drive In Progress' : 'Scheduled'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{drive.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 block">
                          {drive.packageCtc}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">CTC Package</span>
                      </div>
                      <button
                        onClick={() => setNotification(`Notified ${drive.eligibleCount} eligible students for ${drive.company} drive!`)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        Notify Students
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-4">
                      <span><strong>Eligible:</strong> <span className="text-emerald-600 font-bold">{drive.eligibleCount} Students</span> (CGPA &gt;= {drive.minCgpa})</span>
                      <span><strong>Current Round:</strong> <span className="text-slate-700 font-semibold">{drive.currentRound}</span></span>
                      <span><strong>Drive Date:</strong> <span className="text-slate-700 font-semibold">{drive.scheduledDate}</span></span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Allowed: {drive.departments.join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
