import re

with open('src/components/student/CompetencyPassportModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { HolographicCard } from '../three/HolographicCard';\nimport { HolographicCard } from '../three/HolographicCard';", "import { HolographicCard } from '../three/HolographicCard';")

# Just to be sure, let's remove ALL holographic card imports and just add one at the top.
content = re.sub(r"import \{ HolographicCard \} from '\.\./three/HolographicCard';\n", "", content)
content = "import { HolographicCard } from '../three/HolographicCard';\n" + content

with open('src/components/student/CompetencyPassportModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
