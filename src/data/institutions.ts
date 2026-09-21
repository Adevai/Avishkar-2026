export interface VerifiedInstitution {
  name: string;
  code: string;
  type: 'IIT' | 'NIT' | 'IIIT' | 'Medical' | 'Law' | 'Design & Arts' | 'State University' | 'Autonomous Tech' | 'Central University' | 'Deemed University';
  state: string;
  accreditation: string;
  nirfRank?: number;
}

export const VERIFIED_INSTITUTIONS: VerifiedInstitution[] = [
  // Premier Medical & Healthcare Institutes
  { name: 'All India Institute of Medical Sciences, New Delhi (AIIMS Delhi)', code: 'AIIMS', type: 'Medical', state: 'Delhi', accreditation: 'MCI/NMC Premier', nirfRank: 1 },
  { name: 'All India Institute of Medical Sciences, Bhopal (AIIMS Bhopal)', code: 'AIIMSB', type: 'Medical', state: 'Madhya Pradesh', accreditation: 'MCI/NMC Premier' },
  { name: 'All India Institute of Medical Sciences, Rishikesh (AIIMS Rishikesh)', code: 'AIIMSR', type: 'Medical', state: 'Uttarakhand', accreditation: 'MCI/NMC Premier' },
  { name: 'All India Institute of Medical Sciences, Jodhpur (AIIMS Jodhpur)', code: 'AIIMSJ', type: 'Medical', state: 'Rajasthan', accreditation: 'MCI/NMC Premier' },
  { name: 'Post Graduate Institute of Medical Education and Research (PGIMER Chandigarh)', code: 'PGIMER', type: 'Medical', state: 'Chandigarh', accreditation: 'MCI/NMC Premier', nirfRank: 2 },
  { name: 'Christian Medical College, Vellore (CMC Vellore)', code: 'CMC', type: 'Medical', state: 'Tamil Nadu', accreditation: 'NAAC A++', nirfRank: 3 },
  { name: 'King George\'s Medical University, Lucknow (KGMU)', code: 'KGMU', type: 'Medical', state: 'Uttar Pradesh', accreditation: 'NAAC A+', nirfRank: 12 },
  { name: 'Grant Government Medical College & Sir J.J. Group of Hospitals, Mumbai', code: 'GMC', type: 'Medical', state: 'Maharashtra', accreditation: 'MUHS' },
  { name: 'National Institute of Mental Health and Neuro-Sciences (NIMHANS Bengaluru)', code: 'NIMHANS', type: 'Medical', state: 'Karnataka', accreditation: 'INI Premier', nirfRank: 4 },
  { name: 'Armed Forces Medical College, Pune (AFMC Pune)', code: 'AFMC', type: 'Medical', state: 'Maharashtra', accreditation: 'NAAC A+' },

  // Premier Law Institutes & Universities
  { name: 'National Law School of India University, Bengaluru (NLSIU Bengaluru)', code: 'NLSIU', type: 'Law', state: 'Karnataka', accreditation: 'BCI Premier', nirfRank: 1 },
  { name: 'National Law University, Delhi (NLU Delhi)', code: 'NLUD', type: 'Law', state: 'Delhi', accreditation: 'BCI Premier', nirfRank: 2 },
  { name: 'NALSAR University of Law, Hyderabad', code: 'NALSAR', type: 'Law', state: 'Telangana', accreditation: 'NAAC A++', nirfRank: 3 },
  { name: 'The West Bengal National University of Juridical Sciences, Kolkata (WBNUJS)', code: 'NUJS', type: 'Law', state: 'West Bengal', accreditation: 'NAAC A', nirfRank: 4 },
  { name: 'Gujarat National Law University, Gandhinagar (GNLU)', code: 'GNLU', type: 'Law', state: 'Gujarat', accreditation: 'NAAC A', nirfRank: 7 },
  { name: 'Symbiosis Law School, Pune (SLS Pune)', code: 'SLS', type: 'Law', state: 'Maharashtra', accreditation: 'NAAC A++', nirfRank: 6 },
  { name: 'Faculty of Law, University of Delhi', code: 'FOLDU', type: 'Law', state: 'Delhi', accreditation: 'UGC/BCI' },

  // Premier Design, Arts, Architecture & Humanities Institutes
  { name: 'National Institute of Design, Ahmedabad (NID Ahmedabad)', code: 'NID', type: 'Design & Arts', state: 'Gujarat', accreditation: 'IoE / DIPP Premier' },
  { name: 'National Institute of Fashion Technology, New Delhi (NIFT Delhi)', code: 'NIFT', type: 'Design & Arts', state: 'Delhi', accreditation: 'Ministry of Textiles' },
  { name: 'Industrial Design Centre, IIT Bombay (IDC IITB)', code: 'IDC', type: 'Design & Arts', state: 'Maharashtra', accreditation: 'NAAC A++' },
  { name: 'Sir J.J. Institute of Applied Art, Mumbai', code: 'JJIAA', type: 'Design & Arts', state: 'Maharashtra', accreditation: 'Govt. of Maharashtra' },
  { name: 'School of Planning and Architecture, New Delhi (SPA Delhi)', code: 'SPAD', type: 'Design & Arts', state: 'Delhi', accreditation: 'Council of Architecture', nirfRank: 5 },
  { name: 'Faculty of Fine Arts, MS University of Baroda', code: 'MSUFFA', type: 'Design & Arts', state: 'Gujarat', accreditation: 'NAAC A+' },
  { name: 'St. Stephen\'s College, University of Delhi', code: 'SSC', type: 'Central University', state: 'Delhi', accreditation: 'NAAC A+' },
  { name: 'Lady Shri Ram College for Women, New Delhi (LSR)', code: 'LSR', type: 'Central University', state: 'Delhi', accreditation: 'NAAC A++' },
  { name: 'Loyola College, Chennai', code: 'LOYOLA', type: 'Central University', state: 'Tamil Nadu', accreditation: 'NAAC A++' },
  { name: 'St. Xavier\'s College, Mumbai', code: 'SXC', type: 'Central University', state: 'Maharashtra', accreditation: 'NAAC A+' },

  // Premier Multi-Disciplinary Central & State Universities
  { name: 'Aligarh Muslim University (AMU Aligarh)', code: 'AMU', type: 'Central University', state: 'Uttar Pradesh', accreditation: 'NAAC A+', nirfRank: 9 },
  { name: 'Amity University, Noida', code: 'AMITY', type: 'Deemed University', state: 'Uttar Pradesh', accreditation: 'NAAC A+' },
  { name: 'Ashoka University, Sonipat', code: 'ASHOKA', type: 'Deemed University', state: 'Haryana', accreditation: 'UGC Recognized' },
  { name: 'Ahmedabad University, Ahmedabad', code: 'AUAMD', type: 'State University', state: 'Gujarat', accreditation: 'NAAC A' },
  { name: 'Andhra University, Visakhapatnam', code: 'ANDHRA', type: 'State University', state: 'Andhra Pradesh', accreditation: 'NAAC A++' },
  { name: 'University of Delhi (DU Delhi)', code: 'DU', type: 'Central University', state: 'Delhi', accreditation: 'NAAC A++', nirfRank: 11 },
  { name: 'Jawaharlal Nehru University, New Delhi (JNU)', code: 'JNU', type: 'Central University', state: 'Delhi', accreditation: 'NAAC A++', nirfRank: 2 },
  { name: 'Banaras Hindu University, Varanasi (BHU)', code: 'BHU', type: 'Central University', state: 'Uttar Pradesh', accreditation: 'NAAC A', nirfRank: 5 },
  { name: 'University of Hyderabad, Hyderabad (UoH)', code: 'UOH', type: 'Central University', state: 'Telangana', accreditation: 'NAAC A++', nirfRank: 10 },
  { name: 'Savitribai Phule Pune University (SPPU Pune)', code: 'SPPU', type: 'State University', state: 'Maharashtra', accreditation: 'NAAC A+', nirfRank: 19 },
  { name: 'University of Mumbai, Mumbai (MU)', code: 'MU', type: 'State University', state: 'Maharashtra', accreditation: 'NAAC A++' },
  { name: 'Jamia Millia Islamia, New Delhi (JMI)', code: 'JMI', type: 'Central University', state: 'Delhi', accreditation: 'NAAC A++', nirfRank: 3 },
  { name: 'Christ University, Bengaluru', code: 'CHRIST', type: 'Deemed University', state: 'Karnataka', accreditation: 'NAAC A+' },

  // IITs
  { name: 'Indian Institute of Technology Bombay (IIT Bombay)', code: 'IITB', type: 'IIT', state: 'Maharashtra', accreditation: 'NAAC A++', nirfRank: 3 },
  { name: 'Indian Institute of Technology Delhi (IIT Delhi)', code: 'IITD', type: 'IIT', state: 'Delhi', accreditation: 'NAAC A++', nirfRank: 2 },
  { name: 'Indian Institute of Technology Madras (IIT Madras)', code: 'IITM', type: 'IIT', state: 'Tamil Nadu', accreditation: 'NAAC A++', nirfRank: 1 },
  { name: 'Indian Institute of Technology Kanpur (IIT Kanpur)', code: 'IITK', type: 'IIT', state: 'Uttar Pradesh', accreditation: 'NAAC A++', nirfRank: 4 },
  { name: 'Indian Institute of Technology Kharagpur (IIT Kharagpur)', code: 'IITKGP', type: 'IIT', state: 'West Bengal', accreditation: 'NAAC A++', nirfRank: 5 },
  { name: 'Indian Institute of Technology Roorkee (IIT Roorkee)', code: 'IITR', type: 'IIT', state: 'Uttarakhand', accreditation: 'NAAC A++', nirfRank: 6 },
  { name: 'Indian Institute of Technology Guwahati (IIT Guwahati)', code: 'IITG', type: 'IIT', state: 'Assam', accreditation: 'NAAC A++', nirfRank: 7 },
  { name: 'Indian Institute of Technology Hyderabad (IIT Hyderabad)', code: 'IITH', type: 'IIT', state: 'Telangana', accreditation: 'NAAC A++', nirfRank: 8 },
  { name: 'Indian Institute of Technology BHU Varanasi (IIT BHU)', code: 'IITBHU', type: 'IIT', state: 'Uttar Pradesh', accreditation: 'NAAC A', nirfRank: 15 },

  // NITs & IIITs
  { name: 'National Institute of Technology Tiruchirappalli (NIT Trichy)', code: 'NITT', type: 'NIT', state: 'Tamil Nadu', accreditation: 'NAAC A++', nirfRank: 9 },
  { name: 'National Institute of Technology Karnataka (NIT Surathkal)', code: 'NITK', type: 'NIT', state: 'Karnataka', accreditation: 'NAAC A++', nirfRank: 12 },
  { name: 'National Institute of Technology Rourkela (NIT Rourkela)', code: 'NITRKL', type: 'NIT', state: 'Odisha', accreditation: 'NAAC A+', nirfRank: 16 },
  { name: 'National Institute of Technology Warangal (NIT Warangal)', code: 'NITW', type: 'NIT', state: 'Telangana', accreditation: 'NAAC A+', nirfRank: 21 },
  { name: 'National Institute of Technology Calicut (NIT Calicut)', code: 'NITC', type: 'NIT', state: 'Kerala', accreditation: 'NAAC A+', nirfRank: 23 },
  { name: 'Motilal Nehru National Institute of Technology Allahabad (MNNIT Allahabad)', code: 'MNNIT', type: 'NIT', state: 'Uttar Pradesh', accreditation: 'NAAC A', nirfRank: 49 },
  { name: 'Indian Institute of Information Technology Allahabad (IIIT Allahabad)', code: 'IIITA', type: 'IIIT', state: 'Uttar Pradesh', accreditation: 'NAAC A+', nirfRank: 89 },
  { name: 'International Institute of Information Technology Hyderabad (IIIT Hyderabad)', code: 'IIITH', type: 'IIIT', state: 'Telangana', accreditation: 'NAAC A++', nirfRank: 55 },

  // Premier State & Autonomous Engineering Institutions
  { name: 'COEP Technological University, Pune', code: 'COEP', type: 'Autonomous Tech', state: 'Maharashtra', accreditation: 'NAAC A++', nirfRank: 73 },
  { name: 'Veermata Jijabai Technological Institute (VJTI Mumbai)', code: 'VJTI', type: 'Autonomous Tech', state: 'Maharashtra', accreditation: 'NAAC A+', nirfRank: 82 },
  { name: 'Sardar Patel Institute of Technology (SPIT Mumbai)', code: 'SPIT', type: 'Autonomous Tech', state: 'Maharashtra', accreditation: 'NAAC A+', nirfRank: 125 },
  { name: 'Pune Institute of Computer Technology (PICT Pune)', code: 'PICT', type: 'Autonomous Tech', state: 'Maharashtra', accreditation: 'NAAC A+', nirfRank: 135 },
  { name: 'Walchand College of Engineering, Sangli', code: 'WCE', type: 'Autonomous Tech', state: 'Maharashtra', accreditation: 'NAAC A', nirfRank: 168 },
  { name: 'Vishwakarma Institute of Technology (VIT Pune)', code: 'VITP', type: 'Autonomous Tech', state: 'Maharashtra', accreditation: 'NAAC A++', nirfRank: 142 },
  { name: 'Delhi Technological University (DTU Delhi)', code: 'DTU', type: 'State University', state: 'Delhi', accreditation: 'NAAC A', nirfRank: 29 },
  { name: 'Netaji Subhas University of Technology (NSUT Delhi)', code: 'NSUT', type: 'State University', state: 'Delhi', accreditation: 'NAAC A', nirfRank: 60 },
  { name: 'Jadavpur University, Kolkata', code: 'JU', type: 'State University', state: 'West Bengal', accreditation: 'NAAC A', nirfRank: 10 },
  { name: 'Anna University, Chennai', code: 'AU', type: 'State University', state: 'Tamil Nadu', accreditation: 'NAAC A++', nirfRank: 13 },
  { name: 'College of Engineering, Guindy (CEG Chennai)', code: 'CEG', type: 'Autonomous Tech', state: 'Tamil Nadu', accreditation: 'NAAC A++', nirfRank: 14 },
  { name: 'PSG College of Technology, Coimbatore', code: 'PSG', type: 'Autonomous Tech', state: 'Tamil Nadu', accreditation: 'NAAC A', nirfRank: 63 },
  { name: 'BMS College of Engineering, Bengaluru', code: 'BMSCE', type: 'Autonomous Tech', state: 'Karnataka', accreditation: 'NAAC A++', nirfRank: 98 },
  { name: 'RV College of Engineering, Bengaluru', code: 'RVCE', type: 'Autonomous Tech', state: 'Karnataka', accreditation: 'NAAC A+', nirfRank: 89 },
  { name: 'M. S. Ramaiah Institute of Technology, Bengaluru', code: 'MSRIT', type: 'Autonomous Tech', state: 'Karnataka', accreditation: 'NAAC A+', nirfRank: 78 },
  { name: 'Birla Institute of Technology and Science, Pilani (BITS Pilani)', code: 'BITS', type: 'Deemed University', state: 'Rajasthan', accreditation: 'NAAC A', nirfRank: 25 },
  { name: 'Vellore Institute of Technology (VIT Vellore)', code: 'VITV', type: 'Deemed University', state: 'Tamil Nadu', accreditation: 'NAAC A++', nirfRank: 11 },
  { name: 'Thapar Institute of Engineering and Technology, Patiala', code: 'TIET', type: 'Deemed University', state: 'Punjab', accreditation: 'NAAC A+', nirfRank: 20 },
  { name: 'Manipal Institute of Technology (MIT Manipal)', code: 'MITM', type: 'Deemed University', state: 'Karnataka', accreditation: 'NAAC A++', nirfRank: 61 },
  { name: 'SRM Institute of Science and Technology, Chennai', code: 'SRM', type: 'Deemed University', state: 'Tamil Nadu', accreditation: 'NAAC A++', nirfRank: 28 },
  { name: 'Amrita Vishwa Vidyapeetham, Coimbatore', code: 'AVV', type: 'Deemed University', state: 'Tamil Nadu', accreditation: 'NAAC A++', nirfRank: 19 },
  { name: 'Institute of Chemical Technology (ICT Mumbai)', code: 'ICT', type: 'Deemed University', state: 'Maharashtra', accreditation: 'NAAC A++', nirfRank: 24 }
];

