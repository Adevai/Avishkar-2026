import { SkillConstellation } from '../three/SkillConstellation';
import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Target,
  Layers,
  Award,
  BookOpen,
  SlidersHorizontal,
  TrendingUp
} from 'lucide-react';
import { SkillGapItem } from '../../types';

// Role Competency Benchmarks across all engineering & professional tracks
interface RoleCompetencyProfile {
  subjects: {
    subject: string;
    benchmark: number;
    category: string;
    recommendation: string;
    keywords: string[];
  }[];
}

const ROLE_COMPETENCY_PROFILES: Record<string, RoleCompetencyProfile> = {
  'Full Stack Cloud Engineer': {
    subjects: [
      { subject: 'Cloud Containerization', benchmark: 80, category: 'DevOps', recommendation: 'Bridge critical deficit identified in Docker containerization, multi-stage builds, and Kubernetes pods.', keywords: ['docker', 'kubernetes', 'cloud'] },
      { subject: 'CI/CD & Deployment', benchmark: 75, category: 'DevOps', recommendation: 'Automate build, lint, unit test, and deployment workflows using GitHub Actions and ArgoCD.', keywords: ['ci/cd', 'github actions', 'deployment'] },
      { subject: 'High-Scale System Design', benchmark: 75, category: 'Architecture', recommendation: 'Master rate limiting, Redis caching tiers, message queues (Kafka/RabbitMQ), and database partitioning.', keywords: ['system design', 'architecture', 'caching'] },
      { subject: 'Data Structures & Algorithms', benchmark: 75, category: 'Core CS', recommendation: 'Solve scenario-based case studies under timed environments.', keywords: ['problem solving', 'analysis', 'dsa'] },
      { subject: 'Backend & APIs', benchmark: 75, category: 'Backend', recommendation: 'Build high-throughput REST and gRPC services with connection pooling.', keywords: ['node', 'backend', 'api', 'express', 'python', 'java', 'rest'] },
      { subject: 'Frontend (React/TS)', benchmark: 75, category: 'Frontend', recommendation: 'Deepen knowledge of React 19 concurrent features, SSR, and custom hooks.', keywords: ['react', 'frontend', 'typescript', 'javascript', 'html', 'css'] },
      { subject: 'Database & SQL', benchmark: 70, category: 'Data', recommendation: 'Optimize composite indexing, vacuuming, and ACID transactions in PostgreSQL.', keywords: ['database', 'sql', 'postgres', 'postgresql', 'mongodb'] },
      { subject: 'Soft Skills', benchmark: 75, category: 'Professional', recommendation: 'Participate in peer code reviews and agile sprint retrospectives.', keywords: ['communication', 'soft skills', 'leadership'] }
    ]
  },
  'AI/ML Specialist': {
    subjects: [
      { subject: 'Machine Learning Core', benchmark: 80, category: 'Data Science', recommendation: 'Solidify understanding of gradient descent, backprop, and loss functions.', keywords: ['ml', 'math', 'statistics'] },
      { subject: 'Deep Learning (PyTorch)', benchmark: 75, category: 'AI', recommendation: 'Build custom neural network architectures using PyTorch.', keywords: ['pytorch', 'deep learning', 'neural networks'] },
      { subject: 'Data Engineering', benchmark: 70, category: 'Data', recommendation: 'Learn to build data pipelines with Pandas, PySpark, and Airflow.', keywords: ['data', 'pipeline', 'pandas', 'spark'] },
      { subject: 'MLOps', benchmark: 70, category: 'Operations', recommendation: 'Deploy models using Docker, Kubernetes, and MLflow.', keywords: ['mlops', 'docker', 'kubernetes', 'mlflow'] }
    ]
  }
};

  // Fallback profile builder for arbitrary or custom roles
