import { StudentProfile, JobOpportunity } from '../types';

export interface MatchResult {
  jobId: string;
  matchScore: number; // 0 to 100
  matchedSkills: { name: string; studentScore: number; minScore: number; status: 'strong' | 'acceptable' | 'deficit' }[];
  missingSkills: string[];
  cgpaEligible: boolean;
  branchEligible: boolean;
  overallStatus: 'High Match' | 'Good Match' | 'Skill Gap Needs Bridging' | 'Ineligible';
}

export function calculateJobMatch(student: StudentProfile, job: JobOpportunity): MatchResult {
  const verifiedMap = new Map<string, number>();
  student.verifiedSkills.forEach(s => {
    verifiedMap.set(s.skill.toLowerCase().trim(), s.score);
  });

  // Also consider declared skills as baseline 60 if not verified
  student.declaredSkills.forEach(s => {
    const key = s.toLowerCase().trim();
    if (!verifiedMap.has(key)) {
      verifiedMap.set(key, 60);
    }
  });

  let totalWeight = 0;
  let earnedScore = 0;
  const matchedSkills: MatchResult['matchedSkills'] = [];
  const missingSkills: string[] = [];

  job.requiredSkills.forEach(req => {
    totalWeight += req.weight;
    const reqKey = req.name.toLowerCase().trim();

    // Find best match in student skills (either exact or partial key match)
    let studentScore = 0;
    let found = false;

    for (const [sKey, sScore] of verifiedMap.entries()) {
      if (sKey.includes(reqKey) || reqKey.includes(sKey)) {
        studentScore = sScore;
        found = true;
        break;
      }
    }

    if (found) {
      // Calculate contribution based on weight
      const normalizedContribution = Math.min(100, (studentScore / req.minScore) * 100);
      earnedScore += (normalizedContribution / 100) * req.weight * 100;

      matchedSkills.push({
        name: req.name,
        studentScore,
        minScore: req.minScore,
        status: studentScore >= req.minScore ? 'strong' : studentScore >= req.minScore * 0.75 ? 'acceptable' : 'deficit',
      });
    } else {
      missingSkills.push(req.name);
      matchedSkills.push({
        name: req.name,
        studentScore: 0,
        minScore: req.minScore,
        status: 'deficit',
      });
    }
  });

  const rawMatch = totalWeight > 0 ? Math.round(earnedScore / totalWeight) : 0;
  const finalMatch = Math.min(99, Math.max(25, rawMatch));

  const cgpaEligible = student.cgpa >= job.minCgpa;
  const branchEligible = job.eligibleBranches.some(b => 
    student.branch.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(student.branch.toLowerCase())
  );

  let overallStatus: MatchResult['overallStatus'] = 'Skill Gap Needs Bridging';
  if (finalMatch >= 80 && cgpaEligible && branchEligible) {
    overallStatus = 'High Match';
  } else if (finalMatch >= 65 && cgpaEligible) {
    overallStatus = 'Good Match';
  } else if (!cgpaEligible || !branchEligible) {
    overallStatus = 'Ineligible';
  }

  return {
    jobId: job.id,
    matchScore: finalMatch,
    matchedSkills,
    missingSkills,
    cgpaEligible,
    branchEligible,
    overallStatus,
  };
}
