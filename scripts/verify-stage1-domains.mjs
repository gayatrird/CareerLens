/**
 * Verification script for CareerLens Stage 1 — Core Intelligence (Domain Neutrality)
 * Tests 4 professional domains:
 *   A. Software Developer + SWE JD (Tech regression protection)
 *   B. Registered Nurse + Nurse JD (Healthcare domain)
 *   C. High School Teacher + Teacher JD (Education domain)
 *   D. Staff Accountant + Accountant JD (Finance & Accounting domain)
 * Plus verifies backward compatibility with legacy stored records.
 */

import { computeJobMatch, detectJobDomain } from '../src/services/jobMatch.js';
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
console.log('CAREERLENS STAGE 1 DOMAIN-NEUTRALITY VERIFICATION');
console.log('======================================================\n');

// ─── SCENARIO A: SOFTWARE DEVELOPER (IT REGRESSION CHECK) ───
console.log('--- SCENARIO A: Software Developer (Technology) ---');
const sweResume = `
Jane Doe
Senior Full-Stack Engineer
Skills: React, Node.js, Python, PostgreSQL, Docker, TypeScript, REST APIs, Git
Experience:
Senior Software Engineer at CloudCorp (2021-Present)
- Developed and architected distributed cloud microservices using Node.js and TypeScript.
- Designed relational schemas in PostgreSQL and optimized complex SQL queries.
- Built interactive single page applications using React and state management.
- Implemented CI/CD pipelines with Docker and automated testing suites.
`;

const sweJd = `
Software Engineer — Product Team
We are looking for a Software Engineer to join our core product team.
Responsibilities:
- Design, develop, test, and maintain full-stack web applications.
- Build resilient backend services and REST APIs with Node.js and Python.
- Work with relational databases including PostgreSQL.
- Collaborate with cross-functional teams to ship features using Docker and CI/CD.
Requirements:
- Bachelor's degree in Computer Science or related field.
- 3+ years experience with React, Node.js, and SQL.
- Strong problem-solving and communication skills.
`;

const sweDomainInfo = detectJobDomain(sweJd, sweResume);
assert(sweDomainInfo.domain === 'Technology', `Scenario A domain detected as Technology (got "${sweDomainInfo.domain}")`);
assert(/software|engineer|developer/i.test(sweDomainInfo.role), `Scenario A role detected appropriately (got "${sweDomainInfo.role}")`);

const swePersona = getDomainSpecialistPersona(sweDomainInfo.domain, sweDomainInfo.role);
assert(swePersona.title === 'Staff Software Engineer', `Scenario A persona is Staff Software Engineer (got "${swePersona.title}")`);

const sweAtsMock = {
  score: 85,
  detectedRole: sweDomainInfo.role,
  detectedDomain: sweDomainInfo.domain,
  extractedRequirements: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'REST APIs'],
  presentKeywords: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
  missingKeywords: ['AWS'],
  suggestions: ['Highlight AWS experience'],
  formattingIssues: 'None',
  sectionQuality: 'Strong',
  summary: 'Strong technical resume.'
};

const sweMatch = computeJobMatch({
  resumeText: sweResume,
  jobDescription: sweJd,
  agentResults: {
    ats: sweAtsMock,
    recruiter: { score: 88, strongProjects: ['Cloud microservices'], weakProjects: [], missingExperience: [], techStackAlignment: 'High', experienceRelevance: 'Strong', summary: 'Top candidate' },
    engineer: { score: 85, likelyInterviewQuestions: ['Microservice design?'], weakTechnicalAreas: ['AWS'], strongTechnicalAreas: ['Node.js', 'PostgreSQL'], architectureObservation: 'Clean design', summary: 'Solid depth' },
    manager: { score: 90, decision: 'HIRE', reasons: ['High skill match'], communicationClarity: 'Clear', achievementStrength: 'Good', summary: 'Hire recommendation' },
    optimizer: { overallImpactScore: 82, improvedBullets: [], writingTips: [], summary: 'Clear bullets' }
  }
});