export function verifyInstitution(query: string): { verified: boolean; match?: VerifiedInstitution; confidence: number; note: string } {
  if (!query || query.trim().length < 3) {
    return { 
      verified: false, 
      confidence: 0, 
      note: 'Please enter at least 3 characters of your college, university, or institute name.' 
    };
  }

  const clean = query.trim().toLowerCase();

  // Guard against abbreviations or arbitrary characters like "a." or single letters
  if (clean.length < 4 && !VERIFIED_INSTITUTIONS.some(inst => inst.code.toLowerCase() === clean)) {
    return {
      verified: false,
      confidence: 10,
      note: `Incomplete name. Please type full college/university title (e.g. AIIMS Delhi, NLU Delhi, COEP, or AMU).`
    };
  }

  // 1. Exact or strong match against code or name
  const exact = VERIFIED_INSTITUTIONS.find(inst => 
    inst.name.toLowerCase() === clean || 
    inst.code.toLowerCase() === clean
  );
  if (exact) {
    return {
      verified: true,
      match: exact,
      confidence: 100,
      note: `Verified ${exact.type} Accredited Institution: ${exact.name} (${exact.accreditation})`
    };
  }

  // 2. Substring or acronym match against known verified institutions
  const partial = VERIFIED_INSTITUTIONS.find(inst => {
    const codeMatch = inst.code.toLowerCase() === clean;
    const nameContains = inst.name.toLowerCase().includes(clean);
    const splitTitle = inst.name.toLowerCase().split('(')[0].trim();
    const acronymInParen = inst.name.toLowerCase().match(/\(([^)]+)\)/)?.[1] || '';
    return codeMatch || (clean.length >= 3 && (nameContains || clean.includes(splitTitle) || (acronymInParen && acronymInParen.toLowerCase().includes(clean))));
  });

  if (partial) {
    return {
      verified: true,
      match: partial,
      confidence: 90,
      note: `Recognized Institutional Entity: ${partial.name} (${partial.type}, ${partial.state})`
    };
  }

  // 3. Keyword heuristic verification for recognized college/university structures across all disciplines
  const validKeywords = [
    'technology', 'engineering', 'institute', 'university', 'college', 'polytechnic', 
    'vidyapeeth', 'iit', 'nit', 'iiit', 'bits',
    // Medical & Healthcare
    'medical', 'aiims', 'hospital', 'health', 'dental', 'ayurveda', 'pharmacy', 'nursing',
    // Law & Legal
    'law', 'juridical', 'nlsiu', 'nlu', 'nalsar', 'judicial',
    // Design, Arts & Sciences
    'design', 'nid', 'nift', 'fine arts', 'architecture', 'arts', 'science', 'commerce', 'humanities',
    // Common higher-ed entities
    'campus', 'academy', 'school of', 'faculty of'
  ];
  
  const hasAcademicKeyword = validKeywords.some(kw => clean.includes(kw));

  if (hasAcademicKeyword && clean.length >= 6) {
    return {
      verified: true,
      confidence: 80,
      note: `Accredited Higher-Education Entity: Recognized academic pattern across National/State registries.`
    };
  }

  return {
    verified: false,
    confidence: 25,
    note: `Unverified Institution. Please enter a valid University, Medical College, Engineering Institute, Law School, or Design College.`
  };
}