function getProfileForRole(roleName: string): RoleCompetencyProfile {
  if (ROLE_COMPETENCY_PROFILES[roleName]) {
    return ROLE_COMPETENCY_PROFILES[roleName];
  }
  const matchKey = Object.keys(ROLE_COMPETENCY_PROFILES).find(k => 
    roleName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(roleName.toLowerCase())
  );
  if (matchKey) {
    return ROLE_COMPETENCY_PROFILES[matchKey];
  }
      // Generic profile for custom roles
    return {
      subjects: [
        { subject: 'Cloud Containerization', benchmark: 80, category: 'Infrastructure', recommendation: 'Bridge critical deficit identified in Docker containerization, multi-stage builds, and Kubernetes pods.', keywords: ['docker', 'kubernetes', 'cloud'] },
        { subject: 'CI/CD & Deployment', benchmark: 75, category: 'DevOps', recommendation: 'Automate build, lint, unit test, and deployment workflows using GitHub Actions and ArgoCD.', keywords: ['ci/cd', 'github actions', 'deployment'] },
        { subject: 'High-Scale System Design', benchmark: 75, category: 'Architecture', recommendation: 'Master rate limiting, Redis caching tiers, message queues (Kafka/RabbitMQ), and database partitioning.', keywords: ['system design', 'architecture', 'caching'] },
        { subject: 'Data Structures & Algorithms', benchmark: 75, category: 'Core CS', recommendation: 'Solve scenario-based case studies under timed environments.', keywords: ['problem solving', 'analysis', 'dsa'] },
        { subject: 'Web Security & Auth', benchmark: 70, category: 'Security', recommendation: 'Implement structured validation, error handling, and security policies.', keywords: ['security', 'auth', 'validation'] },
        { subject: 'Distributed Data Stores', benchmark: 70, category: 'Database', recommendation: 'Explore specialized niches in distributed databases to differentiate your profile in campus hiring.', keywords: ['database', 'distributed'] },
        { subject: 'Professional Practice', benchmark: 70, category: 'Soft Skills', recommendation: 'Practice cross-functional stakeholder communication and documentation.', keywords: ['communication', 'soft skills'] }
      ]
    };
}

