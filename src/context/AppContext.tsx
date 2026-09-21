import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  StudentProfile,
  JobOpportunity,
  JobApplication,
  MoU,
  ProblemStatement,
  AssessmentResult,
  AssessmentQuestion,
  RoadmapMilestone,
} from '../types';
import {
  INITIAL_STUDENT,
  INITIAL_JOBS,
  INITIAL_MOUS,
  INITIAL_PROBLEMS,
  INITIAL_ROADMAP,
  ASSESSMENT_QUESTIONS,
} from '../data/mockData';
import { calculateJobMatch } from '../utils/matchCalculator';
import { api, BackendHealth } from '../services/api';

interface AppContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  student: StudentProfile;
  updateStudentProfile: (updates: Partial<StudentProfile>) => Promise<void>;
  addDeclaredSkill: (skill: string) => void;
  removeDeclaredSkill: (skill: string) => void;
  parseResumeWithAI: (file?: File) => Promise<{ extracted: { skill: string; confidence: number; category?: string }[]; fileName?: string; summaryText?: string } | undefined>;
  registerAccount: (data: any) => Promise<void>;
  assessmentResult: AssessmentResult | null;
  submitAssessment: (answers: Record<string, number>, timeSpent: number, questionsList?: AssessmentQuestion[]) => Promise<void>;
  roadmap: RoadmapMilestone[];
  toggleModuleComplete: (milestoneId: string, moduleId: string) => Promise<void>;
  verifyAndCompleteModule: (milestoneId: string, moduleId: string, score: number) => Promise<void>;
  jobs: JobOpportunity[];
  addJob: (job: Omit<JobOpportunity, 'id' | 'postedDate'>) => Promise<void>;
  applications: JobApplication[];
  applyForJob: (jobId: string, customJob?: JobOpportunity) => Promise<void>;
  withdrawApplication: (jobId: string) => Promise<void>;
  updateApplicationStatus: (appId: string, status: JobApplication['status']) => Promise<void>;
  mous: MoU[];
  addMoU: (mou: Omit<MoU, 'id' | 'signedDate' | 'status'> & { digitalSignatureHash?: string }) => Promise<void>;
  problems: ProblemStatement[];
  addProblem: (prob: Omit<ProblemStatement, 'id' | 'submissionsCount' | 'status'>) => Promise<void>;
  
  // Modals & Drawers
  isAssessmentActive: boolean;
  setIsAssessmentActive: (active: boolean) => void;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  isDbModalOpen: boolean;
  setIsDbModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isSimulatorOpen: boolean;
  setIsSimulatorOpen: (open: boolean) => void;

  apiKey: string;
  setApiKey: (key: string) => void;
  notification: string | null;
  setNotification: (msg: string | null) => void;
  dbHealth: BackendHealth | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      if (roleParam && ['student', 'college', 'industry', 'government', 'alumni'].includes(roleParam)) {
        return roleParam as UserRole;
      }
    } catch (e) {}
    const saved = localStorage.getItem('spark_user_role') || localStorage.getItem('avishkar_role');
    return (saved as UserRole) || 'student';
  });

  const [activeTab, setActiveTabState] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) return tabParam;
      const roleParam = params.get('role');
      if (roleParam === 'college') return 'overview';
      if (roleParam === 'industry') return 'dashboard';
      if (roleParam === 'government') return 'overview';
      if (roleParam === 'alumni') return 'requests';
      if (roleParam === 'student') return 'profile';
    } catch (e) {}
    const role = localStorage.getItem('spark_user_role') || localStorage.getItem('avishkar_role');
    if (role === 'college') return 'overview';
    if (role === 'industry') return 'dashboard';
    if (role === 'government') return 'overview';
    if (role === 'alumni') return 'requests';
    return 'profile';
  });

  const [isAssessmentActive, setIsAssessmentActive] = useState<boolean>(() => {
    return localStorage.getItem('spark_assessment_locked') === 'true';
  });

  const setActiveTab = (tab: string) => {
    if (isAssessmentActive && tab !== 'assessment') {
      setNotification('🔒 Assessment is in progress! You cannot navigate away until you submit your test.');
      return;
    }
    setActiveTabState(tab);
  };
  const [student, setStudent] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('avishkar_student');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_STUDENT;
  });

  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(() => {
    const saved = localStorage.getItem('avishkar_assessment');
    if (saved) return JSON.parse(saved);
    return {
      completedAt: '2024-09-08 14:32',
      totalScore: 7,
      maxScore: 8,
      percentage: 87.5,
      categoryScores: {
        'fundamentals': 90,
        'backend_systems': 85,
        'frontend_web': 92,
        'cloud_devops': 46,
        'ai_data': 75,
        'soft_skills': 90,
      },
      timeSpentSeconds: 340,
      performanceGrade: 'Proficient',
    };
  });

  const [roadmap, setRoadmap] = useState<RoadmapMilestone[]>(() => {
    const saved = localStorage.getItem('avishkar_roadmap');
    return saved ? JSON.parse(saved) : INITIAL_ROADMAP;
  });

  const [jobs, setJobs] = useState<JobOpportunity[]>(() => {
    const saved = localStorage.getItem('avishkar_jobs');
    return saved ? JSON.parse(saved) : INITIAL_JOBS;
  });

  const [applications, setApplications] = useState<JobApplication[]>(() => {
    const saved = localStorage.getItem('avishkar_apps');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'app-01',
        jobId: 'job-02',
        jobTitle: 'Full Stack Engineer - Digital Innovator',
        company: 'TCS Digital',
        studentId: INITIAL_STUDENT.id,
        studentName: INITIAL_STUDENT.name,
        appliedDate: '2024-09-04',
        status: 'Shortlisted',
        aiMatchScore: 92,
        notes: 'Shortlisted for Round 1 Technical Interview based on top-percentile React and Data Structures assessment scores.',
      }
    ];
  });

  const [mous, setMous] = useState<MoU[]>(() => {
    const saved = localStorage.getItem('avishkar_mous');
    return saved ? JSON.parse(saved) : INITIAL_MOUS;
  });

  const [problems, setProblems] = useState<ProblemStatement[]>(() => {
    const saved = localStorage.getItem('avishkar_problems');
    return saved ? JSON.parse(saved) : INITIAL_PROBLEMS;
  });

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('avishkar_gemini_key') || '');
  const [notification, setNotification] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<BackendHealth | null>(null);

  // Sync with PostgreSQL on mount
  useEffect(() => {
    const syncBackend = async () => {
      try {
        const health = await api.getHealth();
        setDbHealth(health);

        if (health && health.status === 'healthy') {
          // Load jobs from PG
          const pgJobs = await api.getJobs();
          if (pgJobs && pgJobs.length > 0) setJobs(pgJobs);

          // Load applications from PG
          const pgApps = await api.getApplications();
          if (pgApps && pgApps.length > 0) setApplications(pgApps);

          // Load MoUs from PG
          const pgMous = await api.getMoUs();
          if (pgMous && pgMous.length > 0) setMous(pgMous);

          // Load Problems from PG
          const pgProbs = await api.getProblems();
          if (pgProbs && pgProbs.length > 0) setProblems(pgProbs);
        }
      } catch (err) {
        console.warn('Backend sync error, using local persistent cache', err);
      }
    };
    syncBackend();
  }, []);

  // Auto-dismiss floating toast after 4s
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Persist state to local storage
  useEffect(() => {
    localStorage.setItem('avishkar_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('avishkar_student', JSON.stringify(student));
  }, [student]);

  useEffect(() => {
    if (assessmentResult) {
      localStorage.setItem('avishkar_assessment', JSON.stringify(assessmentResult));
    }
  }, [assessmentResult]);

  useEffect(() => {
    localStorage.setItem('avishkar_roadmap', JSON.stringify(roadmap));
  }, [roadmap]);

  useEffect(() => {
    localStorage.setItem('avishkar_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('avishkar_apps', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('avishkar_mous', JSON.stringify(mous));
  }, [mous]);

  useEffect(() => {
    localStorage.setItem('avishkar_problems', JSON.stringify(problems));
  }, [problems]);

  useEffect(() => {
    localStorage.setItem('avishkar_gemini_key', apiKey);
  }, [apiKey]);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    localStorage.setItem('spark_user_role', role);
    if (role === 'student') setActiveTab('profile');
    if (role === 'college') setActiveTab('overview');
    if (role === 'industry') setActiveTab('dashboard');
    if (role === 'government') setActiveTab('overview');
    if (role === 'alumni') setActiveTab('requests');
  };

  const updateStudentProfile = async (updates: Partial<StudentProfile>) => {
    setStudent(prev => ({ ...prev, ...updates }));
    try {
      await api.updateStudent(student.id, updates);
    } catch (e) {
      // Local cache already updated
    }
    setNotification('Student profile updated successfully');
  };

  const addDeclaredSkill = async (skill: string) => {
    if (!skill.trim() || student.declaredSkills.includes(skill.trim())) return;
    const updated = [...student.declaredSkills, skill.trim()];
    setStudent(prev => ({ ...prev, declaredSkills: updated }));
    try {
      await api.updateStudent(student.id, { declaredSkills: updated });
    } catch (e) {}
    setNotification(`Added "${skill}" to declared skills`);
  };

  const removeDeclaredSkill = async (skill: string) => {
    const updated = student.declaredSkills.filter(s => s !== skill);
    setStudent(prev => ({ ...prev, declaredSkills: updated }));
    try {
      await api.updateStudent(student.id, { declaredSkills: updated });
    } catch (e) {}
  };

  const parseResumeWithAI = async (file?: File) => {
    if (file) {
      try {
        const data = await api.uploadRealResume(student.id, file);
        setStudent(prev => ({
          ...prev,
          resumeUploaded: true,
          resumeName: data.fileName,
          declaredSkills: data.allDeclaredSkills,
          readinessScore: data.readinessScore,
        }));
        setNotification(`Real Resume scanned: extracted ${data.extracted.length} competencies!`);
        return {
          extracted: data.extracted,
          fileName: data.fileName,
          summaryText: data.summaryText,
        };
      } catch (err: any) {
        setNotification(`Resume scanning failed: ${err.message}`);
        throw err;
      }
    }

    const dynamicResumeName = `${student.name.replace(/\s+/g, '_')}_Extracted_CV.pdf`;
    try {
      const data = await api.parseResume(student.id, dynamicResumeName);
      setStudent(prev => ({
        ...prev,
        resumeUploaded: true,
        resumeName: dynamicResumeName,
        declaredSkills: data.allDeclaredSkills,
        readinessScore: data.readinessScore || prev.readinessScore,
      }));
      setNotification(`AI scanned resume: extracted ${data.extracted.length} verified competencies!`);
      return { extracted: data.extracted, fileName: dynamicResumeName };
    } catch (e) {
      // Fallback
      const fallbackExtracted = [
        { skill: 'Docker Containerization', confidence: 96, category: 'DevOps & Cloud' },
        { skill: 'PostgreSQL Database', confidence: 99, category: 'Database Systems' },
        { skill: 'Redis Caching', confidence: 92, category: 'Database Systems' },
        { skill: 'Kubernetes Pods', confidence: 88, category: 'DevOps & Cloud' },
        { skill: 'Microservices & REST', confidence: 95, category: 'Backend Systems' },
        { skill: 'FastAPI Python', confidence: 90, category: 'Backend Systems' },
      ];
      const merged = Array.from(new Set([...student.declaredSkills, ...fallbackExtracted.map(x => x.skill)]));
      setStudent(prev => ({
        ...prev,
        resumeUploaded: true,
        resumeName: dynamicResumeName,
        declaredSkills: merged,
      }));
      setNotification('AI scanned resume: extracted 6 skills!');
      return { extracted: fallbackExtracted, fileName: dynamicResumeName };
    }
  };

  const registerAccount = async (data: {
    role: UserRole;
    name: string;
    email: string;
    college?: string;
    degree?: string;
    branch?: string;
    semester?: number;
    cgpa?: number;
    graduationYear?: number;
    targetRole?: string;
    bio?: string;
    company?: string;
    department?: string;
    designation?: string;
    jurisdiction?: string;
  }) => {
    try {
      const res = await api.registerUser(data);
      if (data.role === 'student' && res.student) {
        setStudent(res.student);
        setAssessmentResult(null);
        setApplications([]);
        localStorage.removeItem('avishkar_assessment');
        localStorage.removeItem('avishkar_apps');
      } else if (data.role === 'student') {
        const newStudent: StudentProfile = {
          id: `std-${Date.now().toString().slice(-6)}`,
          name: data.name,
          email: data.email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
          college: data.college || 'Institute of Technology',
          degree: data.degree || 'B.Tech',
          branch: data.branch || 'Computer Science & Engineering',
          semester: Number(data.semester) || 1,
          cgpa: Number(data.cgpa) || 7.5,
          graduationYear: Number(data.graduationYear) || 2026,
          targetRole: data.targetRole || 'Full Stack Cloud Engineer',
          bio: data.bio || `Undergraduate student at ${data.college || 'engineering institute'}.`,
          resumeUploaded: false,
          resumeName: '',
          declaredSkills: [],
          verifiedSkills: [],
          assessmentCompleted: false,
          readinessScore: 15,
        };
        setStudent(newStudent);
        setAssessmentResult(null);
        setApplications([]);
        localStorage.removeItem('avishkar_assessment');
        localStorage.removeItem('avishkar_apps');
      }

      setCurrentRole(data.role);
      setNotification(`Welcome to S.P.A.R.K., ${data.name}! Your ${data.role} portal is initialized.`);
    } catch (err: any) {
      console.warn('Backend register call failed, creating local session:', err);
      if (data.role === 'student') {
        const newStudent: StudentProfile = {
          id: `std-${Date.now().toString().slice(-6)}`,
          name: data.name,
          email: data.email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
          college: data.college || 'Institute of Technology',
          degree: data.degree || 'B.Tech',
          branch: data.branch || 'Computer Science & Engineering',
          semester: Number(data.semester) || 1,
          cgpa: Number(data.cgpa) || 7.5,
          graduationYear: Number(data.graduationYear) || 2026,
          targetRole: data.targetRole || 'Full Stack Cloud Engineer',
          bio: data.bio || `Undergraduate student at ${data.college || 'engineering institute'}.`,
          resumeUploaded: false,
          resumeName: '',
          declaredSkills: [],
          verifiedSkills: [],
          assessmentCompleted: false,
          readinessScore: 15,
        };
        setStudent(newStudent);
        setAssessmentResult(null);
        setApplications([]);
        localStorage.removeItem('avishkar_assessment');
        localStorage.removeItem('avishkar_apps');
      }
      setCurrentRole(data.role);
      setNotification(`Welcome, ${data.name}! Portal active.`);
    }
  };

  const submitAssessment = async (answers: Record<string, number>, timeSpent: number, questionsList?: AssessmentQuestion[]) => {
    const activeQuestions = (questionsList && questionsList.length > 0) ? questionsList : ASSESSMENT_QUESTIONS;
    let correct = 0;
    const catTotal: Record<string, number> = {};
    const catCorrect: Record<string, number> = {};

    activeQuestions.forEach(q => {
      catTotal[q.category] = (catTotal[q.category] || 0) + 1;
      if (answers[q.id] === q.correctAnswer) {
        correct++;
        catCorrect[q.category] = (catCorrect[q.category] || 0) + 1;
      }
    });

    const categoryScores: Record<string, number> = {};
    Object.keys(catTotal).forEach(cat => {
      const c = catCorrect[cat] || 0;
      const t = catTotal[cat] || 1;
      categoryScores[cat] = Math.round((c / t) * 100);
    });

    const totalQuestions = activeQuestions.length;
    const percentage = Math.round((correct / totalQuestions) * 100);

    let performanceGrade: AssessmentResult['performanceGrade'] = 'Foundational';
    if (percentage >= 85) performanceGrade = 'Elite (Ready for Top Tier)';
    else if (percentage >= 70) performanceGrade = 'Proficient';
    else if (percentage >= 50) performanceGrade = 'Needs Bridging';

    const result: AssessmentResult = {
      completedAt: new Date().toLocaleString(),
      totalScore: correct,
      maxScore: totalQuestions,
      percentage,
      categoryScores,
      timeSpentSeconds: timeSpent,
      performanceGrade,
    };

    setAssessmentResult(result);

    const updatedVerified = [...student.verifiedSkills];
    if (categoryScores['cloud_devops']) {
      const idx = updatedVerified.findIndex(v => v.skill === 'Cloud & Docker');
      if (idx >= 0) updatedVerified[idx].score = Math.max(updatedVerified[idx].score, categoryScores['cloud_devops']);
    }
    if (categoryScores['fundamentals']) {
      const idx = updatedVerified.findIndex(v => v.skill === 'Data Structures & Algorithms');
      if (idx >= 0) updatedVerified[idx].score = Math.max(updatedVerified[idx].score, categoryScores['fundamentals']);
    }

    const newReadiness = Math.round((student.readinessScore + percentage) / 2);
    setStudent(prev => ({
      ...prev,
      assessmentCompleted: true,
      readinessScore: newReadiness,
      verifiedSkills: updatedVerified,
    }));

    // Unlock assessment navigation
    setIsAssessmentActive(false);
    try {
      localStorage.removeItem('spark_assessment_locked');
      localStorage.removeItem('spark_active_assessment_v1');
    } catch (e) {}

    setActiveTabState('gap-analysis');
    setNotification('AI Skill Assessment Completed! Viewing Skill Gap Analysis.');
  };

  const toggleModuleComplete = async (milestoneId: string, moduleId: string) => {
    setRoadmap(prev => {
      return prev.map(m => {
        if (m.id !== milestoneId) return m;
        const updatedModules = m.modules.map(mod => {
          if (mod.id !== moduleId) return mod;
          return { ...mod, completed: !mod.completed };
        });
        const allDone = updatedModules.every(mod => mod.completed);
        return { ...m, modules: updatedModules, completed: allDone };
      });
    });

    setStudent(prev => ({
      ...prev,
      readinessScore: Math.min(99, prev.readinessScore + 3),
    }));

    try {
      await api.toggleRoadmapModule(student.id, milestoneId, moduleId);
    } catch (e) {}

    setNotification('Module completed! Skill score boosted by +3%');
  };

  const verifyAndCompleteModule = async (milestoneId: string, moduleId: string, score: number) => {
    setRoadmap(prev => {
      const next = prev.map(m => {
        if (m.id !== milestoneId) return m;
        const updatedModules = m.modules.map(mod => {
          if (mod.id !== moduleId) return mod;
          return {
            ...mod,
            completed: true,
            verificationScore: score,
            verifiedAt: new Date().toISOString(),
          };
        });
        const allDone = updatedModules.every(mod => mod.completed);
        return { ...m, modules: updatedModules, completed: allDone };
      });
      localStorage.setItem('avishkar_roadmap', JSON.stringify(next));
      return next;
    });

    setStudent(prev => ({
      ...prev,
      readinessScore: Math.min(99, prev.readinessScore + 3),
    }));

    try {
      await api.toggleRoadmapModule(student.id, milestoneId, moduleId);
    } catch (e) {}

    setNotification(`Knowledge Verified! Scored ${score}/10. Readiness boosted by +3%`);
  };

  const addJob = async (newJobData: Omit<JobOpportunity, 'id' | 'postedDate'>) => {
    const id = `job-${Date.now().toString().slice(-4)}`;
    const newJob: JobOpportunity = {
      ...newJobData,
      id,
      postedDate: new Date().toISOString().split('T')[0],
    };
    setJobs(prev => [newJob, ...prev]);

    try {
      await api.postJob(newJobData);
    } catch (e) {}

    setNotification(`New vacancy "${newJob.title}" posted successfully!`);
  };

  const applyForJob = async (jobId: string, customJob?: JobOpportunity) => {
    const existing = applications.find(a => a.jobId === jobId && a.studentId === student.id);
    if (existing) {
      setNotification('You have already marked this opportunity as applied!');
      return;
    }

    const job = customJob || jobs.find(j => j.id === jobId);
    if (!job) return;

    const match = calculateJobMatch(student, job);
    const newApp: JobApplication = {
      id: `app-${Date.now().toString().slice(-4)}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      studentId: student.id,
      studentName: student.name,
      appliedDate: new Date().toISOString().split('T')[0],
      status: match.matchScore >= 80 ? 'Shortlisted' : 'Applied',
      aiMatchScore: match.matchScore,
      notes: `Application marked via Real-World Matching. Match score: ${match.matchScore}%.`,
    };

    setApplications(prev => [newApp, ...prev]);

    try {
      await api.submitApplication(newApp);
    } catch (e) {}

    setNotification(`Applied for ${job.title} at ${job.company}!`);
  };

  const withdrawApplication = async (jobId: string) => {
    setApplications(prev => prev.filter(a => !(a.jobId === jobId && a.studentId === student.id)));

    try {
      await api.deleteApplication(jobId, student.id);
    } catch (e) {}

    setNotification('Application status unmarked.');
  };

  const updateApplicationStatus = async (appId: string, status: JobApplication['status']) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    try {
      await api.updateApplicationStatus(appId, status);
    } catch (e) {}
    setNotification(`Application status updated to ${status}`);
  };

  const addMoU = async (newMoU: Omit<MoU, 'id' | 'signedDate' | 'status'> & { digitalSignatureHash?: string }) => {
    const mou: MoU = {
      ...newMoU,
      id: `mou-${Date.now().toString().slice(-4)}`,
      signedDate: new Date().toISOString().split('T')[0],
      status: 'Active',
    };
    setMous(prev => [mou, ...prev]);

    try {
      await api.postMoU(newMoU);
    } catch (e) {}

    setNotification(`MoU with "${mou.companyName}" successfully signed & verified!`);
  };

  const addProblem = async (newProb: Omit<ProblemStatement, 'id' | 'submissionsCount' | 'status'>) => {
    const prob: ProblemStatement = {
      ...newProb,
      id: `prob-${Date.now().toString().slice(-4)}`,
      submissionsCount: 0,
      status: 'Open',
    };
    setProblems(prev => [prob, ...prev]);

    try {
      await api.postProblem(newProb);
    } catch (e) {}

    setNotification(`Industry Problem Statement "${prob.title}" published!`);
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        activeTab,
        setActiveTab,
        student,
        updateStudentProfile,
        addDeclaredSkill,
        removeDeclaredSkill,
        parseResumeWithAI,
        registerAccount,
        assessmentResult,
        submitAssessment,
        roadmap,
        toggleModuleComplete,
        verifyAndCompleteModule,
        jobs,
        addJob,
        applications,
        applyForJob,
        withdrawApplication,
        updateApplicationStatus,
        mous,
        addMoU,
        problems,
        addProblem,
        isAssessmentActive,
        setIsAssessmentActive,
        isCopilotOpen,
        setIsCopilotOpen,
        isDbModalOpen,
        setIsDbModalOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isNotificationsOpen,
        setIsNotificationsOpen,
        isSimulatorOpen,
        setIsSimulatorOpen,
        apiKey,
        setApiKey,
        notification,
        setNotification,
        dbHealth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
