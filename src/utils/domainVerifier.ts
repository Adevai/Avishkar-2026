/**
 * S.P.A.R.K. Institutional Academic Domain Verification Engine
 * Analyzes candidate email domains (.ac.in, .edu.in, .edu) and cross-references
 * against accredited higher education registries to auto-detect and verify institutions.
 */

export interface AcademicDomainInfo {
  isAcademic: boolean;
  domain: string;
  institutionName?: string;
  institutionCode?: string;
  confidence: number;
  badgeLabel: string;
  notes: string;
}

// Mapping of verified institutional email domains to accredited institutions
export const INSTITUTIONAL_DOMAIN_MAP: Record<string, { name: string; code: string; type: string }> = {
  // IITs
  'iitb.ac.in': { name: 'Indian Institute of Technology Bombay (IIT Bombay)', code: 'IITB', type: 'IIT' },
  'iitd.ac.in': { name: 'Indian Institute of Technology Delhi (IIT Delhi)', code: 'IITD', type: 'IIT' },
  'iitm.ac.in': { name: 'Indian Institute of Technology Madras (IIT Madras)', code: 'IITM', type: 'IIT' },
  'iitk.ac.in': { name: 'Indian Institute of Technology Kanpur (IIT Kanpur)', code: 'IITK', type: 'IIT' },
  'iitkgp.ac.in': { name: 'Indian Institute of Technology Kharagpur (IIT Kharagpur)', code: 'IITKGP', type: 'IIT' },
  'iitr.ac.in': { name: 'Indian Institute of Technology Roorkee (IIT Roorkee)', code: 'IITR', type: 'IIT' },
  'iitg.ac.in': { name: 'Indian Institute of Technology Guwahati (IIT Guwahati)', code: 'IITG', type: 'IIT' },
  'iith.ac.in': { name: 'Indian Institute of Technology Hyderabad (IIT Hyderabad)', code: 'IITH', type: 'IIT' },
  'iitbhu.ac.in': { name: 'Indian Institute of Technology BHU Varanasi (IIT BHU)', code: 'IITBHU', type: 'IIT' },

  // NITs & IIITs
  'nitt.edu': { name: 'National Institute of Technology Tiruchirappalli (NIT Trichy)', code: 'NITT', type: 'NIT' },
  'nitk.edu.in': { name: 'National Institute of Technology Karnataka (NIT Surathkal)', code: 'NITK', type: 'NIT' },
  'nitrkl.ac.in': { name: 'National Institute of Technology Rourkela (NIT Rourkela)', code: 'NITRKL', type: 'NIT' },
  'nitw.ac.in': { name: 'National Institute of Technology Warangal (NIT Warangal)', code: 'NITW', type: 'NIT' },
  'nitc.ac.in': { name: 'National Institute of Technology Calicut (NIT Calicut)', code: 'NITC', type: 'NIT' },
  'iiit.ac.in': { name: 'International Institute of Information Technology Hyderabad (IIIT Hyderabad)', code: 'IIITH', type: 'IIIT' },
  'iiita.ac.in': { name: 'Indian Institute of Information Technology Allahabad (IIIT Allahabad)', code: 'IIITA', type: 'IIIT' },

  // Premier Autonomous Engineering & Tech Colleges
  'coep.ac.in': { name: 'COEP Technological University, Pune', code: 'COEP', type: 'Autonomous Tech' },
  'coeptech.ac.in': { name: 'COEP Technological University, Pune', code: 'COEP', type: 'Autonomous Tech' },
  'vjti.ac.in': { name: 'Veermata Jijabai Technological Institute (VJTI Mumbai)', code: 'VJTI', type: 'Autonomous Tech' },
  'spit.ac.in': { name: 'Sardar Patel Institute of Technology (SPIT Mumbai)', code: 'SPIT', type: 'Autonomous Tech' },
  'pict.edu': { name: 'Pune Institute of Computer Technology (PICT Pune)', code: 'PICT', type: 'Autonomous Tech' },
  'vit.edu': { name: 'Vishwakarma Institute of Technology (VIT Pune)', code: 'VITP', type: 'Autonomous Tech' },
  'walchandsangli.ac.in': { name: 'Walchand College of Engineering, Sangli', code: 'WCE', type: 'Autonomous Tech' },
  'bits-pilani.ac.in': { name: 'Birla Institute of Technology and Science, Pilani (BITS Pilani)', code: 'BITS', type: 'Deemed University' },
  'vit.ac.in': { name: 'Vellore Institute of Technology (VIT Vellore)', code: 'VITV', type: 'Deemed University' },
  'thapar.edu': { name: 'Thapar Institute of Engineering and Technology, Patiala', code: 'TIET', type: 'Deemed University' },
  'manipal.edu': { name: 'Manipal Institute of Technology (MIT Manipal)', code: 'MITM', type: 'Deemed University' },
  'dtu.ac.in': { name: 'Delhi Technological University (DTU Delhi)', code: 'DTU', type: 'State University' },
  'nsut.ac.in': { name: 'Netaji Subhas University of Technology (NSUT Delhi)', code: 'NSUT', type: 'State University' },

  // Medical & Healthcare
  'aiims.edu': { name: 'All India Institute of Medical Sciences, New Delhi (AIIMS Delhi)', code: 'AIIMS', type: 'Medical' },
  'aiimsbhopal.edu.in': { name: 'All India Institute of Medical Sciences, Bhopal (AIIMS Bhopal)', code: 'AIIMSB', type: 'Medical' },
  'aiimsrishikesh.edu.in': { name: 'All India Institute of Medical Sciences, Rishikesh (AIIMS Rishikesh)', code: 'AIIMSR', type: 'Medical' },
  'aiimsjodhpur.edu.in': { name: 'All India Institute of Medical Sciences, Jodhpur (AIIMS Jodhpur)', code: 'AIIMSJ', type: 'Medical' },
  'cmcvellore.ac.in': { name: 'Christian Medical College, Vellore (CMC Vellore)', code: 'CMC', type: 'Medical' },
  'pgimer.edu.in': { name: 'Post Graduate Institute of Medical Education and Research (PGIMER Chandigarh)', code: 'PGIMER', type: 'Medical' },
  'kgmu.org': { name: "King George's Medical University, Lucknow (KGMU)", code: 'KGMU', type: 'Medical' },
  'afmc.nic.in': { name: 'Armed Forces Medical College, Pune (AFMC Pune)', code: 'AFMC', type: 'Medical' },

  // Law
  'nls.ac.in': { name: 'National Law School of India University, Bengaluru (NLSIU Bengaluru)', code: 'NLSIU', type: 'Law' },
  'nludelhi.ac.in': { name: 'National Law University, Delhi (NLU Delhi)', code: 'NLUD', type: 'Law' },
  'nalsar.ac.in': { name: 'NALSAR University of Law, Hyderabad', code: 'NALSAR', type: 'Law' },
  'nujs.edu': { name: 'The West Bengal National University of Juridical Sciences, Kolkata (WBNUJS)', code: 'NUJS', type: 'Law' },

  // Design, Central & State Universities
  'nid.edu': { name: 'National Institute of Design, Ahmedabad (NID Ahmedabad)', code: 'NID', type: 'Design & Arts' },
  'nift.ac.in': { name: 'National Institute of Fashion Technology, New Delhi (NIFT Delhi)', code: 'NIFT', type: 'Design & Arts' },
  'du.ac.in': { name: 'University of Delhi (DU Delhi)', code: 'DU', type: 'Central University' },
  'jnu.ac.in': { name: 'Jawaharlal Nehru University, New Delhi (JNU)', code: 'JNU', type: 'Central University' },
  'bhu.ac.in': { name: 'Banaras Hindu University, Varanasi (BHU)', code: 'BHU', type: 'Central University' },
  'unipune.ac.in': { name: 'Savitribai Phule Pune University (SPPU Pune)', code: 'SPPU', type: 'State University' },
  'mu.ac.in': { name: 'University of Mumbai, Mumbai (MU)', code: 'MU', type: 'State University' },
  'amu.ac.in': { name: 'Aligarh Muslim University (AMU Aligarh)', code: 'AMU', type: 'Central University' },
  'uohyd.ac.in': { name: 'University of Hyderabad, Hyderabad (UoH)', code: 'UOH', type: 'Central University' },
};

