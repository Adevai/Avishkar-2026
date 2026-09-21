export interface AcademicDegree {
  id: string;
  name: string;
  durationYears: number;
}

export interface AcademicStream {
  id: string;
  name: string;
  badge: string;
  degrees: AcademicDegree[];
  branches: string[];
}

export const ACADEMIC_STREAMS: AcademicStream[] = [
  {
    id: 'eng_tech',
    name: 'Engineering & Technology',
    badge: 'AICTE / NBA',
    degrees: [
      { id: 'btech', name: 'B.Tech (Bachelor of Technology)', durationYears: 4 },
      { id: 'be', name: 'B.E. (Bachelor of Engineering)', durationYears: 4 },
      { id: 'mtech', name: 'M.Tech (Master of Technology)', durationYears: 2 },
      { id: 'me', name: 'M.E. (Master of Engineering)', durationYears: 2 },
      { id: 'bca', name: 'BCA (Bachelor of Computer Applications)', durationYears: 3 },
      { id: 'mca', name: 'MCA (Master of Computer Applications)', durationYears: 2 },
      { id: 'poly_dip', name: 'Diploma in Engineering (Polytechnic)', durationYears: 3 },
    ],
    branches: [
      'Computer Science & Engineering',
      'Information Technology',
      'Artificial Intelligence & Data Science',
      'Cybersecurity & Network Defense',
      'Mechanical Engineering',
      'Civil & Structural Engineering',
      'Electrical & Electronics Engineering',
      'Electronics & Telecommunication',
      'Robotics & Automation',
      'Aerospace Engineering',
      'Chemical Engineering',
      'Biotechnology & Bio-Engineering',
      'Instrumentation & Control Engineering',
      'Other / Specialized Engineering Discipline'
    ]
  },
  {
    id: 'med_health',
    name: 'Medical & Healthcare Sciences',
    badge: 'NMC / DCI / PCI',
    degrees: [
      { id: 'mbbs', name: 'MBBS (Bachelor of Medicine & Surgery)', durationYears: 5.5 },
      { id: 'bds', name: 'BDS (Bachelor of Dental Surgery)', durationYears: 5 },
      { id: 'bams', name: 'BAMS (Ayurvedic Medicine & Surgery)', durationYears: 5.5 },
      { id: 'bhms', name: 'BHMS (Homeopathic Medicine)', durationYears: 5.5 },
      { id: 'bpharm', name: 'B.Pharm (Bachelor of Pharmacy)', durationYears: 4 },
      { id: 'mpharm', name: 'M.Pharm (Master of Pharmacy)', durationYears: 2 },
      { id: 'bsc_nurs', name: 'B.Sc Nursing / Allied Health', durationYears: 4 },
      { id: 'md_ms', name: 'MD / MS (Clinical Post-Graduate)', durationYears: 3 },
      { id: 'bpt', name: 'BPT (Physiotherapy)', durationYears: 4.5 }
    ],
    branches: [
      'General Medicine & Surgery',
      'Clinical Pharmacology & Therapeutics',
      'Dental Surgery & Orthodontics',
      'Public Health & Epidemiology',
      'Medical Laboratory Technology',
      'Biomedical Science & Genetics',
      'Ayurvedic & Alternative Medicine',
      'Cardiology & Critical Care',
      'Radiology & Medical Imaging',
      'Other / Specialized Clinical Healthcare'
    ]
  },
  {
    id: 'law_legal',
    name: 'Law & Legal Studies',
    badge: 'Bar Council of India',
    degrees: [
      { id: 'ba_llb', name: 'B.A. LL.B (5-Year Integrated)', durationYears: 5 },
      { id: 'bba_llb', name: 'B.B.A. LL.B (5-Year Integrated)', durationYears: 5 },
      { id: 'bsc_llb', name: 'B.Sc LL.B (5-Year Integrated IPR/Tech)', durationYears: 5 },
      { id: 'llb', name: 'LL.B (3-Year Professional)', durationYears: 3 },
      { id: 'llm', name: 'LL.M (Master of Laws)', durationYears: 1 }
    ],
    branches: [
      'Corporate & Commercial Law',
      'Intellectual Property Rights (IPR) & Patent Law',
      'Cyber Law & Data Privacy Regulation',
      'Constitutional & Administrative Law',
      'Criminal Law & Forensic Criminology',
      'International Commercial Arbitration & Trade',
      'Taxation & Financial Regulatory Law',
      'Other / Specialized Legal Practice'
    ]
  },
  {
    id: 'mgmt_comm',
    name: 'Commerce, Finance & Management',
    badge: 'UGC / AICTE',
    degrees: [
      { id: 'bba', name: 'BBA (Bachelor of Business Administration)', durationYears: 3 },
      { id: 'bcom', name: 'B.Com (Bachelor of Commerce)', durationYears: 3 },
      { id: 'bcom_hons', name: 'B.Com (Hons.) in Accounting & Finance', durationYears: 3 },
      { id: 'mba', name: 'MBA (Master of Business Administration)', durationYears: 2 },
      { id: 'mcom', name: 'M.Com (Master of Commerce)', durationYears: 2 },
      { id: 'pgdm', name: 'PGDM (Post Graduate Diploma in Management)', durationYears: 2 }
    ],
    branches: [
      'Financial Management & Investment Banking',
      'FinTech & Quantitative Risk Analysis',
      'Marketing & Brand Strategy',
      'Operations & Supply Chain Logistics',
      'Human Resource & Organizational Behavior',
      'Business Analytics & Business Intelligence',
      'Corporate Accounting & Auditing',
      'Other / Specialized Business Management'
    ]
  },
  {
    id: 'arts_des',
    name: 'Arts, Design, Humanities & Media',
    badge: 'UGC / IoE',
    degrees: [
      { id: 'bdes', name: 'B.Des (Bachelor of Design)', durationYears: 4 },
      { id: 'mdes', name: 'M.Des (Master of Design)', durationYears: 2 },
      { id: 'barch', name: 'B.Arch (Bachelor of Architecture)', durationYears: 5 },
      { id: 'ba', name: 'B.A. (Bachelor of Arts)', durationYears: 3 },
      { id: 'ma', name: 'M.A. (Master of Arts)', durationYears: 2 },
      { id: 'bjmc', name: 'B.J.M.C. (Journalism & Mass Media)', durationYears: 3 }
    ],
    branches: [
      'UI/UX & Interactive Product Design',
      'Industrial & Ergonomic Product Design',
      'Visual Communication & Graphic Design',
      'Urban Infrastructure & Architecture',
      'Economics & Public Policy Analysis',
      'Journalism, Mass Media & Content Strategy',
      'English Literature & Linguistics',
      'Psychology & Behavioral Studies',
      'Other / Specialized Creative & Humanities'
    ]
  },
  {
    id: 'pure_sci',
    name: 'Pure & Applied Sciences',
    badge: 'UGC / DST',
    degrees: [
      { id: 'bsc', name: 'B.Sc (Bachelor of Science)', durationYears: 3 },
      { id: 'msc', name: 'M.Sc (Master of Science)', durationYears: 2 },
      { id: 'bs_ms', name: 'BS-MS Dual Degree (IISER/NISER)', durationYears: 5 }
    ],
    branches: [
      'Physics & Astrophysics',
      'Applied Chemistry & Material Sciences',
      'Pure & Applied Mathematics',
      'Statistics & Actuarial Data Science',
      'Environmental Sciences & Ecology',
      'Microbiology & Biochemistry',
      'Other / Specialized Scientific Discipline'
    ]
  }
];

