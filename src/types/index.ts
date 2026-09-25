export type UserRole = 'student' | 'college' | 'industry' | 'government' | 'alumni';

// ── Alumni Network ──────────────────────────────────────────────────────────
export type AlumniApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface AlumniApplication {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  collegeId: string;            // institutions.ts code
  collegeName: string;          // resolved display name
  degree: string;
  graduationYear: number;
  company: string;
  designation: string;
  experienceYears: number;
  linkedinUrl?: string;
  githubUrl?: string;
  expertise: string[];
  bio: string;
  credentialDocName?: string;   // degree certificate / ID filename
  status: AlumniApplicationStatus;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AlumniProfile {
  id: string;
  name: string;
  email: string;
  collegeId: string;
  collegeName: string;
  degree: string;
  graduationYear: number;
  company: string;
  designation: string;
  experienceYears: number;
  expertise: string[];
  bio: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  mentorCapacity: number;      // max concurrent mentees
  activeMentees: number;
  rating?: number;             // 0–5
  verifiedAt: string;
}

export type MentorshipStatus = 'pending' | 'accepted' | 'declined';

export interface MentorshipRequest {
  id: string;
  alumniId: string;
  studentId: string;
  studentName: string;
  studentCollege: string;
  studentBranch: string;
  message: string;
  status: MentorshipStatus;
  roomId?: string;             // populated when accepted
  respondedAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderRole: 'student' | 'mentor';
  senderName: string;
  body: string;
  at: string;
}

export interface FastTrackOpportunity {
  id: string;
  alumniId: string;
  alumniName: string;
  title: string;
  company: string;
  type: 'Internship' | 'Full-Time';
  stipendOrSalary: string;
  location: string;
  description: string;
  expiryDays: number;
  postedAt: string;
  applicantIds: string[];
}

export type AlumniRole = 'alumni';

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  college: string;
  degree: string;
  branch: string;
  semester: number;
  cgpa: number;
  graduationYear: number;
  targetRole: string;
  bio: string;
  resumeUploaded: boolean;
  resumeName?: string;
  githubUrl?: string;
  leetcodeUrl?: string;
  codingTelemetry?: {
    githubRepos?: number;
    githubCommits?: number;
    topLanguages?: string[];
    leetcodeSolved?: number;
    leetcodeEasy?: number;
    leetcodeMedium?: number;
    leetcodeHard?: number;
    telemetryScoreBonus?: number;
    lastSyncedAt?: string;
  };
  linkedinUrl?: string;
  declaredSkills: string[];
  verifiedSkills: { skill: string; score: number; verifiedAt: string }[];
  assessmentCompleted: boolean;
  readinessScore: number;
  domainVerified?: boolean;
  idCardVerified?: boolean;
  idCardDetails?: {
    institutionName: string;
    studentName: string;
    rollNumber: string;
    validThruYear?: string;
    verifiedAt: string;
    confidenceScore: number;
  };
}

export type QuestionCategory = 
  | 'fundamentals' 
  | 'backend_systems' 
  | 'frontend_web' 
  | 'cloud_devops' 
  | 'ai_data' 
  | 'problem_solving' 
  | 'soft_skills';