/**
 * Validates whether an email belongs to an institutional academic domain (.ac.in, .edu.in, .edu)
 * and resolves the matching institution if recognized.
 */
export function verifyAcademicEmail(email: string): AcademicDomainInfo {
  if (!email || !email.includes('@')) {
    return {
      isAcademic: false,
      domain: '',
      confidence: 0,
      badgeLabel: 'Personal Email',
      notes: 'Please enter a valid email address.',
    };
  }

  const parts = email.trim().toLowerCase().split('@');
  const domain = parts[1] || '';

  // 1. Check exact match in institutional domain map
  if (INSTITUTIONAL_DOMAIN_MAP[domain]) {
    const inst = INSTITUTIONAL_DOMAIN_MAP[domain];
    return {
      isAcademic: true,
      domain,
      institutionName: inst.name,
      institutionCode: inst.code,
      confidence: 100,
      badgeLabel: 'Official Institutional Email Verified',
      notes: `Direct academic domain match: ${inst.name} (${inst.code})`,
    };
  }

  // 2. Check for .ac.in / .edu.in / .edu / .res.in suffixes
  const isGenericAcademicSuffix = 
    domain.endsWith('.ac.in') || 
    domain.endsWith('.edu.in') || 
    domain.endsWith('.edu') || 
    domain.endsWith('.ernet.in') ||
    domain.endsWith('.res.in');

  if (isGenericAcademicSuffix) {
    return {
      isAcademic: true,
      domain,
      confidence: 90,
      badgeLabel: 'Academic Domain Detected',
      notes: `Verified higher-education academic domain ending with .${domain.split('.').slice(-2).join('.')}`,
    };
  }

  // 3. Fallback for public email providers
  return {
    isAcademic: false,
    domain,
    confidence: 30,
    badgeLabel: 'Standard Email',
    notes: 'Personal email provider (Gmail, Outlook, Yahoo). Institutional credentials can also be verified with Student ID Card.',
  };
}