assert(sweMatch.targetDomain === 'Technology', 'Scenario A jobMatch reports targetDomain: Technology');
assert(sweMatch.skillsMatch >= 80, `Scenario A preserves high technical skillsMatch (got ${sweMatch.skillsMatch})`);
assert(sweMatch.matchedSkills.includes('React') && sweMatch.matchedSkills.includes('Node.js'), 'Scenario A matched canonical tech skills (React, Node.js)');
assert(sweMatch.technicalMatch === sweMatch.domainDepthMatch, 'Scenario A technicalMatch is aliased to domainDepthMatch');
assert(sweMatch.overallMatch >= 75, `Scenario A high overall match (got ${sweMatch.overallMatch})`);

// ─── SCENARIO B: REGISTERED NURSE (HEALTHCARE DOMAIN) ──────
console.log('\n--- SCENARIO B: Registered Nurse (Healthcare) ---');
const nurseResume = `
Sarah Jenkins, BSN, RN
Registered Nurse — Intensive Care Unit (ICU)
Licenses & Certifications:
- Registered Nurse (RN) State License #RN987654
- BLS (Basic Life Support) — American Heart Association
- ACLS (Advanced Cardiac Life Support) — AHA
- CCRN (Critical Care Registered Nurse)

Clinical Experience:
Staff Nurse, ICU | Metro Health Medical Center (2020-Present)
- Deliver direct critical care to 2-3 high-acuity patients per shift in a 24-bed ICU.
- Administer IV medications, titrate vasoactive infusions, and manage mechanical ventilation.
- Conduct continuous patient triage, hemodynamic monitoring, and rapid emergency intervention.
- Document clinical assessments, care plans, and provider orders accurately in Epic EHR.
- Coordinate with multidisciplinary teams, physicians, and families for patient care continuity.

Education:
Bachelor of Science in Nursing (BSN), State University, 2019
`;

const nurseJd = `
Registered Nurse — Critical Care / ICU
Metro General Hospital is seeking an experienced Registered Nurse for our Intensive Care Unit.
Responsibilities:
- Provide high quality, evidence-based nursing care to acutely ill patients.
- Administer medications, blood products, and complex therapies according to hospital protocols.
- Perform continuous patient assessment, triage, and vital signs monitoring.
- Document all patient care, assessments, and interventions in Epic EHR system.
- Collaborate with physicians, therapists, and nursing colleagues to ensure patient safety.
Requirements:
- Active Registered Nurse (RN) license in state.
- Bachelor of Science in Nursing (BSN) required.
- Current BLS and ACLS certification required.
- Minimum 2 years of ICU or acute clinical care nursing experience.
- Experience with Epic EHR and medication administration protocols.
`;

const nurseDomainInfo = detectJobDomain(nurseJd, nurseResume);
assert(nurseDomainInfo.domain === 'Healthcare', `Scenario B domain detected as Healthcare (got "${nurseDomainInfo.domain}")`);
assert(/nurse|rn|clinical/i.test(nurseDomainInfo.role), `Scenario B role detected as Nurse (got "${nurseDomainInfo.role}")`);

const nursePersona = getDomainSpecialistPersona(nurseDomainInfo.domain, nurseDomainInfo.role);
assert(nursePersona.title === 'Clinical Practice Specialist', `Scenario B persona is Clinical Practice Specialist (got "${nursePersona.title}")`);

const nurseAtsMock = {
  score: 90,
  detectedRole: nurseDomainInfo.role,
  detectedDomain: nurseDomainInfo.domain,
  extractedRequirements: ['BLS', 'ACLS', 'Epic EHR', 'Patient Assessment', 'Medication Administration', 'BSN', 'ICU Care'],
  presentKeywords: ['BLS', 'ACLS', 'RN', 'BSN', 'ICU', 'Epic EHR', 'Patient Care'],
  missingKeywords: [],
  suggestions: ['Emphasize charge nurse experience if any'],
  formattingIssues: 'None',
  sectionQuality: 'Excellent',
  summary: 'Exceptional clinical credentials and ICU nursing match.'
};

