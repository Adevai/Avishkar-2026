import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GOVT_REGIONAL_STATS, EMERGING_SKILL_TRENDS } from '../../data/mockData';
import {
  Landmark,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Award,
  AlertTriangle,
  Building,
  Users,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Filter
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

export const GovtDashboard: React.FC = () => {
  const { activeTab, setActiveTab, setNotification } = useApp();
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('all');

  const handleExportPolicyReport = () => {
    setNotification('Generated State Skill Council & NEP 2020 Compliance Dossier (PDF)!');
  };

  const nepAuditedColleges = [
    {
      name: 'COEP Technological University, Pune',
      region: 'Pune Industrial Belt',
      district: 'Pune',
      auditScore: 96,
      internshipCredits: '10/10 Verified',
      abcBankEnrollment: '98.4%',
      status: 'Certified Compliant',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      name: 'Veermata Jijabai Technological Institute (VJTI)',
      region: 'Mumbai Metropolitan Region',
      district: 'Mumbai City',
      auditScore: 94,
      internshipCredits: '10/10 Verified',
      abcBankEnrollment: '97.2%',
      status: 'Certified Compliant',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      name: 'Visvesvaraya National Institute of Technology (VNIT)',
      region: 'Nagpur & Vidarbha Hub',
      district: 'Nagpur',
      auditScore: 92,
      internshipCredits: '10/10 Verified',
      abcBankEnrollment: '95.0%',
      status: 'Certified Compliant',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      name: 'Walchand College of Engineering, Sangli',
      region: 'Western Maharashtra',
      district: 'Sangli',
      auditScore: 88,
      internshipCredits: '10/10 Verified',
      abcBankEnrollment: '91.8%',
      status: 'Certified Compliant',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      name: 'Government College of Engineering, Chhatrapati Sambhajinagar',
      region: 'Marathwada Zone',
      district: 'Chhatrapati Sambhajinagar',
      auditScore: 82,
      internshipCredits: '8/10 Credits',
      abcBankEnrollment: '88.5%',
      status: 'Action In Progress',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      name: 'Government College of Engineering, Amravati',
      region: 'Nagpur & Vidarbha Hub',
      district: 'Amravati',
      auditScore: 78,
      internshipCredits: '6/10 Credits',
      abcBankEnrollment: '82.1%',
      status: 'Audit Required',
      statusColor: 'bg-rose-50 text-rose-700 border-rose-200'
    },
  ];

  const filteredRegions = selectedRegionFilter === 'all' 
    ? GOVT_REGIONAL_STATS 
    : GOVT_REGIONAL_STATS.filter(r => r.region.toLowerCase().includes(selectedRegionFilter.toLowerCase()));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Government Banner with Tab Navigation Pills */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>State Higher & Technical Education Department</span>
              </span>
              <span className="text-xs text-blue-200">NEP 2020 Implementation Oversight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Macro Skill & Placement Governance</h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              State-level analytics platform connecting universities, technical councils, and corporate employers to eliminate regional skill disparities.
            </p>
          </div>

          <button
            onClick={handleExportPolicyReport}
            className="self-start md:self-auto flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Generate Policy Dossier</span>
          </button>
        </div>

        {/* Top Synchronized Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
          {[
            { id: 'overview', label: 'State Employability', icon: <Landmark className="w-4 h-4" /> },
            { id: 'nep2020', label: 'NEP 2020 Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'skill-trends', label: 'Demand vs Supply', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'regional', label: 'Regional & Tier Analysis', icon: <BarChart3 className="w-4 h-4" /> },
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

      {/* VIEW 1: OVERVIEW (State Employability) */}
      {(activeTab === 'overview' || !['nep2020', 'skill-trends', 'regional'].includes(activeTab)) && (
        <div className="space-y-6 animate-fadeIn">
          {/* State-Level Macro KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Affiliated Engineering Colleges</p>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><Building className="w-4 h-4" /></span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">160</p>
              <p className="text-[11px] text-blue-600 font-semibold mt-1">Across 4 Industrial Zones</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Total Monitored Students</p>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><Users className="w-4 h-4" /></span>
              </div>
              <p className="text-2xl font-extrabold text-indigo-700 mt-2">1,00,000+</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">100% Onboarded to Digital ID</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">NEP Internship Compliance</p>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="w-4 h-4" /></span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">84.6%</p>
              <p className="text-[11px] text-slate-500 mt-1">Mandatory Credits Verified</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Corporate MoUs Signed</p>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><Award className="w-4 h-4" /></span>
              </div>
              <p className="text-2xl font-extrabold text-amber-700 mt-2">420</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">Active Industry Linkages</p>
            </div>
          </div>

          {/* Quick Snapshot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900">NEP 2020 Credit Banking Status</h2>
                </div>
                <button
                  onClick={() => setActiveTab('nep2020')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Audit Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Tracking statewide compliance for mandatory 10-credit internships and Academic Bank of Credits (ABC ID) linkage across 160 technical institutes.
              </p>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800">Statewide Target Achieved:</span>
                <span className="font-extrabold text-emerald-700">84.6% Compliant</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">Industrial Demand vs Academic Gap</h2>
                </div>
                <button
                  onClick={() => setActiveTab('skill-trends')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Forecast View</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Forecasting 2024–2026 technological deficits to allocate state curriculum modernization and faculty upskilling grants.
              </p>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-800">Top Technology Gap:</span>
                <span className="font-extrabold text-blue-700">GenAI & LLMs (Gap Index: 78/100)</span>
              </div>
            </div>
          </div>

          {/* Regional Employability & Compliance Chart Preview */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Regional Employability Benchmark & NEP Internship Compliance (%)
                </h2>
                <p className="text-xs text-slate-500">
                  Evaluating skill readiness differentials between Tier-1 metro belts and Tier-2/Tier-3 regional colleges
                </p>
              </div>
              <button
                onClick={() => setActiveTab('regional')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Full Regional Analysis</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={GOVT_REGIONAL_STATS} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} />
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
                  <Bar dataKey="avgEmployabilityScore" name="Avg Employability Score %" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="internshipComplianceRate" name="NEP Internship Compliance %" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: NEP 2020 COMPLIANCE */}
      {activeTab === 'nep2020' && (
        <div className="space-y-6 animate-fadeIn">
          {/* NEP 2020 Pillar Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Mandatory Internship Credits</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">84.6%</p>
              <p className="text-[11px] text-slate-500 mt-1">10 Credits / Student Monitored</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Academic Bank of Credits (ABC)</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-2">92.4%</p>
              <p className="text-[11px] text-blue-600 font-semibold mt-1">DigiLocker Linked IDs</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Multidisciplinary Minor Options</p>
              <p className="text-2xl font-extrabold text-purple-600 mt-2">71.2%</p>
              <p className="text-[11px] text-slate-500 mt-1">Active Minor Tracks</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">NHEQF Level-7 Alignment</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-2">89.0%</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">Syllabus Certified</p>
            </div>
          </div>

          {/* Institutional Compliance Audit Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Affiliated Universities & Colleges: NEP 2020 Implementation Audit</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time monitoring of credit verification, industry internship compliance, and ABC Bank integration
                </p>
              </div>
              <button
                onClick={() => setNotification('Dispatched Statewide NEP 2020 Compliance Advisory to all institutions.')}
                className="text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all self-start sm:self-auto"
              >
                Issue Compliance Advisory
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Institution Name</th>
                    <th className="pb-3">Region / District</th>
                    <th className="pb-3 text-center">Audit Score</th>
                    <th className="pb-3 text-center">Internship Credits</th>
                    <th className="pb-3 text-center">ABC Enrollment</th>
                    <th className="pb-3 text-right">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nepAuditedColleges.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900">{col.name}</td>
                      <td className="py-3.5 text-slate-600">
                        <span>{col.region}</span>
                        <span className="text-slate-400 block text-[10px]">{col.district}</span>
                      </td>
                      <td className="py-3.5 text-center font-extrabold text-blue-700">
                        {col.auditScore}/100
                      </td>
                      <td className="py-3.5 text-center font-semibold text-emerald-600">
                        {col.internshipCredits}
                      </td>
                      <td className="py-3.5 text-center font-semibold text-slate-700">
                        {col.abcBankEnrollment}
                      </td>
                      <td className="py-3.5 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${col.statusColor}`}>
                          {col.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DEMAND VS SUPPLY (Skill Trends) */}
      {activeTab === 'skill-trends' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Emerging Industrial Technologies: Demand Growth vs Academic Supply</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data-backed forecasting to guide state curriculum modernization subsidies (2024–2026 Forecast)
                </p>
              </div>
              <button
                onClick={() => setNotification('State curriculum modernization grant allocations updated.')}
                className="text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all"
              >
                Allocate Tech Subsidies
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EMERGING_SKILL_TRENDS.map((trend, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900">{trend.skill}</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      Gap Index: {trend.gapIndex}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-medium">Industry Demand Surge</p>
                      <p className="text-sm font-extrabold text-blue-600">+{trend.industryDemandGrowth}% YoY</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-medium">Trained Graduate Supply</p>
                      <p className="text-sm font-extrabold text-slate-700">{trend.academicSupplyCount} / yr</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs">
                    <p className="text-[10px] font-bold uppercase text-blue-900">Recommended Policy Intervention:</p>
                    <p className="text-[11px] text-blue-800 mt-0.5">{trend.priorityAction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: REGIONAL & TIER ANALYSIS */}
      {activeTab === 'regional' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Regional Filter Selector */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Filter By Industrial Zone:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All 4 Zones' },
                { id: 'Pune', label: 'Pune Belt' },
                { id: 'Mumbai', label: 'Mumbai MMR' },
                { id: 'Vidarbha', label: 'Vidarbha Hub' },
                { id: 'Marathwada', label: 'Marathwada Zone' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedRegionFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedRegionFilter === filter.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Regional Employability & Compliance Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Regional Employability Benchmark & NEP Internship Compliance (%)
              </h2>
              <p className="text-xs text-slate-500">
                Evaluating skill readiness differentials between Tier-1 metro belts and Tier-2/Tier-3 regional colleges
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredRegions} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} />
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
                  <Bar dataKey="avgEmployabilityScore" name="Avg Employability Score %" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="internshipComplianceRate" name="NEP Internship Compliance %" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tier Disparity Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRegions.map((region, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><Building className="w-4 h-4" /></span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {region.collegesCount} Colleges
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{region.region}</h3>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Students:</span>
                    <span className="font-bold text-slate-800">{region.totalStudents.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Employability:</span>
                    <span className="font-bold text-blue-600">{region.avgEmployabilityScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tier Distribution:</span>
                    <span className="font-semibold text-slate-700">
                      T1:{region.tierDistribution.tier1} | T2:{region.tierDistribution.tier2} | T3:{region.tierDistribution.tier3}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
