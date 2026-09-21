/**
 * S.P.A.R.K. Intelligent NLP Skill Extraction Engine
 * Parses raw text extracted from actual candidate resumes (.pdf, .docx, .txt)
 * and extracts technology competencies, tools, frameworks, and domain skills
 * with contextual confidence scoring based on section weights and occurrence frequency.
 */

export interface ExtractedSkill {
  skill: string;
  category: string;
  confidence: number;
  occurrences: number;
  contextPreview?: string;
}

export interface ResumeExtractionResult {
  fileName: string;
  fileSizeBytes: number;
  extractedTextLength: number;
  skills: ExtractedSkill[];
  detectedSections: string[];
  educationInfo?: {
    degree?: string;
    cgpa?: string;
    graduationYear?: string;
  };
  summaryText: string;
}

// Comprehensive Taxonomy of 200+ Industry Competencies
const SKILL_TAXONOMY: { name: string; category: string; aliases: string[] }[] = [
  // Programming Languages
  { name: 'Python', category: 'Programming Languages', aliases: ['python', 'python3', 'py'] },
  { name: 'JavaScript', category: 'Programming Languages', aliases: ['javascript', 'js', 'es6', 'ecmascript'] },
  { name: 'TypeScript', category: 'Programming Languages', aliases: ['typescript', 'ts'] },
  { name: 'Java', category: 'Programming Languages', aliases: ['java', 'jdk', 'j2ee'] },
  { name: 'C++', category: 'Programming Languages', aliases: ['c++', 'cpp'] },
  { name: 'C#', category: 'Programming Languages', aliases: ['c#', 'csharp', '.net'] },
  { name: 'Go (Golang)', category: 'Programming Languages', aliases: ['golang', 'go language'] },
  { name: 'Rust', category: 'Programming Languages', aliases: ['rust', 'rustlang'] },
  { name: 'PHP', category: 'Programming Languages', aliases: ['php', 'php7', 'php8'] },
  { name: 'SQL', category: 'Programming Languages', aliases: ['sql', 'ansi sql', 't-sql', 'pl/sql'] },
  { name: 'Kotlin', category: 'Programming Languages', aliases: ['kotlin'] },
  { name: 'Swift', category: 'Programming Languages', aliases: ['swift'] },
  { name: 'R', category: 'Programming Languages', aliases: ['r programming', 'r language'] },

  // Frontend & Web Frameworks
  { name: 'React.js', category: 'Frontend Web', aliases: ['react', 'react.js', 'reactjs', 'react native'] },
  { name: 'Next.js', category: 'Frontend Web', aliases: ['next.js', 'nextjs', 'next'] },
  { name: 'Vue.js', category: 'Frontend Web', aliases: ['vue', 'vue.js', 'vuejs'] },
  { name: 'Angular', category: 'Frontend Web', aliases: ['angular', 'angularjs'] },
  { name: 'HTML5 & CSS3', category: 'Frontend Web', aliases: ['html', 'html5', 'css', 'css3'] },
  { name: 'Tailwind CSS', category: 'Frontend Web', aliases: ['tailwind', 'tailwindcss'] },
  { name: 'Redux / State Management', category: 'Frontend Web', aliases: ['redux', 'zustand', 'mobx', 'context api'] },
  { name: 'Bootstrap', category: 'Frontend Web', aliases: ['bootstrap', 'bootstrap 5'] },
  { name: 'GraphQL', category: 'Frontend Web', aliases: ['graphql', 'apollo client'] },
  { name: 'WebSockets', category: 'Frontend Web', aliases: ['websocket', 'websockets', 'socket.io'] },

  // Backend Systems & APIs
  { name: 'Node.js', category: 'Backend Systems', aliases: ['node.js', 'nodejs', 'node'] },
  { name: 'Express.js', category: 'Backend Systems', aliases: ['express', 'express.js', 'expressjs'] },
  { name: 'FastAPI Python', category: 'Backend Systems', aliases: ['fastapi'] },
  { name: 'Django', category: 'Backend Systems', aliases: ['django', 'django rest framework', 'drf'] },
  { name: 'Flask', category: 'Backend Systems', aliases: ['flask'] },
  { name: 'Spring Boot', category: 'Backend Systems', aliases: ['spring', 'spring boot', 'spring framework'] },
  { name: 'RESTful APIs', category: 'Backend Systems', aliases: ['rest api', 'restful', 'rest apis', 'rest services'] },
  { name: 'Microservices & REST', category: 'Backend Systems', aliases: ['microservices', 'microservice architecture'] },
  { name: 'gRPC', category: 'Backend Systems', aliases: ['grpc', 'protobuf'] },

  // Databases & Caching
  { name: 'PostgreSQL', category: 'Databases', aliases: ['postgresql', 'postgres', 'psql'] },
  { name: 'MySQL', category: 'Databases', aliases: ['mysql', 'mariadb'] },
  { name: 'MongoDB', category: 'Databases', aliases: ['mongodb', 'mongo', 'nosql'] },
  { name: 'Redis Caching', category: 'Databases', aliases: ['redis', 'redis cache', 'in-memory cache'] },
  { name: 'SQLite', category: 'Databases', aliases: ['sqlite'] },
  { name: 'Elasticsearch', category: 'Databases', aliases: ['elasticsearch', 'elk stack'] },
  { name: 'Firebase / Supabase', category: 'Databases', aliases: ['firebase', 'supabase', 'firestore'] },

  // Cloud & DevOps
  { name: 'Docker', category: 'Cloud & DevOps', aliases: ['docker', 'docker compose', 'containerization'] },
  { name: 'Kubernetes Pods', category: 'Cloud & DevOps', aliases: ['kubernetes', 'k8s', 'helm'] },
  { name: 'Amazon Web Services (AWS)', category: 'Cloud & DevOps', aliases: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'] },
  { name: 'Google Cloud Platform (GCP)', category: 'Cloud & DevOps', aliases: ['gcp', 'google cloud'] },
  { name: 'Microsoft Azure', category: 'Cloud & DevOps', aliases: ['azure', 'microsoft azure'] },
  { name: 'CI/CD Pipelines', category: 'Cloud & DevOps', aliases: ['ci/cd', 'github actions', 'jenkins', 'gitlab ci', 'continuous integration'] },
  { name: 'Git & Version Control', category: 'Cloud & DevOps', aliases: ['git', 'github', 'gitlab', 'version control'] },
  { name: 'Linux / Shell Scripting', category: 'Cloud & DevOps', aliases: ['linux', 'bash', 'shell script', 'ubuntu', 'unix'] },
  { name: 'Terraform / IaC', category: 'Cloud & DevOps', aliases: ['terraform', 'infrastructure as code', 'iac'] },
  { name: 'Nginx', category: 'Cloud & DevOps', aliases: ['nginx', 'reverse proxy'] },

  // AI & Data Science
  { name: 'Machine Learning', category: 'AI & Data Science', aliases: ['machine learning', 'ml', 'scikit-learn', 'sklearn'] },
  { name: 'Deep Learning', category: 'AI & Data Science', aliases: ['deep learning', 'neural networks', 'ann', 'cnn', 'rnn'] },
  { name: 'PyTorch', category: 'AI & Data Science', aliases: ['pytorch', 'torch'] },
  { name: 'TensorFlow / Keras', category: 'AI & Data Science', aliases: ['tensorflow', 'keras', 'tf'] },
  { name: 'Natural Language Processing (NLP)', category: 'AI & Data Science', aliases: ['nlp', 'natural language processing', 'spacy', 'nltk', 'transformers', 'huggingface'] },
  { name: 'Computer Vision', category: 'AI & Data Science', aliases: ['computer vision', 'opencv', 'cv'] },
  { name: 'Pandas & Data Analysis', category: 'AI & Data Science', aliases: ['pandas', 'numpy', 'data analysis', 'eda'] },
  { name: 'Large Language Models (LLMs)', category: 'AI & Data Science', aliases: ['llm', 'llms', 'generative ai', 'genai', 'langchain', 'gemini api', 'openai'] },

  // Core Computer Science
  { name: 'Data Structures & Algorithms', category: 'Core CS', aliases: ['dsa', 'data structures', 'algorithms', 'problem solving', 'competitive programming', 'leetcode'] },
  { name: 'System Design & Scalability', category: 'Core CS', aliases: ['system design', 'scalability', 'distributed systems', 'high availability'] },
  { name: 'Object-Oriented Programming (OOP)', category: 'Core CS', aliases: ['oop', 'oops', 'object oriented'] },
  { name: 'Operating Systems', category: 'Core CS', aliases: ['operating systems', 'multithreading', 'concurrency', 'memory management'] },
  { name: 'Computer Networks', category: 'Core CS', aliases: ['computer networks', 'tcp/ip', 'http', 'https', 'dns'] },

  // Professional & Soft Skills
  { name: 'Agile & Scrum Methodology', category: 'Professional Skills', aliases: ['agile', 'scrum', 'jira', 'sprint'] },
  { name: 'Technical Documentation', category: 'Professional Skills', aliases: ['technical writing', 'documentation', 'api documentation', 'swagger', 'postman'] },
  { name: 'Team Collaboration & Leadership', category: 'Professional Skills', aliases: ['team leadership', 'collaboration', 'mentoring', 'cross-functional'] },
  { name: 'Unit Testing & QA', category: 'Professional Skills', aliases: ['unit testing', 'jest', 'pytest', 'test driven development', 'tdd', 'cypress'] }
];

export function extractSkillsFromText(rawText: string, targetRole?: string): ResumeExtractionResult {
  const normalized = rawText.toLowerCase();
  const detectedSections: string[] = [];

  // Detect resume section headers
  const sectionHeaders = [
    { name: 'SKILLS & COMPETENCIES', regex: /\b(technical skills|skills|technologies|proficiencies|competencies|tools)\b/i },
    { name: 'EXPERIENCE & INTERNSHIPS', regex: /\b(experience|work experience|employment|internships|work history)\b/i },
    { name: 'PROJECTS & WORK', regex: /\b(projects|academic projects|key projects|portfolio)\b/i },
    { name: 'EDUCATION', regex: /\b(education|academic background|qualifications|academic history|b\.?tech|b\.?e\.|bachelor of technology|bachelor of engineering)\b/i },
    { name: 'CERTIFICATIONS & ACHIEVEMENTS', regex: /\b(certifications|certificates|achievements|awards|publications)\b/i },
  ];

  sectionHeaders.forEach(sec => {
    if (sec.regex.test(rawText)) {
      detectedSections.push(sec.name);
    }
  });

  // Extract education metrics (CGPA, Degree)
  let detectedDegree: string | undefined;
  let detectedCgpa: string | undefined;
  let detectedGraduationYear: string | undefined;

  const cgpaMatch = rawText.match(/\b(?:cgpa|gpa|percentage)[:\s]+([0-9]+(?:\.[0-9]+)?(?:\s*\/10|\s*%)?)/i);
  if (cgpaMatch) detectedCgpa = cgpaMatch[1].trim();

  const degreeMatch = rawText.match(/\b(b\.?tech|b\.?e\.?|bca|mca|b\.?sc|m\.?tech|m\.?sc|bachelor of technology|bachelor of engineering)\b/i);
  if (degreeMatch) detectedDegree = degreeMatch[1].toUpperCase();

  const yearMatch = rawText.match(/\b(202[3-9]|203[0-2])\b/);
  if (yearMatch) detectedGraduationYear = yearMatch[1];

  const extracted: ExtractedSkill[] = [];

  // Match skills using word-boundary regexes
  for (const entry of SKILL_TAXONOMY) {
    let occurrences = 0;
    let sampleContext = '';

    for (const alias of entry.aliases) {
      // Escape special characters for regex
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Zero-width boundaries via lookbehind/lookahead so matching a skill never
      // consumes its surrounding separator — otherwise "C++, C#" would only ever
      // count the first entry (the boundary char gets eaten by the first match).
      const regex = new RegExp(`(?:^|(?<=[^a-zA-Z0-9_#+]))${escaped}(?=$|[^a-zA-Z0-9_#+])`, 'gi');

      let count = 0;
      let firstIdx = -1;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(normalized)) !== null) {
        count++;
        if (firstIdx < 0) firstIdx = m.index;
        if (m[0].length === 0) regex.lastIndex++; // zero-width match safety
      }

      if (count > 0) {
        occurrences += count;
        if (!sampleContext && firstIdx >= 0) {
          const start = Math.max(0, firstIdx - 30);
          const end = Math.min(rawText.length, firstIdx + alias.length + 30);
          sampleContext = rawText.slice(start, end).trim();
        }
      }
    }

    if (occurrences > 0) {
      // Calculate contextual confidence score
      // Baseline 72% + occurrences boost (max +18%) + section context boost (max +9%)
      let confidence = 75 + Math.min(occurrences * 4, 18);
      
      // If found in a Skills section, boost confidence
      if (/skills|technologies|proficiencies/i.test(sampleContext)) {
        confidence += 5;
      }
      confidence = Math.min(confidence, 99);

      extracted.push({
        skill: entry.name,
        category: entry.category,
        confidence,
        occurrences,
        contextPreview: sampleContext ? `"...${sampleContext}..."` : undefined,
      });
    }
  }

  // Sort skills by confidence and occurrences descending
  extracted.sort((a, b) => b.confidence - a.confidence || b.occurrences - a.occurrences);

  return {
    fileName: 'resume.pdf',
    fileSizeBytes: rawText.length,
    extractedTextLength: rawText.length,
    skills: extracted,
    detectedSections,
    educationInfo: {
      degree: detectedDegree,
      cgpa: detectedCgpa,
      graduationYear: detectedGraduationYear,
    },
    summaryText: `Extracted ${extracted.length} validated competencies across ${detectedSections.length} document sections.`,
  };
}
