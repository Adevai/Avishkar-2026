import { VERIFIED_INSTITUTIONS, VerifiedInstitution } from '../src/data/institutions';

/**
 * Server-side institution verification.
 *
 * Cross-checks a college/university name against the curated registry of
 * accredited Indian institutions (IITs, NITs, IIITs, AIIMS, NLUs, top state
 * and deemed universities). Used by:
 *  - POST /api/verify/institution  (registration flow)
 *  - ID-card OCR cross-validation  (optical extraction confidence boost)
 */

export type VerificationLevel = 'verified' | 'recognized' | 'unverified';

export interface InstitutionVerification {
  verified: boolean;
  level: VerificationLevel;
  confidence: number;          // 0-100
  matchedName?: string;
  matchedCode?: string;
  matchedType?: string;
  matchedState?: string;
  accreditation?: string;
  nirfRank?: number;
  note: string;
}

/** Normalize a name for comparison: lowercase, strip punctuation & common suffixes. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(([^)]+)\)/g, ' ')          // drop parenthetical acronyms for body match
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract the parenthetical acronym from a registry name, e.g. "(IIT Bombay)" -> "IITB". */
function acronymsOf(registryName: string): string[] {
  const paren = registryName.match(/\(([^)]+)\)/)?.[1] || '';
  return paren
    .split(/[,/]/)
    .map(a => a.trim().toLowerCase())
    .filter(Boolean);
}

/** Token set overlap score (Jaccard) between two normalized names. */
function jaccard(a: string, b: string): number {
  // Require at least two informative tokens so a single shared word (e.g. "university")
  // can't score 1.0 against every registry name containing it.
  const A = new Set(a.split(' ').filter(w => w.length > 2));
  const B = new Set(b.split(' ').filter(w => w.length > 2));
  if (A.size < 2 || B.size < 2) return 0;
  let inter = 0;
  A.forEach(w => { if (B.has(w)) inter++; });
  return inter / (A.size + B.size - inter);
}

/**
 * Verify an institution name against the accredited registry.
 * Returns a graded result: exact/acronym match → verified (95-100),
 * strong fuzzy match → recognized (75-94), otherwise unverified.
 */
export function verifyInstitutionServer(query: string): InstitutionVerification {
  const clean = (query || '').trim();
  const norm = normalizeName(clean);

  if (clean.length < 3) {
    return {
      verified: false,
      level: 'unverified',
      confidence: 0,
      note: 'Enter the full college, university, or institute name.',
    };
  }

  // 1. Exact registry name or code match
  const exact = VERIFIED_INSTITUTIONS.find(
    inst => inst.name.toLowerCase() === clean.toLowerCase() ||
            inst.code.toLowerCase() === clean.toLowerCase()
  );
  if (exact) {
    return {
      verified: true,
      level: 'verified',
      confidence: 100,
      matchedName: exact.name,
      matchedCode: exact.code,
      matchedType: exact.type,
      matchedState: exact.state,
      accreditation: exact.accreditation,
      nirfRank: exact.nirfRank,
      note: `Verified ${exact.type}: ${exact.name} (${exact.accreditation})`,
    };
  }

  // 2. Acronym containment — "iit bombay" input contains registry acronym "iitb"? No —
  //    but "IITB" typed alone, or "(IIT Bombay)" acronym appearing in the input, matches.
  const inputLower = clean.toLowerCase();
  const acronymHit = VERIFIED_INSTITUTIONS.find(inst =>
    acronymsOf(inst.name).some(acr => acr.length >= 3 && new RegExp(`\\b${acr}\\b`, 'i').test(inputLower))
  );
  if (acronymHit) {
    return {
      verified: true,
      level: 'verified',
      confidence: 97,
      matchedName: acronymHit.name,
      matchedCode: acronymHit.code,
      matchedType: acronymHit.type,
      matchedState: acronymHit.state,
      accreditation: acronymHit.accreditation,
      nirfRank: acronymHit.nirfRank,
      note: `Matched accredited institution by acronym: ${acronymHit.name}`,
    };
  }

  // 3. Registry code as substring ("COEP" inside "COEP Technological University Student")
  const codeHit = VERIFIED_INSTITUTIONS.find(
    inst => inst.code.length >= 3 && norm.includes(inst.code.toLowerCase())
  );
  if (codeHit) {
    return {
      verified: true,
      level: 'verified',
      confidence: 95,
      matchedName: codeHit.name,
      matchedCode: codeHit.code,
      matchedType: codeHit.type,
      matchedState: codeHit.state,
      accreditation: codeHit.accreditation,
      nirfRank: codeHit.nirfRank,
      note: `Registry code match: ${codeHit.name} (${codeHit.state})`,
    };
  }

  // 4. Substring / fuzzy token-overlap match against registry names
  let best: { inst: VerifiedInstitution; score: number } | null = null;
  for (const inst of VERIFIED_INSTITUTIONS) {
    const instNorm = normalizeName(inst.name);
    const score = Math.max(
      jaccard(norm, instNorm),
      instNorm.includes(norm) && norm.length >= 6 ? 0.9 : 0,
      norm.includes(instNorm.split('(')[0].trim()) && instNorm.length >= 10 ? 0.85 : 0,
    );
    if (!best || score > best.score) best = { inst, score };
  }

  if (best && best.score >= 0.5) {
    const level: VerificationLevel = best.score >= 0.75 ? 'verified' : 'recognized';
    return {
      verified: best.score >= 0.75,
      level,
      confidence: Math.round(best.score * 100),
      matchedName: best.inst.name,
      matchedCode: best.inst.code,
      matchedType: best.inst.type,
      matchedState: best.inst.state,
      accreditation: best.inst.accreditation,
      nirfRank: best.inst.nirfRank,
      note: best.score >= 0.75
        ? `Strong registry match: ${best.inst.name}`
        : `Partial match to ${best.inst.name} — please confirm the exact name`,
    };
  }

  // 5. Generic academic-keyword heuristic — TWO independent academic signals required
  //    (e.g. "institute" + "technology"). A single generic word like "institute" must
  //    NOT grant "recognized", otherwise fabricated names get auto-trusted.
  const academicKeywords = [
    'technology', 'engineering', 'institute', 'university', 'college', 'polytechnic',
    'vidyapeeth', 'medical', 'law', 'design', 'architecture', 'pharmacy', 'science',
  ];
  const hits = academicKeywords.filter(kw => norm.includes(kw));
  const hasAcademic = hits.length >= 2 && norm.split(' ').length >= 3 && norm.length >= 12;

  return {
    verified: false,
    level: hasAcademic ? 'recognized' : 'unverified',
    confidence: hasAcademic ? 60 : 25,
    note: hasAcademic
      ? 'Plausible accredited institution but not in the premier registry — flagged for manual review'
      : 'Unverified institution name — please check spelling or select from suggestions',
  };
}
