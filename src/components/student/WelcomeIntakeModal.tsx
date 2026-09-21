import React, { useState } from 'react';
import { 
  Sparkles, 
  Building2, 
  GraduationCap, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  Search,
  BrainCircuit,
  Award,
  ShieldCheck,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { verifyInstitution, VERIFIED_INSTITUTIONS } from '../../data/institutions';
import { CollegeAutocomplete } from '../common/CollegeAutocomplete';
import { AcademicSelector } from '../common/AcademicSelector';

interface WelcomeIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_SKILLS = [
  // Tech & Software
  'React.js', 'Node.js', 'TypeScript', 'Python', 'Java', 'Docker', 'Kubernetes', 'AWS', 'PostgreSQL', 'Machine Learning',
  // Mechanical & Automotive
  'AutoCAD / SolidWorks', 'ANSYS Simulation', 'Thermodynamics & CFD', 'CNC Programming & CAM', 'Robotics & PLC',
  // Civil & Infrastructure
  'STAAD.Pro / ETABS', 'BIM & Revit Architecture', 'Structural Analysis', 'Surveying & GIS', 'Geotechnical Engineering',
  // Medical & Healthcare
  'Clinical Diagnostics', 'Pharmacology', 'Human Anatomy & Physiology', 'Medical Lab Tech', 'Good Clinical Practice (GCP)', 'Biostatistics',
  // Law & Legal
  'Contract Drafting & Negotiation', 'Constitutional Law', 'IPR & Patent Filing', 'Corporate Governance', 'Legal Research (SCC/Manupatra)',
  // Design, Arts & Media
  'UI/UX & Figma', 'Design Thinking & Prototyping', 'Adobe Creative Suite', 'Typography & Visual Layout', 'Content & Editorial Strategy'
];

const CAREER_GOALS = [
  'Full Stack Cloud Engineer',
  'AI/ML Specialist',
  'DevOps & SRE Engineer',
  'Data Engineer & Analytics Specialist',
  'Cybersecurity Analyst',
  'Embedded & IoT Systems Engineer',
  'Mechanical Design & CAD/CAM Engineer',
  'Robotics & Mechatronics Engineer',
  'Structural Analysis & Design Engineer',
  'BIM Specialist & Construction Manager',
  'Clinical Research & Diagnostics Associate',
  'Medical Officer & Healthcare Consultant',
  'Pharmacovigilance & Drug Discovery Specialist',
  'Corporate Legal Counsel & Compliance Officer',
  'Intellectual Property & Patent Attorney',
  'UI/UX & Digital Product Designer',
  'Visual Communication & Brand Strategist'
];

export const WelcomeIntakeModal: React.FC<WelcomeIntakeModalProps> = ({ isOpen, onClose }) => {
  const { student, updateStudentProfile, setActiveTab, setNotification } = useApp();

  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [degree, setDegree] = useState(student.degree || 'B.Tech');
  const [branch, setBranch] = useState(student.branch || 'Computer Science & Engineering');
  const [currentYear, setCurrentYear] = useState('3rd Year (Sem 5-6)');
  const [instituteInput, setInstituteInput] = useState(student.college || '');
  const [selectedGoal, setSelectedGoal] = useState(student.targetRole || 'Full Stack Cloud Engineer');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(student.declaredSkills && student.declaredSkills.length > 0 ? student.declaredSkills : ['React.js', 'TypeScript', 'Node.js']);
  const [customSkill, setCustomSkill] = useState('');

  // Skills Quiz testing state
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  if (!isOpen) return null;

  // Real-time verification of entered institution
  const instituteVerification = verifyInstitution(instituteInput);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
    } else {
      setSelectedSkills(prev => [...prev, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills(prev => [...prev, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  // Comprehensive question bank generator tailored to selected skills
  const generateSkillQuestion = (skill: string, index: number) => {
    const s = skill.toLowerCase();

    // Healthcare & Medical
    if (s.includes('clinic') || s.includes('diagnos') || s.includes('health') || s.includes('med') || s.includes('pharmac') || s.includes('anatom') || s.includes('biostat')) {
      const medQuestions = [
        {
          question: `In clinical trial management and drug discovery involving ${skill}, what constitutes the principal endpoint of Phase III double-blind randomized controlled trials?`,
          options: [
            'Evaluating in-vitro molecular solubility and initial crystal growth',
            'Confirming statistically significant therapeutic efficacy and monitoring adverse reactions across a large, diverse cohort',
            'Assessing retail pharmaceutical supply chain warehousing costs',
            'Testing toxicity exclusively in pre-clinical rodent models'
          ],
          correctAnswer: 1
        },
        {
          question: `Under Good Clinical Practice (GCP) and ICMR ethical guidelines, what is mandatory before enrolling any human subject for evaluation?`,
          options: [
            'Institutional Ethics Committee (IEC) approved Informed Consent Form (ICF) signed freely by the participant',
            'Hospital billing clearance counter-signature',
            'Verbal consent recorded over an informal telephonic query',
            'Private medical insurance claim sanction'
          ],
          correctAnswer: 0
        },
        {
          question: `In biostatistics and diagnostic testing related to ${skill}, what metric quantifies the true positive rate (ability to correctly identify subjects with the condition)?`,
          options: [
            'Diagnostic Sensitivity',
            'Diagnostic Specificity',
            'Negative Predictive Value (NPV)',
            'Standard Deviation'
          ],
          correctAnswer: 0
        }
      ];
      const pick = medQuestions[index % medQuestions.length];
      return { id: index + 1, skill, ...pick };
    }

    // Law & Legal Studies
    if (s.includes('law') || s.includes('legal') || s.includes('contract') || s.includes('ipr') || s.includes('patent') || s.includes('govern') || s.includes('corporate')) {
      const lawQuestions = [
        {
          question: `In contract drafting and commercial transactions involving ${skill}, what is the precise legal operational effect of an Indemnity Clause?`,
          options: [
            'It obligates one contracting party to compensate and hold harmless the other party against specified liabilities or third-party claims',
            'It automatically invalidates all previous non-disclosure agreements between the signatories',
            'It converts private equity debentures into public government bonds',
            'It strips arbitration tribunals of procedural jurisdiction'
          ],
          correctAnswer: 0
        },
        {
          question: `Under Indian Patent Law (Patents Act, 1970), which statutory trio must an invention satisfy to qualify for patent grant?`,
          options: [
            'Novelty, Inventive Step (Non-obviousness), and Industrial Applicability',
            'High market sales volume, copyright protection, and trademark badge',
            'Open-source licensing, public peer-review, and ministerial approval',
            'Commercial registration, website availability, and tax registration'
          ],
          correctAnswer: 0
        },
        {
          question: `In corporate governance and compliance when applying ${skill}, what is the primary fiduciary duty of corporate board directors?`,
          options: [
            'Act in good faith to promote the company objects for the benefit of its members as a whole and uphold stakeholder integrity',
            'Maximize short-term quarterly stock speculation above environmental safety',
            'Ensure all internal auditing documents remain inaccessible to regulatory authorities',
            'Personally guarantee all commercial loans without resolution'
          ],
          correctAnswer: 0
        }
      ];
      const pick = lawQuestions[index % lawQuestions.length];
      return { id: index + 1, skill, ...pick };
    }

    // Civil & Structural Engineering
    if (s.includes('staad') || s.includes('etabs') || s.includes('bim') || s.includes('revit') || s.includes('civil') || s.includes('structur') || s.includes('survey') || s.includes('geotech')) {
      const civilQuestions = [
        {
          question: `In structural engineering and finite modeling using ${skill}, why does Limit State Design (LSM) supersede the Working Stress Method?`,
          options: [
            'It accounts for material plasticity and applies distinct partial safety factors for load combinations and material strengths',
            'It completely eliminates the need to calculate dead loads and wind uplift forces',
            'It requires zero matrix structural calculations for continuous beams',
            'It strictly restricts building construction materials to timber frameworks'
          ],
          correctAnswer: 0
        },
        {
          question: `In BIM workflows and structural collaboration with ${skill}, what is the purpose of Level of Development (LOD 350)?`,
          options: [
            'Model elements include graphical details and interfaces to neighboring building systems suitable for construction coordination',
            'Only conceptual massing volumes with zero dimensional data',
            'Operations and facility maintenance handover data solely for post-occupancy',
            'Rough cost estimations based on generic floor area metrics'
          ],
          correctAnswer: 0
        },
        {
          question: `When analyzing seismic lateral force resisting systems with ${skill}, how does the Response Reduction Factor (R) influence base shear design?`,
          options: [
            'It scales down elastic seismic forces to reflect structural ductility, overstrength, and energy dissipation capacity',
            'It multiplies gravitational dead loads by seismic zone factors',
            'It guarantees buildings will suffer zero cosmetic cracking during earthquakes',
            'It converts wind vortex frequencies directly into thermal energy'
          ],
          correctAnswer: 0
        }
      ];
      const pick = civilQuestions[index % civilQuestions.length];
      return { id: index + 1, skill, ...pick };
    }

    // Mechanical, CAD/CAM & Robotics
    if (s.includes('cad') || s.includes('solidworks') || s.includes('ansys') || s.includes('cfd') || s.includes('cnc') || s.includes('robot') || s.includes('thermo') || s.includes('mechanic')) {
      const mechQuestions = [
        {
          question: `In finite element analysis (FEA) and mechanical stress verification using ${skill}, what does the von Mises yield criterion predict?`,
          options: [
            'Plastic yielding onset under multiaxial complex stress states based on distortional strain energy',
            'The thermodynamic evaporation temperature of engine lubricants',
            'Acoustic resonance frequencies inside automobile cabins',
            'Lithium-ion battery cathode degradation cycles'
          ],
          correctAnswer: 0
        },
        {
          question: `In CNC machining and CAM toolpath generation with ${skill}, why is climb milling (down milling) generally preferred over conventional milling for modern CNC tooling?`,
          options: [
            'It produces maximum chip thickness at cutter entry, improving surface finish, reducing tool wear, and extending tool life',
            'It requires no coolant fluids during high-speed titanium cutting',
            'It generates zero cutting forces against machine workpiece fixtures',
            'It allows the spindle motor to rotate backwards without torque limits'
          ],
          correctAnswer: 0
        },
        {
          question: `In robotics and kinematic modeling using ${skill}, what does the Denavit-Hartenberg (D-H) convention establish?`,
          options: [
            'A systematic 4-parameter coordinate frame convention to compute forward kinematics between adjacent manipulator links',
            'The electrical current draw of stepper motors under stalling torque',
            'The thermal heat dissipation coefficient of robotic aluminum chassis',
            'The network packet latency of industrial CAN-bus telemetry'
          ],
          correctAnswer: 0
        }
      ];
      const pick = mechQuestions[index % mechQuestions.length];
      return { id: index + 1, skill, ...pick };
    }

    // Design, UI/UX & Visual Media
    if (s.includes('figma') || s.includes('design') || s.includes('ui/ux') || s.includes('adobe') || s.includes('typograph') || s.includes('visual') || s.includes('brand')) {
      const designQuestions = [
        {
          question: `In UX architecture and interface design with ${skill}, what is the core implication of Jakob's Law of Internet User Experience?`,
          options: [
            'Users spend most time on other digital products, so they expect your application to behave similarly to familiar established conventions',
            'Every button must have a minimum border radius of 50 physical pixels',
            'Mobile user interfaces must avoid typographic contrast ratios higher than 2:1',
            'All primary calls-to-action must be placed exclusively at the bottom left quadrant'
          ],
          correctAnswer: 0
        },
        {
          question: `When establishing design systems and tokens in ${skill}, how does auto-layout and component variable architecture benefit development handoff?`,
          options: [
            'It enables dynamic content resizing, consistent spacing scales, and automatic parity between design specs and CSS flexbox/grid',
            'It compiles Figma frames into native machine microcode directly',
            'It limits screens to a maximum resolution of 720p',
            'It disables user interactions until all vector SVGs load'
          ],
          correctAnswer: 0
        },
        {
          question: `Under WCAG 2.1 Level AA accessibility standards relevant to ${skill}, what is the minimum required contrast ratio for normal body text?`,
          options: [
            '4.5:1 against its background color',
            '1.5:1 against its background color',
            '12:1 against its background color',
            'Contrast ratios are optional for modern dark-mode themes'
          ],
          correctAnswer: 0
        }
      ];
      const pick = designQuestions[index % designQuestions.length];
      return { id: index + 1, skill, ...pick };
    }

    // Technology, Cloud, Data, Frontend & Engineering
    const techPool = [
      {
        question: `When designing scalable production systems with ${skill}, how does asynchronous non-blocking event-driven I/O optimize high concurrency?`,
        options: [
          'It allows single or few threads to service thousands of concurrent client connections without allocating a dedicated OS thread per socket',
          'It completely removes the need for database indexing or querying',
          'It forces every API request to run inside isolated hardware microcontrollers',
          'It compresses all database records into unindexed flat text files'
        ],
        correctAnswer: 0
      },
      {
        question: `In production state management and architectures leveraging ${skill}, which pattern best prevents cascading service failures during downstream database latency?`,
        options: [
          'Circuit Breaker pattern with health fallback degradation',
          'Uncapped infinite retry loops with zero backoff interval',
          'Synchronous thread blocking until remote timeouts elapse after 10 minutes',
          'Terminating the entire container cluster on the first 500 error'
        ],
        correctAnswer: 0
      },
      {
        question: `When optimizing performance and latency in applications using ${skill}, what is the principal advantage of an in-memory caching layer (e.g. Redis)?`,
        options: [
          'Sub-millisecond read throughput for frequent hot keys, offloading expensive disk I/O and complex queries',
          'Permanent permanent storage that never experiences hardware node failure',
          'Automatically rewriting client HTML and CSS stylesheets',
          'Eliminating all network security firewalls'
        ],
        correctAnswer: 0
      },
      {
        question: `In continuous integration and deployment (CI/CD) pipelines involving ${skill}, what is the primary role of end-to-end and integration test suites?`,
        options: [
          'Verify subsystem interoperability, contracts, and business workflows to intercept regressions before production release',
          'Artificially inflate cloud billing costs to demonstrate pipeline activity',
          'Replace production database backups entirely',
          'Minify TypeScript files into legacy ECMAScript 3 binaries'
        ],
        correctAnswer: 0
      },
      {
        question: `When securing APIs and services built with ${skill}, what standard mechanism provides stateless, cryptographically verified authorization tokens?`,
        options: [
          'JSON Web Tokens (JWT) signed with asymmetric RS256 or HMAC-SHA256',
          'Storing plain text passwords inside client cookies without encryption',
          'Hardcoding API keys in public client-side JavaScript repositories',
          'Passing user passwords in URL query parameters over HTTP'
        ],
        correctAnswer: 0
      },
      {
        question: `In containerized deployments with ${skill}, why are lightweight multi-stage Docker builds recommended for production images?`,
        options: [
          'They segregate build toolchains from runtime artifacts, minimizing container attack surfaces and slashing final image sizes',
          'They allow containers to bypass operating system kernel virtualization',
          'They ensure containers only run on local developer laptops',
          'They convert container images into virtual floppy disk drives'
        ],
        correctAnswer: 0
      },
      {
        question: `When designing relational databases supporting ${skill}, how do B-tree indexes improve query performance for equality and range filters?`,
        options: [
          'They provide logarithmic O(log N) lookup time complexity, bypassing costly sequential full-table disk scans',
          'They duplicate the entire table across separate cloud storage providers',
          'They automatically normalize schemas into sixth normal form',
          'They compress relational columns into lossy JPEG image matrices'
        ],
        correctAnswer: 0
      },
      {
        question: `In modern cloud-native architectures with ${skill}, what is the primary objective of distributed tracing (e.g. OpenTelemetry)?`,
        options: [
          'Track and visualize the complete end-to-end lifecycle of a request as it traverses distributed microservices via correlation IDs',
          'Record the physical room temperature of cloud data centers',
          'Convert backend log messages into synthesized voice calls',
          'Automatically pay monthly cloud vendor invoices'
        ],
        correctAnswer: 0
      }
    ];

    const pick = techPool[index % techPool.length];
    return {
      id: index + 1,
      skill,
      question: pick.question,
      options: pick.options,
      correctAnswer: pick.correctAnswer
    };
  };

  // Generate at least 15 questions distributed across all chosen skills
  const diagnosticQuestions = Array.from({ length: 15 }, (_, i) => {
    const skillsToUse = selectedSkills.length > 0 ? selectedSkills : ['Core Engineering'];
    const skill = skillsToUse[i % skillsToUse.length];
    return generateSkillQuestion(skill, i);
  });

  const handleNextToQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instituteInput.trim()) return;
    setStep(2);
  };

  const handleFinalizeIntake = (takeFullAssessment: boolean) => {
    // Map year string to semester number
    let sem = 5;
    if (currentYear.includes('1st')) sem = 1;
    else if (currentYear.includes('2nd')) sem = 3;
    else if (currentYear.includes('3rd')) sem = 5;
    else if (currentYear.includes('4th')) sem = 7;

    // Calculate diagnostic score
    let correctCount = 0;
    diagnosticQuestions.forEach((q, idx) => {
      if (testAnswers[idx] === q.correctAnswer) correctCount++;
    });

    const diagnosticScore = Math.round((correctCount / diagnosticQuestions.length) * 100);

    updateStudentProfile({
      degree,
      branch,
      college: instituteInput.trim(),
      semester: sem,
      targetRole: selectedGoal,
      declaredSkills: selectedSkills,
      readinessScore: Math.max(student.readinessScore || 20, Math.round(diagnosticScore * 0.7 + 25))
    });

    localStorage.setItem('spark_intake_completed', 'true');
    setNotification(`Profile calibrated for ${selectedGoal}! Diagnostic skill score: ${diagnosticScore}%`);
    onClose();

    if (takeFullAssessment) {
      setActiveTab('assessment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Step {step} of 2 • {step === 1 ? 'Academic & Career Calibration' : 'Quick Competency Validation'}</span>
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            {step === 1 ? 'Welcome to S.P.A.R.K.!' : 'Skill Diagnostic Challenge'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
            {step === 1 
              ? 'Tell us your field of study, current institute, career goal, and existing skills to calibrate your personalized roadmap.'
              : 'Answer 3 quick technical diagnostic questions on your declared skills to benchmark your starting readiness.'}
          </p>
        </div>

        {/* STEP 1: Academic & Skills Intake */}
        {step === 1 && (
          <form onSubmit={handleNextToQuiz} className="p-6 space-y-5">
            
            {/* Institute with Live API & Real-World Autocomplete */}
            <CollegeAutocomplete
              value={instituteInput}
              onChange={(name) => setInstituteInput(name)}
              label="Current Institute / University"
              placeholder="Type college or university name (e.g. AIIMS, Patil, COEP, BITS)..."
            />

            {/* 3-Tier Academic Stream -> Degree -> Branch Hierarchy */}
            <AcademicSelector
              selectedDegree={degree}
              selectedBranch={branch}
              onDegreeChange={(d) => setDegree(d)}
              onBranchChange={(b) => setBranch(b)}
            />

            {/* Current Academic Year */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Current Academic Year</label>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none font-medium"
              >
                <option value="1st Year (Sem 1-2)">1st Year (Sem 1-2)</option>
                <option value="2nd Year (Sem 3-4)">2nd Year (Sem 3-4)</option>
                <option value="3rd Year (Sem 5-6)">3rd Year (Sem 5-6)</option>
                <option value="4th Year (Sem 7-8)">4th Year (Sem 7-8)</option>
                <option value="5th Year / Intern">5th Year / Clinical Internship</option>
              </select>
            </div>

            {/* Target Career Goal */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Target className="w-4 h-4 text-amber-500" />
                <span>Select Your Target Career Goal</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAREER_GOALS.map((goal) => {
                  const isSelected = selectedGoal === goal;
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setSelectedGoal(goal)}
                      className={`p-3 rounded-xl border text-left transition-all text-xs font-bold flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{goal}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Skills That He Has */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Select The Current Skills You Possess ({selectedSkills.length} selected)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                {COMMON_SKILLS.map((skill) => {
                  const isChosen = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        isChosen
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {skill} {isChosen ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Skill input */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Add other skill (e.g. Next.js, PyTorch)..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Skip for now
              </button>

              <button
                type="submit"
                disabled={selectedSkills.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all hover:scale-105 disabled:opacity-50"
              >
                <span>Proceed to Skill Test</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Comprehensive 15-Question Skill Diagnostic Assessment */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 rounded-2xl border border-blue-200/80 text-blue-950 text-xs">
              <div className="flex items-center gap-2.5">
                <BrainCircuit className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <div className="font-extrabold text-blue-900 flex items-center gap-2">
                    <span>15-Question Skill Calibration</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {Object.keys(testAnswers).length}/15 Answered
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Testing skills: <strong className="text-blue-900">{selectedSkills.slice(0, 5).join(', ')}{selectedSkills.length > 5 ? ` +${selectedSkills.length - 5} more` : ''}</strong>
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[11px] font-bold text-slate-500">Question</span>
                <div className="text-sm font-black text-blue-700">{activeQuestionIdx + 1} / {diagnosticQuestions.length}</div>
              </div>
            </div>

            {/* Quick 1..15 Numbered Pills Navigation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
                <span>Navigate Questions:</span>
                <span>{Math.round((Object.keys(testAnswers).length / diagnosticQuestions.length) * 100)}% Complete</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
                {diagnosticQuestions.map((q, idx) => {
                  const isAnswered = testAnswers[idx] !== undefined;
                  const isCurrent = activeQuestionIdx === idx;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-2 ring-blue-500/40 shadow-sm scale-105'
                          : isAnswered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title={`Question ${idx + 1}: ${q.skill} (${isAnswered ? 'Answered' : 'Unanswered'})`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Question Card */}
            {(() => {
              const currentQ = diagnosticQuestions[activeQuestionIdx] || diagnosticQuestions[0];
              const qIdx = activeQuestionIdx;
              return (
                <div className="p-5 rounded-2xl bg-white border-2 border-blue-100 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
                      Skill Evaluated: {currentQ.skill}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Question {qIdx + 1} of {diagnosticQuestions.length}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {currentQ.question}
                  </p>

                  <div className="space-y-2 pt-1">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = testAnswers[qIdx] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => setTestAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                          className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-3 ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold ring-1 ring-blue-500' 
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                            isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Question Prev / Next Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={activeQuestionIdx === 0}
                      onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white/60"
                    >
                      ← Previous Question
                    </button>
                    <button
                      type="button"
                      disabled={activeQuestionIdx === diagnosticQuestions.length - 1}
                      onClick={() => setActiveQuestionIdx(prev => Math.min(diagnosticQuestions.length - 1, prev + 1))}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-blue-50"
                    >
                      Next Question →
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Skills</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFinalizeIntake(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all"
                >
                  Save & Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalizeIntake(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all hover:scale-105"
                >
                  <Award className="w-4 h-4" />
                  <span>Submit ({Object.keys(testAnswers).length}/15) & Calibrate</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