export const SkillGapReport: React.FC = () => {
  const { student, assessmentResult, setActiveTab, setIsSimulatorOpen } = useApp();

  // Dynamically compute radar data and skill gaps tailored to this specific student
  const { dynamicRadarData, dynamicSkillGaps, overallAlignment, criticalGapCount, masteredCount } = useMemo(() => {
    const profile = getProfileForRole(student.targetRole || 'Full Stack Cloud Engineer');
    const declaredLower = (student.declaredSkills || []).map(s => s.toLowerCase());
    const verified = student.verifiedSkills || [];

    let totalAlignmentScore = 0;

    const radar = profile.subjects.map(item => {
      // Look for explicit verified skill score match
      let currentScore = 0;
      const matchedVerified = verified.find(v => {
        const vSkill = v.skill.toLowerCase();
        return item.keywords.some(kw => vSkill.includes(kw));
      });

      if (matchedVerified) {
        currentScore = matchedVerified.score;
      } else {
        // Check if student declared related skills
        const hasDeclared = item.keywords.some(kw => 
          declaredLower.some(d => d.includes(kw) || kw.includes(d))
        );

        if (hasDeclared) {
          // Student declared skill: base score derived from student readiness + verification
          currentScore = Math.min(88, Math.max(45, Math.round(student.readinessScore * 0.85 + (declaredLower.length * 2))));
        } else {
          // Not declared: lower baseline score reflecting gap
          currentScore = Math.min(item.benchmark - 15, Math.max(25, Math.round(student.readinessScore * 0.45)));
        }
      }

      // If assessment completed, incorporate assessment result
      if (assessmentResult && assessmentResult.percentage) {
        const assessmentWeight = 0.3;
        currentScore = Math.round(currentScore * (1 - assessmentWeight) + assessmentResult.percentage * assessmentWeight);
      }

      // Cap currentScore between 15 and 98
      currentScore = Math.min(98, Math.max(15, currentScore));
      totalAlignmentScore += Math.min(100, Math.round((currentScore / item.benchmark) * 100));

      return {
        subject: item.subject,
        current: currentScore,
        benchmark: item.benchmark,
        fullMark: 100,
        category: item.category,
        recommendation: item.recommendation
      };
    });

    const alignment = Math.min(99, Math.round(totalAlignmentScore / profile.subjects.length));

    // Derive skill gap items from radar data
    const gaps: SkillGapItem[] = radar.map(r => {
      const delta = r.current - r.benchmark;
      let gapLevel: SkillGapItem['gapLevel'] = 'none';
      let priority: SkillGapItem['priority'] = 'low';

      if (delta < -15) {
        gapLevel = 'critical';
        priority = 'high';
      } else if (delta < 0) {
        gapLevel = 'moderate';
        priority = 'medium';
      }

      return {
        skill: r.subject,
        category: r.category,
        currentScore: r.current,
        requiredScore: r.benchmark,
        gapLevel,
        priority,
        actionRecommendation: r.recommendation
      };
    });

    // Sort gaps: critical first, then moderate, then none
    gaps.sort((a, b) => {
      const order = { critical: 0, moderate: 1, none: 2 };
      return order[a.gapLevel] - order[b.gapLevel];
    });

    const criticalCount = gaps.filter(g => g.gapLevel === 'critical').length;
    const mastered = gaps.filter(g => g.gapLevel === 'none').length;

    return {
      dynamicRadarData: radar,
      dynamicSkillGaps: gaps,
      overallAlignment: alignment,
      criticalGapCount: criticalCount,
      masteredCount: mastered
    };
  }, [student.targetRole, student.declaredSkills, student.verifiedSkills, student.readinessScore, assessmentResult]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Step Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-white/10 overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                Step 4 of Solution Workflow
              </span>
              <span className="text-xs text-slate-400">AI Gap Diagnostics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Intelligent Skill Gap Analysis</h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Real-time delta comparison between your validated competencies and target industry requirements for <span className="font-bold text-white underline decoration-sky-400">{student.targetRole}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold border border-slate-700 shadow-md transition-all hover:scale-105"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <span>"What-If" Gap Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-slate-950 rounded-2xl text-xs font-extrabold shadow-lg shadow-sky-400/25 transition-all hover:scale-105"
            >
              <span>Bridge Gaps via Roadmap</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Employability Readiness</p>
            <p className="text-2xl font-extrabold text-slate-900">{student.readinessScore}%</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {student.readinessScore >= 80 ? 'Top 10th Percentile' : student.readinessScore >= 65 ? 'Top 25th Percentile' : 'Needs Bridging'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Critical Skill Deficits</p>
            <p className="text-2xl font-extrabold text-rose-600">{criticalGapCount} Gaps</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {dynamicSkillGaps.find(g => g.gapLevel === 'critical')?.skill || 'Zero Critical Deficits'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Mastered Competencies</p>
            <p className="text-2xl font-extrabold text-emerald-600">{masteredCount} Skills</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Exceeds Corporate Cutoff</p>
          </div>
        </div>
      </div>

      {/* Radar Chart & Gap Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Radar Spider Visualization */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span>Competency Radar Comparison</span>
              </h2>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                Industry Target Benchmark
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Blue fill represents student's validated proficiency. Dashed purple line represents minimum hiring requirement for <strong className="text-slate-800">{student.targetRole}</strong>.
            </p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={dynamicRadarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Radar
                  name="Student Score"
                  dataKey="current"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.45}
                />
                <Radar
                  name="Industry Benchmark"
                  dataKey="benchmark"
                  stroke="#4f46e5"
                  strokeDasharray="4 4"
                  fill="#6366f1"
                  fillOpacity={0.15}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Overall Alignment: <strong className="text-slate-800">{overallAlignment}%</strong></span>
            <span>Target: <strong className="text-blue-700">{student.targetRole}</strong></span>
          </div>
        </div>

        {/* Detailed Competency Gap Table */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Detailed Skill Gap Matrix</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Automated recommendations per competency</p>
            </div>
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Simulate Goals</span>
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
            {dynamicSkillGaps.map((item, idx) => {
              const delta = item.currentScore - item.requiredScore;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.gapLevel === 'critical'
                      ? 'border-rose-200 bg-rose-50/40'
                      : item.gapLevel === 'moderate'
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-emerald-200 bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-800">{item.skill}</h3>
                        <span className="text-[10px] font-medium text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {item.actionRecommendation}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        item.gapLevel === 'critical' ? 'bg-rose-100 text-rose-800' :
                        item.gapLevel === 'moderate' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.gapLevel === 'critical' ? 'Critical Deficit' :
                         item.gapLevel === 'moderate' ? 'Moderate Gap' : 'Target Exceeded'}
                      </span>
                      <div className="text-[11px] font-semibold text-slate-600 mt-1">
                        <span>{item.currentScore}</span>
                        <span className="text-slate-400"> / {item.requiredScore} target</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Delta Bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Gap Delta:</span>
                    <span className={`font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {delta >= 0 ? `+${delta} pts ahead of cutoff` : `${delta} pts deficit`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveTab('roadmap')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Generate Step-by-Step Personalized Learning Roadmap</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