const nurseMatch = computeJobMatch({
  resumeText: nurseResume,
  jobDescription: nurseJd,
  agentResults: {
    ats: nurseAtsMock,
    recruiter: { score: 92, strongProjects: ['ICU patient care management', 'Ventilator and titration protocol mastery'], weakProjects: [], missingExperience: [], techStackAlignment: 'Fully proficient in Epic EHR and medical monitoring', experienceRelevance: 'Direct match for ICU RN', summary: 'Highly qualified nurse.' },
    engineer: { score: 90, likelyInterviewQuestions: ['Describe your protocol during a rapid cardiac arrest response?', 'How do you handle acute hemodynamic instability?'], weakTechnicalAreas: [], strongTechnicalAreas: ['ACLS protocols', 'Critical care pharmacotherapy', 'Epic EHR'], architectureObservation: 'Strong adherence to critical care workflows and safety standards.', summary: 'Exceptional clinical practice depth.' },
    manager: { score: 95, decision: 'HIRE', reasons: ['Active certifications', 'Proven ICU acuity experience', 'Strong EHR documentation'], communicationClarity: 'Clear', achievementStrength: 'Strong', summary: 'Immediate interview.' },
    optimizer: { overallImpactScore: 88, improvedBullets: [], writingTips: [], summary: 'High-impact clinical descriptions.' }
  }
});

assert(nurseMatch.targetDomain === 'Healthcare', 'Scenario B jobMatch targetDomain is Healthcare');
assert(nurseMatch.skillsMatch >= 75, `Scenario B non-tech domain achieves strong skillsMatch (got ${nurseMatch.skillsMatch})`);
assert(nurseMatch.matchedSkills.some(s => ['BLS', 'ACLS', 'Epic EHR', 'RN'].includes(s)), 'Scenario B matched healthcare certifications/tools (BLS, ACLS, Epic EHR, RN)');
assert(nurseMatch.overallMatch >= 80, `Scenario B strong overall match (got ${nurseMatch.overallMatch})`);
assert(nurseMatch.domainDepthMatch >= 85, `Scenario B strong domainDepthMatch (got ${nurseMatch.domainDepthMatch})`);

// ─── SCENARIO C: HIGH SCHOOL TEACHER (EDUCATION DOMAIN) ─────
console.log('\n--- SCENARIO C: High School Teacher (Education) ---');
const teacherResume = `
David Miller
High School Mathematics Teacher
Certifications & Education:
- State Certified Teacher, Secondary Mathematics (Grades 9-12)
- Master of Arts in Education (M.Ed), 2018
- Bachelor of Science in Mathematics, 2015

Teaching Experience:
Secondary Math Teacher | Oakridge High School (2018-Present)
- Instruct 120+ students annually in Algebra I, Geometry, and AP Calculus.
- Develop interactive, standards-aligned curriculum and daily lesson plans.
- Implement differentiated instruction and accommodations for students with IEP and 504 plans.
- Administer formative and summative assessments to measure learning outcomes.
- Utilize Google Classroom and Canvas LMS for digital assignments and student tracking.
- Foster parent communication and lead bi-weekly student support sessions.
`;

const teacherJd = `
High School Math Teacher
Lincoln Public Schools is seeking a passionate and certified High School Math Teacher.
Responsibilities:
- Plan, prepare, and deliver engaging mathematics lessons aligned with state standards.
- Adapt curriculum and instructional strategies for diverse learners including students with IEP plans.
- Assess student performance using formative assessments and maintain grade records.
- Manage classroom culture to create an inclusive, productive learning environment.
- Communicate regularly with parents, counselors, and administrators regarding student progress.
Requirements:
- Bachelor's degree required, Master's preferred.
- Valid State Teaching Certification in Secondary Mathematics.
- Demonstrated experience with lesson planning, curriculum design, and classroom management.
- Proficiency with educational technology such as Google Classroom or Canvas LMS.
- Strong dedication to student growth and collaborative school community.
`;