/**
 * Finds the corresponding stream for a given degree or branch string,
 * ensuring backwards compatibility with existing profiles.
 */
export function inferStreamFromDegreeOrBranch(degreeStr: string, branchStr: string): AcademicStream {
  const d = (degreeStr || '').toLowerCase();
  const b = (branchStr || '').toLowerCase();

  // Law
  if (d.includes('law') || d.includes('ll.b') || d.includes('llm') || b.includes('law') || b.includes('legal') || b.includes('patent')) {
    return ACADEMIC_STREAMS.find(s => s.id === 'law_legal')!;
  }
  // Medical
  if (d.includes('mbbs') || d.includes('bds') || d.includes('pharm') || d.includes('nurs') || d.includes('bams') || d.includes('bhms') || b.includes('medicine') || b.includes('pharmac') || b.includes('clinical')) {
    return ACADEMIC_STREAMS.find(s => s.id === 'med_health')!;
  }
  // Management / Commerce
  if (d.includes('bba') || d.includes('mba') || d.includes('b.com') || d.includes('m.com') || d.includes('pgdm') || b.includes('finance') || b.includes('marketing') || b.includes('accounting')) {
    return ACADEMIC_STREAMS.find(s => s.id === 'mgmt_comm')!;
  }
  // Arts / Design
  if (d.includes('b.des') || d.includes('m.des') || d.includes('arch') || d.includes('b.a.') || d.includes('m.a.') || b.includes('design') || b.includes('ui/ux') || b.includes('media')) {
    return ACADEMIC_STREAMS.find(s => s.id === 'arts_des')!;
  }
  // Pure Science
  if ((d.includes('b.sc') && !d.includes('cs') && !d.includes('it')) || d.includes('m.sc') || b.includes('physics') || b.includes('chemistry') || b.includes('mathematics')) {
    return ACADEMIC_STREAMS.find(s => s.id === 'pure_sci')!;
  }

  // Default to Engineering & Technology
  return ACADEMIC_STREAMS[0];
}
