import re

with open('src/components/student/SkillGapReport.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the start of ROLE_COMPETENCY_PROFILES
start_idx = content.find('const ROLE_COMPETENCY_PROFILES: Record<string, RoleCompetencyProfile> = {')
# Let's find the end of it, which is before "function getProfileForRole"
end_idx = content.find('// Fallback profile builder')

if start_idx != -1 and end_idx != -1:
    clean_profiles = """const ROLE_COMPETENCY_PROFILES: Record<string, RoleCompetencyProfile> = {
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

  """
    new_content = content[:start_idx] + clean_profiles + content[end_idx:]
    with open('src/components/student/SkillGapReport.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