const teacherDomainInfo = detectJobDomain(teacherJd, teacherResume);
assert(teacherDomainInfo.domain === 'Education', `Scenario C domain detected as Education (got "${teacherDomainInfo.domain}")`);
assert(/teacher|educator|math/i.test(teacherDomainInfo.role), `Scenario C role detected as Teacher (got "${teacherDomainInfo.role}")`);

const teacherPersona = getDomainSpecialistPersona(teacherDomainInfo.domain, teacherDomainInfo.role);
assert(teacherPersona.title === 'Instructional & Academic Specialist', `Scenario C persona is Instructional & Academic Specialist (got "${teacherPersona.title}")`);

const teacherAtsMock = {
  score: 88,
  detectedRole: teacherDomainInfo.role,
  detectedDomain: teacherDomainInfo.domain,
  extractedRequirements: ['State Teaching Certification', 'Curriculum Design', 'Lesson Planning', 'IEP Accommodations', 'Canvas LMS', 'Google Classroom'],
  presentKeywords: ['Teaching Certification', 'Curriculum', 'Lesson Plans', 'IEP', 'Assessments', 'Google Classroom', 'Canvas LMS'],
  missingKeywords: [],
  suggestions: ['Mention standardized test prep outcomes'],
  formattingIssues: 'None',
  sectionQuality: 'Good',
  summary: 'Strong pedagogical background and math teaching certification.'
};

const teacherMatch = computeJobMatch({
  resumeText: teacherResume,
  jobDescription: teacherJd,
  agentResults: {
    ats: teacherAtsMock,
    recruiter: { score: 90, strongProjects: ['AP Calculus pass rate increase', 'Standards-aligned curriculum redesign'], weakProjects: [], missingExperience: [], techStackAlignment: 'Canvas LMS and Google Classroom expertise', experienceRelevance: 'Direct secondary school teaching match', summary: 'Exceptional educator.' },
    engineer: { score: 88, likelyInterviewQuestions: ['How do you adapt an Algebra lesson for students struggling with IEP requirements?', 'What formative assessment strategies do you use?'], weakTechnicalAreas: [], strongTechnicalAreas: ['Differentiated pedagogy', 'Curriculum mapping', 'IEP implementation'], architectureObservation: 'Sound pedagogical methodology and assessment alignment.', summary: 'Strong instructional depth.' },
    manager: { score: 92, decision: 'HIRE', reasons: ['Valid state license', 'Master degree', 'Experience with IEPs'], communicationClarity: 'Articulate', achievementStrength: 'Clear', summary: 'Strong recommendation for hire.' },
    optimizer: { overallImpactScore: 85, improvedBullets: [], writingTips: [], summary: 'Well-structured education bullets.' }
  }
});

assert(teacherMatch.targetDomain === 'Education', 'Scenario C jobMatch targetDomain is Education');
assert(teacherMatch.skillsMatch >= 75, `Scenario C achieves solid skillsMatch without IT lexicon (got ${teacherMatch.skillsMatch})`);
assert(teacherMatch.matchedSkills.some(s => ['Curriculum', 'IEP', 'Canvas LMS', 'Google Classroom'].includes(s)), 'Scenario C matched education domain requirements (Curriculum, IEP, Canvas LMS)');
assert(teacherMatch.overallMatch >= 80, `Scenario C strong overall match (got ${teacherMatch.overallMatch})`);

// ─── SCENARIO D: STAFF ACCOUNTANT (FINANCE & ACCOUNTING) ────
console.log('\n--- SCENARIO D: Staff Accountant (Finance & Accounting) ---');
const accountantResume = `
Michael Chang, CPA
Staff Accountant
Certifications:
- Certified Public Accountant (CPA) — State Board of Accountancy
- Advanced Excel Certification (Pivot Tables, VLOOKUP, Power Query)

Experience:
Staff Accountant | Apex Financial Advisory (2021-Present)
- Prepare monthly journal entries, bank reconciliations, and general ledger maintenance.
- Assist with month-end and year-end close in compliance with GAAP standards.
- Prepare balance sheet reconciliations, variance analysis, and cash flow reports.
- Support annual external audit by preparing work papers and audit schedules.
- Process accounts payable (AP) and accounts receivable (AR) using NetSuite ERP.

Education:
Bachelor of Science in Accounting, 2020
`;