export interface AssessmentQuestion {
  id: string;
  category: QuestionCategory;
  categoryName: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AssessmentResult {
  completedAt: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  categoryScores: Record<string, number>;
  performanceGrade: string;
  timeSpentSeconds?: number;
  proctoringViolations?: number;
  proctoringPassed?: boolean;
}

export interface DigitalBadge {
  id: string;
  studentId: string;
  title: string;
  category: string;
  issuedAt: string;
  scorePercentage: number;
  verificationHash: string;
  issuer: string;
  skills: string[];
}

export interface SkillGapItem {
  skill: string;
  category: string;
  currentScore: number; // 0 - 100
  requiredScore: number; // 0 - 100
  gapLevel: 'none' | 'moderate' | 'critical';
  priority: 'low' | 'medium' | 'high';
  actionRecommendation: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description?: string;
  provider: string;
  duration?: string;
  durationWeeks?: number;
  completed: boolean;
  url?: string;
  link?: string;
  cost?: 'Free' | 'Paid';
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  level?: string;
  skillsCovered?: string[];
  certBadge?: string;
  verificationScore?: number;
  verifiedAt?: string;
}

export interface CourseQuizQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface RoadmapMilestone {
  id: string;
  phase: number;
  phaseTitle: string;
  description: string;
  targetSkill: string;
  modules: LearningModule[];
  estimatedHours: number;
  completed: boolean;
}

export type JobType = 'Internship' | 'Full-Time' | 'Co-op' | 'Apprenticeship';

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  type: JobType;
  stipendOrSalary: string;
  duration?: string;
  openings: number;
  postedDate: string;
  deadline: string;
  description: string;
  requiredSkills: { name: string; weight: number; minScore: number }[];
  minCgpa: number;
  eligibleBranches: string[];
  matchScore?: number;
  matchedSkillsCount?: number;
  missingSkills?: string[];
  externalUrl?: string;
  sourcePlatform?: 'LinkedIn' | 'Internshala' | 'Unstop' | 'Campus Direct' | 'Adzuna' | 'Google Jobs';
  /** ISO timestamp of the last successful sync from a live source */
  fetchedAt?: string;
  /** Recruiter ownership (null for externally-synced listings) */
  postedBy?: string;
  postedByName?: string;
  /** Present when the posting comes from an AISHE-verified institution account */
  campusInstitution?: { id: string; name: string; aisheCode: string | null };
  /** Lifecycle state — public board only shows 'open' */
  status?: 'open' | 'closed' | 'filled';
  workplaceType?: 'On-site' | 'Hybrid' | 'Remote';
  experienceLevel?: 'Internship' | 'Entry Level (0-2 yrs)' | 'Associate';
  salaryBenchmark?: {
    tier1Avg: string;
    tier2Avg: string;
    tier3Avg: string;
    percentile25: string;
    percentile50: string;
    percentile90: string;
  };
}

export type ApplicationStage = 
  | 'Applied' 
  | 'Under Review' 
  | 'Assessment Sent' 
  | 'Shortlisted' 
  | 'Interview Scheduled' 
  | 'Offer Extended' 
  | 'Rejected';

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  studentId: string;
  studentName: string;
  appliedDate: string;
  status: ApplicationStage;
  aiMatchScore: number;
  notes?: string;
  attachedScorecardUrl?: string;
  attachedResumeUrl?: string;
  stageHistory?: { stage: ApplicationStage; date: string; note?: string }[];
}

export type InterviewMode = 'online' | 'in-person' | 'phone';

export interface InterviewSlot {
  id: string;
  applicationId: string;
  jobId: string;
  studentId: string;
  studentName?: string;
  // Populated on the student-facing /me/interview-slots payload
  jobTitle?: string;
  company?: string;
  location?: string;
  // Populated on the recruiter-facing /recruiter/interview-slots payload
  applicationStatus?: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: InterviewMode;
  meetingUrl?: string | null;
  notes?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt?: string;
}

export interface FunnelPosting {
  jobId: string;
  title: string;
  company: string;
  applied: number;
  shortlisted: number;
  interviewed: number;
  offers: number;
  rejected: number;
  conversionPct: number;
  // Drill-down: this posting's own weekly application trend.
  weeklyTrend: { week: string; applications: number }[];
}

export interface RecruiterFunnelResponse {
  success: boolean;
  postings: FunnelPosting[];
  weeklyTrend: { week: string; applications: number }[];
}

export interface MoU {
  id: string;
  collegeName: string;
  companyName: string;
  title: string;
  focusArea: string;
  signedDate: string;
  validUntil: string;
  status: 'Active' | 'Under Review' | 'Draft';
  initiativesCount: number;
  keyObjectives: string[];
  digitalSignatureHash?: string;
}

export interface ProblemStatement {
  id: string;
  title: string;
  company: string;
  domain: string;
  description: string;
  rewardOrGrant: string;
  deadline: string;
  submissionsCount: number;
  status: 'Open' | 'Evaluating' | 'Completed';
  tags: string[];
}

export interface DepartmentStat {
  department: string;
  totalStudents: number;
  assessedCount: number;
  avgReadiness: number;
  placedCount: number;
  placementPercentage: number;
  topSkillGap: string;
}

export interface GovtRegionStat {
  region: string;
  collegesCount: number;
  totalStudents: number;
  avgEmployabilityScore: number;
  internshipComplianceRate: number;
  tierDistribution: { tier1: number; tier2: number; tier3: number };
}

export interface EmergingSkillTrend {
  skill: string;
  industryDemandGrowth: number; // percentage
  academicSupplyCount: number;
  gapIndex: number;
  priorityAction: string;
}