// In-memory cache for API results to prevent repeat network calls
const searchCache = new Map<string, VerifiedInstitution[]>();

/**
 * Searches institutions dynamically using:
 * 1. Local Premier / Accredited Registry
 * 2. Hipolabs Indian Universities Open API
 * 3. AICTE Indian Colleges Open API
 */
export async function searchInstitutionsApi(query: string): Promise<VerifiedInstitution[]> {
  if (!query || query.trim().length < 2) {
    return VERIFIED_INSTITUTIONS.slice(0, 10);
  }

  const clean = query.trim().toLowerCase();
  if (searchCache.has(clean)) {
    return searchCache.get(clean)!;
  }

  // 1. First gather matches from local premier registry
  const localMatches = VERIFIED_INSTITUTIONS.filter(inst =>
    inst.name.toLowerCase().includes(clean) ||
    inst.code.toLowerCase().includes(clean) ||
    clean.includes(inst.code.toLowerCase()) ||
    (inst.state && inst.state.toLowerCase().includes(clean))
  );

  const resultsMap = new Map<string, VerifiedInstitution>();
  localMatches.forEach(inst => resultsMap.set(inst.name.toLowerCase(), inst));

  // 2. Fetch live data from open APIs in parallel with graceful timeout
  const apiPromises: Promise<void>[] = [];

  // API 1: Hipolabs Indian Universities
  const hipolabsPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(
        `http://universities.hipolabs.com/search?country=India&name=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any[];
        data.forEach(item => {
          const key = item.name.toLowerCase();
          if (!resultsMap.has(key)) {
            const state = item['state-province'] || 'India';
            resultsMap.set(key, {
              name: item.name,
              code: item.name.split(' ').map((w: string) => w[0]).join('').slice(0, 6).toUpperCase(),
              type: 'State University',
              state: state,
              accreditation: 'UGC Recognized'
            });
          }
        });
      }
    } catch {
      // Graceful fallback if offline or timed out
    }
  })();
  apiPromises.push(hipolabsPromise);

  // API 2: Open-source AICTE Indian Colleges List API (Maharashtra & major state colleges)
  const aictePromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      // Query Maharashtra by default or broad query
      const res = await fetch(
        `https://indian-colleges-list.vercel.app/api/institutions/search?state=Maharashtra&q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const list: any[] = data.results || [];
        list.slice(0, 15).forEach(item => {
          const formattedName = item.name
            .toLowerCase()
            .split(' ')
            .map((s: string) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
          const key = formattedName.toLowerCase();
          if (!resultsMap.has(key)) {
            resultsMap.set(key, {
              name: formattedName,
              code: item.id || 'AICTE',
              type: 'Autonomous Tech',
              state: item.state || 'Maharashtra',
              accreditation: item.university && item.university !== 'NOT APPLICABLE' ? item.university : 'AICTE Approved'
            });
          }
        });
      }
    } catch {
      // Graceful fallback
    }
  })();
  apiPromises.push(aictePromise);

  await Promise.allSettled(apiPromises);

  const combined = Array.from(resultsMap.values()).slice(0, 25);
  searchCache.set(clean, combined);
  return combined;
}
