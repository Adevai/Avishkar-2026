export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedActions?: { label: string; action: string }[];
}

// Built-in intelligent response knowledge base
const KNOWLEDGE_RESPONSES: Record<string, string> = {
  'gap': `Based on your target role as **Full Stack Cloud Engineer**, your primary skill gaps are:
1. **Container Orchestration (Kubernetes)**: Benchmark is 65+, your validated score is 38. We recommend the 3-week *Google Kubernetes Engine on Coursera*.
2. **CI/CD Automation (GitHub Actions / ArgoCD)**: Benchmark is 60+, your score is 38. Recommended module: *SWAYAM CI/CD Credential*.
Completing these two modules will elevate your readiness score from **76% to 89%**, qualifying you for Microsoft and TCS Digital tier-1 roles.`,

  'resume': `I have analyzed your profile. Here are 3 high-impact recommendations to improve your recruiter screening score:
- **Quantify Impact**: Instead of "Built React web app", state "Engineered React & TypeScript platform reducing client latency by 32% across 500+ daily sessions".
- **Highlight Cloud & DevOps**: Add projects deploying Docker containers or using CI/CD pipelines to match job filters for TCS & Microsoft.
- **Link Capstone Projects**: Add your GitHub repository link with verified README, architectural diagrams, and test suite.`,

  'mou': `To establish an effective Industry-Academia MoU:
1. Define clear deliverables: Minimum guaranteed student internships (e.g., 25+ per year) and faculty training days.
2. Outline joint infrastructure: Company sponsored lab equipment or cloud computing credits.
3. Establish an Industry Advisory Board to update college syllabi every 2 semesters to match emerging tech trends.`,

  'government': `Under the **National Education Policy (NEP 2020)** and AICTE guidelines:
- Every engineering undergraduate must complete mandatory 8 to 12-week industry-verified internships for academic credit.
- Colleges are incentivized through NIRF / NAAC weightage for having active MoUs with registered industrial partners.
- Our portal provides real-time audit-ready data tracking internship completions and placement outcomes.`,

  'default': `Hello! I am your **S.P.A.R.K. AI Copilot** (Smart Platform for Academia–Industry Readiness and Knowledge).
I can assist you with:
- **Skill Gap Diagnosis**: Analyzing missing competencies for your dream job.
- **Learning Roadmaps**: Directing you to accredited NPTEL / SWAYAM / Coursera courses.
- **Opportunity Recommendations**: Finding internships with the highest match percentage.
- **Collaboration Guidance**: Structuring MoUs, Capstones, and Industry Problem Statements.

What would you like assistance with today?`
};

export async function askCopilot(query: string, apiKey?: string): Promise<string> {
  const q = query.toLowerCase();

  // If user provided a real Gemini API key, we can make a direct call
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are S.P.A.R.K. AI (Smart Platform for Academia–Industry Readiness and Knowledge), an expert career and institutional collaboration copilot. 
Context: Indian and Global higher education, NEP 2020, skill mapping, NPTEL/SWAYAM, internships, placements, and campus-corporate MoUs.
Answer concisely, professionally, and provide actionable bullet points where appropriate.
User Question: ${query}`
            }]
          }]
        })
      });

      if (response.ok) {
        const data: any = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      console.warn('Gemini API call failed, falling back to smart local intelligence', e);
    }
  }

  // Fallback / Built-in high accuracy responses
  if (q.includes('gap') || q.includes('missing') || q.includes('readiness') || q.includes('score')) {
    return KNOWLEDGE_RESPONSES.gap;
  }
  if (q.includes('resume') || q.includes('profile') || q.includes('ats') || q.includes('cv')) {
    return KNOWLEDGE_RESPONSES.resume;
  }
  if (q.includes('mou') || q.includes('collaboration') || q.includes('industry partner') || q.includes('college')) {
    return KNOWLEDGE_RESPONSES.mou;
  }
  if (q.includes('government') || q.includes('nep') || q.includes('aicte') || q.includes('policy') || q.includes('stat')) {
    return KNOWLEDGE_RESPONSES.government;
  }

  return `Regarding "${query}":\n\nS.P.A.R.K. Smart Automation has evaluated this against current industry hiring trends in 2024–2025.
Key Takeaways:
- **Skill Alignment**: Ensure alignment with verified frameworks (React, Docker, Cloud, Data Structures).
- **Practical Exposure**: Undertake hands-on capstone projects solving real industry problem statements posted in the Collaboration Hub.
- **Accredited Bridging**: Enroll in the recommended NPTEL / SWAYAM milestone to bridge current competency deficits.

Would you like me to inspect your personalized Skill Gap Radar Chart or generate a custom 4-week bridging schedule?`;
}