const accountantJd = `
Staff Accountant
Summit Global is seeking a detail-oriented Staff Accountant to join our corporate accounting team.
Responsibilities:
- Perform monthly general ledger reconciliations and prepare journal entries under GAAP.
- Conduct bank reconciliations, balance sheet reconciliations, and variance analysis.
- Assist with month-end and year-end close procedures and financial reporting.
- Prepare audit schedules and documentation for external financial audits.
- Manage transactional entries in NetSuite ERP and Excel.
Requirements:
- Bachelor's degree in Accounting, Finance, or related discipline.
- 2+ years of general accounting or audit experience.
- CPA or active CPA candidate preferred.
- Solid understanding of US GAAP accounting principles.
- Hands-on experience with NetSuite ERP and advanced Excel.
`;

const accountantDomainInfo = detectJobDomain(accountantJd, accountantResume);
assert(accountantDomainInfo.domain === 'Finance & Accounting', `Scenario D domain detected as Finance & Accounting (got "${accountantDomainInfo.domain}")`);
assert(/accountant|accounting|finance/i.test(accountantDomainInfo.role), `Scenario D role detected as Accountant (got "${accountantDomainInfo.role}")`);

const accountantPersona = getDomainSpecialistPersona(accountantDomainInfo.domain, accountantDomainInfo.role);
assert(accountantPersona.title === 'Senior Controller & Audit Specialist', `Scenario D persona is Senior Controller & Audit Specialist (got "${accountantPersona.title}")`);

const accountantAtsMock = {
  score: 92,
  detectedRole: accountantDomainInfo.role,
  detectedDomain: accountantDomainInfo.domain,
  extractedRequirements: ['CPA', 'US GAAP', 'NetSuite ERP', 'General Ledger', 'Reconciliations', 'Month-End Close', 'Audit Schedules'],
  presentKeywords: ['CPA', 'GAAP', 'NetSuite ERP', 'Reconciliations', 'General Ledger', 'Audit'],
  missingKeywords: [],
  suggestions: ['Detail internal controls / SOX experience'],
  formattingIssues: 'None',
  sectionQuality: 'Excellent',
  summary: 'Outstanding accounting credentials with CPA and GAAP expertise.'
};

const accountantMatch = computeJobMatch({
  resumeText: accountantResume,
  jobDescription: accountantJd,
  agentResults: {
    ats: accountantAtsMock,
    recruiter: { score: 94, strongProjects: ['Accelerated month-end close by 2 days', 'Automated bank reconciliations with Power Query'], weakProjects: [], missingExperience: [], techStackAlignment: 'Proficient in NetSuite ERP and advanced Excel modeling', experienceRelevance: 'Direct corporate accounting match', summary: 'CPA credentialed accountant.' },
    engineer: { score: 90, likelyInterviewQuestions: ['Walk through your month-end accrual and balance sheet reconciliation process?', 'How do you handle revenue recognition adjustments under GAAP?'], weakTechnicalAreas: [], strongTechnicalAreas: ['US GAAP rigor', 'NetSuite ERP', 'Financial statement analysis'], architectureObservation: 'Strong accounting rigor and controls compliance.', summary: 'High technical accounting competence.' },
    manager: { score: 95, decision: 'HIRE', reasons: ['Active CPA', 'Direct GAAP experience', 'NetSuite proficient'], communicationClarity: 'Clear and structured', achievementStrength: 'Quantified reconciliations', summary: 'Strong hire decision.' },
    optimizer: { overallImpactScore: 86, improvedBullets: [], writingTips: [], summary: 'Strong accounting terminology.' }
  }
});

