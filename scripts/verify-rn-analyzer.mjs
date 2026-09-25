/**
 * Verification test for Analyzer domain/persona and JD-consistency
 * Focuses on Registered Nurse test case and domain neutrality.
 */

import { computeJobMatch, detectJobDomain, analyzeJdRequirements, textHasPhrase } from '../src/services/jobMatch.js';
import { getDomainSpecialistPersona } from '../src/services/hiringApi.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✓ ${message}`);
    passed++;
  }
}

console.log('\n======================================================');
console.log('CAREERLENS ANALYZER REGISTERED NURSE & CONSISTENCY VERIFICATION');
console.log('======================================================\n');

// ─── TEST CASE: REGISTERED NURSE (EXACT USER TEST CASE) ───
console.log('--- 1. Exact Registered Nurse Test Case ---');

const rnResume = `
Sushmita Ravinder Dyavanapalli, BSN, RN
Registered Nurse — Acute Care / Medical-Surgical
Contact: sushmita@example.com

Summary:
Dedicated and compassionate Registered Nurse with 4+ years of clinical experience delivering high-quality patient care in fast-paced hospital settings. Highly responsible and skilled in comprehensive patient assessments, vital signs and continuous hemodynamic monitoring, coordinating clinical workflows with physicians, and maintaining meticulous electronic medical records.

Clinical Experience:
Staff Nurse | Care Hospital (2021 - Present)
- Delivered direct quality patient care to 5-6 acute medical-surgical patients per shift.
- Collaborated closely with doctors and attending physicians during daily patient rounds and implemented care orders.
- Performed continuous patient monitoring and vitals tracking, recognizing acute status changes promptly.
- Maintained accurate medical records and charted patient evaluations, medication administration, and care plans in Epic EHR.
- Upheld responsible patient care standards, safety protocols, and compassionate bedside manner.

Education & Credentials:
Bachelor of Science in Nursing (BSN) — 2020
Registered Nurse License #RN123456
`;

const rnJd = "We are looking for a compassionate and responsible Registered Nurse to provide quality patient care, assist doctors, monitor patients, and maintain accurate medical records.";

// 1. Domain & Role Detection
const detected = detectJobDomain(rnJd, rnResume);
assert(detected.domain === 'Healthcare', `Domain detected as Healthcare (got "${detected.domain}")`);
assert(/nurse|rn/i.test(detected.role), `Role detected as Registered Nurse (got "${detected.role}")`);

// 2. Persona Selection
const persona = getDomainSpecialistPersona(detected.domain, detected.role);
assert(persona.title === 'Clinical Practice Specialist', `Agent 3 persona is Clinical Practice Specialist (got "${persona.title}")`);
assert(!persona.title.toLowerCase().includes('engineer'), `Agent 3 is NOT an Engineer (got "${persona.title}")`);
assert(!persona.title.toLowerCase().includes('software'), `Agent 3 is NOT a Software persona (got "${persona.title}")`);

// 3. Normalized Requirement-Evidence Analysis
const reqAnalysis = analyzeJdRequirements(rnJd, rnResume);

console.log('\nExtracted Responsibilities:');
for (const r of reqAnalysis.responsibilities) {
  console.log(`  - [${r.status.toUpperCase()}] ${r.name}`);
}

console.log('\nExtracted Soft Skills:');
for (const s of reqAnalysis.softSkills) {
  console.log(`  - [${s.status.toUpperCase()}] ${s.name}`);
}

// 4. Verify specific duties are matched
const matchedDutyNames = reqAnalysis.responsibilities.filter(r => r.status === 'matched').map(r => r.name.toLowerCase());

assert(
  matchedDutyNames.some(n => n.includes('patient care') || n.includes('provide quality patient care')),
  'Duty "provide quality patient care" is MATCHED'
);
assert(
  matchedDutyNames.some(n => n.includes('assist doctors')),
  'Duty "assist doctors" is MATCHED'
);
assert(
  matchedDutyNames.some(n => n.includes('monitor patients')),
  'Duty "monitor patients" is MATCHED'
);
assert(
  matchedDutyNames.some(n => n.includes('maintain accurate medical records') || n.includes('medical records')),
  'Duty "maintain accurate medical records" is MATCHED'
);

// 5. Verify soft skills matching
const matchedSoftSkillNames = reqAnalysis.softSkills.filter(s => s.status === 'matched').map(s => s.name.toLowerCase());
assert(
  matchedSoftSkillNames.some(n => n.includes('compassion')),
  'Soft skill "Compassion & Empathy" is MATCHED based on resume evidence'
);
assert(
  matchedSoftSkillNames.some(n => n.includes('responsibility')),
  'Soft skill "Responsibility & Accountability" is MATCHED based on resume evidence'
);

// 6. Verify NO JD Contamination (BLS / ACLS must NOT appear anywhere)
const allAnalyzedReqs = [
  ...reqAnalysis.responsibilities.map(r => r.name),
  ...reqAnalysis.softSkills.map(s => s.name),
  ...reqAnalysis.coreDomainSkills.map(d => d.name),
  ...reqAnalysis.extractedRequirements,
];

const hasBls = allAnalyzedReqs.some(r => /\bbls\b/i.test(r));
const hasAcls = allAnalyzedReqs.some(r => /\bacls\b/i.test(r));
assert(!hasBls, 'BLS does NOT appear in analyzed requirements when not in JD');
assert(!hasAcls, 'ACLS does NOT appear in analyzed requirements when not in JD');

