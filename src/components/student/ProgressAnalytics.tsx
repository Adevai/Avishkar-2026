import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList
} from 'recharts';
import {
  TrendingUp, BrainCircuit, Target, Loader2, RefreshCw, Award, Briefcase,
  AlertTriangle, Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

interface AssessmentRecord {
  id: string;
  completedAt: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  categoryScores: Record<string, number>;
  timeSpentSeconds?: number;
  performanceGrade: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  fundamentals: 'DSA & Fundamentals',
  backend_systems: 'Backend & Databases',
  frontend_web: 'Frontend & Web',
  cloud_devops: 'Cloud & DevOps',
  ai_data: 'AI & Data',
  problem_solving: 'Problem Solving',
  soft_skills: 'Communication',
};

const CATEGORY_COLORS: Record<string, string> = {
  fundamentals: '#2563eb',
  backend_systems: '#7c3aed',
  frontend_web: '#0891b2',
  cloud_devops: '#059669',
  ai_data: '#d97706',
  problem_solving: '#dc2626',
  soft_skills: '#db2777',
};

const FUNNEL_STAGES = ['Applied', 'Under Review', 'Assessment Sent', 'Shortlisted', 'Interview Scheduled', 'Offer Extended'];
const FUNNEL_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#10b981'];

export const ProgressAnalytics: React.FC = () => {
  const { student, applications } = useApp();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'local'>('local');

  const loadHistory = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.adminGet<{ history: AssessmentRecord[] }>(
        `/assessments/student/${encodeURIComponent(student.id)}`
      );
      if (data.history && data.history.length > 0) {
        setHistory(data.history);
        setDataSource('live');
      } else {
        setHistory([]);
        setDataSource('local');
      }
    } catch {
      setHistory([]);
      setDataSource('local');
    } 
    finally {
      setIsLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Derived chart data ────────────────────────────────────────────────
  const readinessTrend = useMemo(() => {
    return history.map((h, i) => ({
      name: `Attempt ${i + 1}`,
      date: new Date(h.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      score: h.percentage,
      grade: h.performanceGrade,
    }));
  }, [history]);

  const categoryData = useMemo(() => {
    // Use the most recent attempt's category breakdown
    const latest = history[history.length - 1];
    if (!latest || !latest.categoryScores) {
      // Fall back to verified skills as a proxy
      return student.verifiedSkills.slice(0, 7).map(vs => ({
        category: vs.skill,
        score: vs.score,
        fill: '#0e8ce9',
      }));
    }
    return Object.entries(latest.categoryScores).map(([key, score]) => ({
      category: CATEGORY_LABELS[key] || key,
      score,
      fill: CATEGORY_COLORS[key] || '#0e8ce9',
    }));
  }, [history, student.verifiedSkills]);

  const funnelData = useMemo(() => {
    const counts = FUNNEL_STAGES.map((stage, i) => {
      const idx = FUNNEL_STAGES.indexOf(stage);
      // Higher stages include everything that reached them
      const stageOrder = ['Applied', 'Under Review', 'Assessment Sent', 'Shortlisted', 'Interview Scheduled', 'Offer Extended'];
      const count = applications.filter(a => {
        const sIdx = stageOrder.indexOf(a.status);
        return sIdx >= idx && sIdx !== -1;
      }).length;
      return {
        stage,
        count,
        fill: FUNNEL_COLORS[i],
      };
    }).filter(d => d.count > 0);

    // Always show the top of the funnel even with zero applications
    if (counts.length > 0 && counts[0].count === 0) {
      return [{ stage: 'Applied', count: 0, fill: FUNNEL_COLORS[0] }];
    }
    return counts;
  }, [applications]);

  const bestCategory = categoryData.reduce(
    (best, c) => (c.score > (best?.score ?? -1) ? c : best),
    categoryData[0]
  );
  const weakestCategory = categoryData.reduce(
    (worst, c) => (c.score < (worst?.score ?? 101) ? c : worst),
    categoryData[0]
  );

  const scoreDelta = history.length >= 2
    ? history[history.length - 1].percentage - history[0].percentage
    : 0;

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Crunching your competency history…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[11px] font-bold border border-blue-400/30 mb-2">
              <TrendingUp className="w-3 h-3" />
              Progress Analytics
            </span>
            <h1 className="text-xl font-bold">Your Readiness Trajectory</h1>
            <p className="text-blue-200 text-xs mt-1 max-w-xl">
              Longitudinal view of assessments, category strengths, and how your applications
              move through the placement funnel.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              dataSource === 'live'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                : 'bg-slate-500/15 text-slate-300 border-slate-400/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dataSource === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              {dataSource === 'live' ? 'Live PostgreSQL history' : 'First attempt pending'}
            </span>
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh analytics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <BrainCircuit className="w-4 h-4 text-blue-600" />,
            label: 'Assessments taken',
            value: Math.max(history.length, student.assessmentCompleted ? 1 : 0),
            sub: history.length >= 2 ? 'Multiple calibration points' : 'Take more to unlock trends',
          },
          {
            icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
            label: 'Score trend',
            value: history.length >= 2
              ? `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}%`
              : `${student.readinessScore}%`,
            sub: history.length >= 2 ? 'First → latest attempt' : 'Current readiness',
          },
          {
            icon: <Award className="w-4 h-4 text-amber-600" />,
            label: 'Strongest category',
            value: bestCategory ? `${bestCategory.score}%` : '—',
            sub: bestCategory ? bestCategory.category : 'Complete an assessment',
          },
          {
            icon: <Target className="w-4 h-4 text-rose-600" />,
            label: 'Focus area',
            value: weakestCategory ? `${weakestCategory.score}%` : '—',
            sub: weakestCategory ? weakestCategory.category : 'Complete an assessment',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              {kpi.icon}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
            </div>
            <p className="text-xl font-black text-slate-900 tabular-nums">{kpi.value}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {history.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>No assessment history yet.</strong> Your first AI Skill Assessment will establish
            the baseline; charts populate automatically after each attempt.
          </p>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Readiness trend */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Readiness Score History</h2>
              <p className="text-[11px] text-slate-500">Percentage score across every assessment attempt</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
              <Calendar className="w-3 h-3" /> en-IN dates
            </span>
          </div>

          {readinessTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium">
              Chart appears after your first assessment.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={readinessTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e8ce9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0e8ce9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(value: any) => [`${value}%`, 'Score']}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#026fc7"
                  strokeWidth={2.5}
                  fill="url(#scoreGradient)"
                  dot={{ r: 4, fill: '#026fc7' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category strengths */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h2 className="text-sm font-extrabold text-slate-900 mb-1">Category Strengths</h2>
          <p className="text-[11px] text-slate-500 mb-4">
            {history.length > 0 ? 'Latest attempt breakdown' : 'Verified skills snapshot'}
          </p>
          {categoryData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium">
              No category data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={130}
                  tick={{ fontSize: 10, fill: '#475569' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(value: any) => [`${value}%`, 'Score']}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Application funnel */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Application Funnel</h2>
          </div>
          <p className="text-[11px] text-slate-500 mb-4">How your applications progress through placement stages</p>

          {funnelData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium">
              Apply to jobs to activate the funnel.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={130}
                  tick={{ fontSize: 10, fill: '#475569' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