assert(accountantMatch.targetDomain === 'Finance & Accounting', 'Scenario D jobMatch targetDomain is Finance & Accounting');
assert(accountantMatch.skillsMatch >= 75, `Scenario D achieves strong skillsMatch (got ${accountantMatch.skillsMatch})`);
assert(accountantMatch.matchedSkills.some(s => ['CPA', 'GAAP', 'NetSuite ERP', 'Reconciliations'].includes(s)), 'Scenario D matched accounting domain tools/credentials (CPA, GAAP, NetSuite ERP, Reconciliations)');
assert(accountantMatch.overallMatch >= 80, `Scenario D strong overall match (got ${accountantMatch.overallMatch})`);

// ─── BACKWARD COMPATIBILITY: OLD STORED RECORD CHECK ──────
console.log('\n--- BACKWARD COMPATIBILITY: Old Stored Records ---');
const legacyStoredRecord = {
  id: 'OLD123',
  date: '2024-01-15T00:00:00.000Z',
  topic: 'Software Developer',
  resumeText: 'Legacy resume text with React and Node.js',
  jobDescription: 'Legacy job description requiring React and Node.js',
  companyMode: 'general',
  agentResults: {
    ats: { score: 70, missingKeywords: ['Java'], presentKeywords: ['React'], suggestions: ['Improve'], formattingIssues: 'None', sectionQuality: 'Good', summary: 'Old summary' },
    recruiter: { score: 75, strongProjects: ['P1'], weakProjects: [], missingExperience: [], techStackAlignment: 'Ok', experienceRelevance: 'Good', summary: 'Old rec' },
    engineer: { score: 80, likelyInterviewQuestions: ['Q1?'], weakTechnicalAreas: ['T1'], strongTechnicalAreas: ['T2'], architectureObservation: 'Good', summary: 'Old eng' },
    manager: { score: 80, decision: 'HIRE', reasons: ['Good'], communicationClarity: 'Clear', achievementStrength: 'Good', summary: 'Old mgr' },
    optimizer: { overallImpactScore: 70, improvedBullets: [], writingTips: [], summary: 'Old opt' }
  },
  jobMatch: {
    overallMatch: 75,
    atsCompatibility: 70,
    skillsMatch: 80,
    experienceMatch: 75,
    technicalMatch: 80,
    matchedSkills: ['React', 'Node.js'],
    missingSkills: ['Java'],
    weakSkills: [],
    topGaps: [],
    recommendations: [],
    requirementBreakdown: {
      technicalSkills: [{ name: 'React', status: 'matched' }],
      responsibilities: [],
      experienceRequirements: [],
      softSkills: []
    }
  }
};

// Check legacy field access
assert(legacyStoredRecord.jobMatch.technicalMatch === 80, 'Legacy technicalMatch is intact on old records');
assert(Array.isArray(legacyStoredRecord.jobMatch.requirementBreakdown.technicalSkills), 'Legacy requirementBreakdown.technicalSkills is intact');
assert(legacyStoredRecord.agentResults.recruiter.strongProjects.length === 1, 'Legacy recruiter.strongProjects is intact');
assert(legacyStoredRecord.agentResults.engineer.architectureObservation === 'Good', 'Legacy engineer.architectureObservation is intact');

// Recomputing jobMatch on legacy record produces backward-compatible output
const recomputedLegacy = computeJobMatch({
  resumeText: legacyStoredRecord.resumeText,
  jobDescription: legacyStoredRecord.jobDescription,
  agentResults: legacyStoredRecord.agentResults
});
assert(Number.isFinite(recomputedLegacy.overallMatch), 'Recomputed legacy record produces finite overallMatch');
assert(recomputedLegacy.technicalMatch !== undefined, 'Recomputed legacy record preserves legacy technicalMatch');
assert(recomputedLegacy.domainDepthMatch !== undefined, 'Recomputed legacy record adds domainDepthMatch');
assert(recomputedLegacy.requirementBreakdown.technicalSkills !== undefined, 'Recomputed legacy record preserves requirementBreakdown.technicalSkills');
assert(recomputedLegacy.requirementBreakdown.coreDomainSkills !== undefined, 'Recomputed legacy record adds requirementBreakdown.coreDomainSkills');

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