// 7. Full computeJobMatch verification
const matchReport = computeJobMatch({
  resumeText: rnResume,
  jobDescription: rnJd,
  agentResults: {
    ats: {
      score: 95,
      detectedRole: detected.role,
      detectedDomain: detected.domain,
      extractedRequirements: reqAnalysis.extractedRequirements,
      presentKeywords: reqAnalysis.matchedList,
      missingKeywords: [],
      suggestions: ['Quantify specific patient outcomes where possible'],
      summary: 'High clinical match.'
    },
    recruiter: {
      score: 92,
      strongProjects: ['Medical-surgical acute care'],
      weakProjects: [],
      missingExperience: [],
      summary: 'Strong clinical nursing background.'
    },
    engineer: {
      score: 90,
      weakTechnicalAreas: [],
      strongTechnicalAreas: ['Patient Monitoring', 'EHR Documentation'],
      summary: 'Excellent clinical protocol execution.'
    },
    manager: {
      score: 95,
      decision: 'HIRE',
      reasons: ['Strong alignment with hospital care standards'],
      summary: 'Immediate interview recommended.'
    }
  }
});

assert(matchReport.targetDomain === 'Healthcare', `Match report domain is Healthcare (got "${matchReport.targetDomain}")`);
assert(matchReport.overallMatch >= 80, `Overall match score is high (got ${matchReport.overallMatch}%)`);
assert(matchReport.skillsMatch >= 80, `Skills match is high (got ${matchReport.skillsMatch}%)`);

// Verify no BLS/ACLS in missingSkills or topGaps or recommendations
assert(!matchReport.missingSkills.some(s => /\b(bls|acls)\b/i.test(s)), 'missingSkills contains NO ungrounded BLS/ACLS');
assert(!matchReport.topGaps.some(g => /\b(bls|acls)\b/i.test(g.skill)), 'topGaps contains NO ungrounded BLS/ACLS');
assert(!matchReport.recommendations.some(r => /\b(bls|acls)\b/i.test(r)), 'recommendations contains NO ungrounded BLS/ACLS');

// ─── 2. DOMAIN NEUTRALITY ACROSS 4 DOMAINS ───
console.log('\n--- 2. Domain Neutrality & Persona Isolation ---');

const domainTests = [
  {
    name: 'Technology',
    jd: 'Looking for a Senior Software Engineer to design microservices and write Python APIs.',
    resume: 'Senior Developer with 5 years in Python, FastAPI, and Docker microservices.',
    expectedDomain: 'Technology',
    expectedPersona: 'Staff Software Engineer',
  },
  {
    name: 'Healthcare',
    jd: 'Seeking a Registered Nurse for inpatient medical care and patient monitoring.',
    resume: 'RN with 4 years providing patient care and clinical documentation.',
    expectedDomain: 'Healthcare',
    expectedPersona: 'Clinical Practice Specialist',
  },
  {
    name: 'Education',
    jd: 'High school math teacher needed to instruct algebra and develop curriculum.',
    resume: 'Teacher with 6 years experience in algebra instruction and lesson planning.',
    expectedDomain: 'Education',
    expectedPersona: 'Instructional & Academic Specialist',
  },
  {
    name: 'Finance & Accounting',
    jd: 'Staff Accountant needed for monthly ledger reconciliations and financial reporting.',
    resume: 'Accountant with CPA, skilled in GAAP compliance, balance sheet reconciliations.',
    expectedDomain: 'Finance & Accounting',
    expectedPersona: 'Senior Controller & Audit Specialist',
  },
];

for (const dt of domainTests) {
  const dInfo = detectJobDomain(dt.jd, dt.resume);
  assert(dInfo.domain === dt.expectedDomain, `${dt.name}: domain detected as "${dt.expectedDomain}" (got "${dInfo.domain}")`);
  const p = getDomainSpecialistPersona(dInfo.domain, dInfo.role);
  assert(p.title === dt.expectedPersona, `${dt.name}: persona is "${dt.expectedPersona}" (got "${p.title}")`);
}

// ─── 3. ANALYSIS ISOLATION (NO POLLUTION FROM PREVIOUS RUNS) ───
console.log('\n--- 3. Analysis Isolation (No Cross-Pollution) ---');

// Simulate Run 1: Technology
const run1Domain = detectJobDomain(domainTests[0].jd, domainTests[0].resume);
const run1Match = computeJobMatch({
  resumeText: domainTests[0].resume,
  jobDescription: domainTests[0].jd,
  agentResults: {
    ats: { detectedDomain: run1Domain.domain, detectedRole: run1Domain.role, extractedRequirements: ['Python', 'Docker', 'Microservices'] }
  }
});
assert(run1Match.targetDomain === 'Technology', 'Run 1 is Technology');

// Simulate Run 2: Healthcare immediately after
const run2Domain = detectJobDomain(rnJd, rnResume);
const run2Match = computeJobMatch({
  resumeText: rnResume,
  jobDescription: rnJd,
  agentResults: {
    ats: { detectedDomain: run2Domain.domain, detectedRole: run2Domain.role, extractedRequirements: reqAnalysis.extractedRequirements }
  }
});
assert(run2Match.targetDomain === 'Healthcare', 'Run 2 is Healthcare (NOT polluted by Run 1 Technology)');
assert(!run2Match.matchedSkills.includes('Python'), 'Run 2 contains NO Python from Run 1');
assert(!run2Match.matchedSkills.includes('Docker'), 'Run 2 contains NO Docker from Run 1');
const run2Persona = getDomainSpecialistPersona(run2Match.targetDomain, run2Match.targetRole);
assert(run2Persona.title === 'Clinical Practice Specialist', 'Run 2 Agent 3 is Clinical Practice Specialist');

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
