import re

with open('src/components/student/SkillGapReport.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """  'Full Stack Cloud Engineer': {
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
    },"""

content = re.sub(r"'Full\ Stack\ Cloud\ Engineer':\ \{.*?\},", replacement, content, flags=re.DOTALL)

with open('src/components/student/SkillGapReport.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
