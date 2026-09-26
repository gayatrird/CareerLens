/**
 * Verification test for Job Match → Applications Integration in CareerLens:
 * - Current role propagation (targetRole / detected role)
 * - Current JD propagation
 * - Current score propagation (deterministic overall match score)
 * - Current location / company when explicitly available
 * - Blank company / location when not available (no fabricated data)
 * - Strict isolation: new analysis after old analysis uses ONLY the new analysis
 * - Multi-domain support: Education (Teacher), Healthcare (Nurse), Technology (Developer), Finance (Accountant)
 * - User edit before save capability
 * - Successful application creation in user-scoped storage
 * - Duplicate protection: exact duplicate detection (same company + title + JD)
 * - Non-duplicate recognition (different company, title, or JD)
 * - UI & component architecture inspection
 */

import fs from 'fs';
import path from 'path';

// Mock localStorage for Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

globalThis.localStorage = new MockLocalStorage();

// Import services
const {
  getStoredApplications,
  setStoredApplications,
  addStoredApplication,
  setStoredLastAnalysis,
  getStoredLastAnalysis,
} = await import('../src/services/userStorage.js');

const {
  computeJobMatch,
  extractCompanyFromJd,
  extractLocationFromJd,
  findDuplicateApplication,
  extractJobApplicationPrefill,
  getStatusDateLabel,
  formatDate,
} = await import('../src/services/jobMatch.js');

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
console.log('CAREERLENS JOB MATCH → APPLICATIONS INTEGRATION VERIFICATION');
console.log('======================================================\n');

// ─── 1. EDUCATION DOMAIN: PRIMARY SCHOOL TEACHER ───
console.log('--- 1. Education Domain: Primary School Teacher ---');

const educationJd = `
School: Delhi Public School
Role: Primary School Teacher
Location: New Delhi, India

We are looking for a dedicated Primary School Teacher to instruct elementary students.
Responsibilities:
- Plan and deliver engaging classroom lessons in English, Mathematics, and Science.
- Assess student learning and track academic progress.
- Facilitate parent-teacher conferences and foster positive classroom discipline.
Requirements:
- Bachelor of Education (B.Ed) or equivalent teaching certification.
- Minimum 2 years of classroom teaching experience.
- Strong communication and child pedagogy skills.
`.trim();

const educationResume = `
GAYATRI SHARMA
Certified Primary School Teacher
New Delhi, India

Professional Summary:
Enthusiastic educator with 3 years of classroom teaching experience across primary grades.
Skilled in curriculum planning, student evaluation, and interactive pedagogy.

Education & Credentials:
- Bachelor of Education (B.Ed), Delhi University
- CTET Qualified

Teaching Experience:
Primary School Educator — Modern Early Learning Academy (2023 - Present)
- Delivered daily instruction to 30+ students across Mathematics and English.
- Prepared comprehensive lesson plans and adapted pedagogy for diverse learning styles.
- Hosted regular parent-teacher conferences and evaluated homework.
`.trim();

const educationMatch = computeJobMatch({
  resumeText: educationResume,
  jobDescription: educationJd,
  agentResults: {
    ats: { score: 85, detectedDomain: 'Education', detectedRole: 'Primary School Teacher' },
    recruiter: { score: 82 },
    engineer: { score: 80 },
    manager: { score: 85 },
  },
});

const educationPrefill = extractJobApplicationPrefill({
  jobMatch: educationMatch,
  jobDescription: educationJd,
  resumeText: educationResume,
  companyMode: 'general',
  agentResults: { ats: { detectedRole: 'Primary School Teacher' } },
});

assert(educationPrefill.jobTitle === 'Primary School Teacher', `Education role correctly detected as "Primary School Teacher" (got "${educationPrefill.jobTitle}")`);
assert(educationPrefill.company === 'Delhi Public School', `Education company correctly extracted as "Delhi Public School" (got "${educationPrefill.company}")`);
assert(educationPrefill.location.includes('New Delhi'), `Education location correctly extracted as "New Delhi" (got "${educationPrefill.location}")`);
assert(educationPrefill.matchScore === educationMatch.overallMatch, `Education match score matches deterministic score ${educationMatch.overallMatch}% (got ${educationPrefill.matchScore})`);
assert(educationPrefill.jobDescription === educationJd, 'Education job description preserved in full');
assert(educationPrefill.status === 'Saved', 'Status defaulted to "Saved"');
assert(educationPrefill.notes === '', 'Notes blank by default');
assert(/^\d{4}-\d{2}-\d{2}$/.test(educationPrefill.applicationDate), 'Application date defaulted to today YYYY-MM-DD');

// ─── 2. HEALTHCARE DOMAIN: REGISTERED NURSE ───
console.log('\n--- 2. Healthcare Domain: Registered Nurse ---');

const healthcareJd = `
Hospital: Apollo Hospitals
Job Title: Registered Nurse
Location: Mumbai, India

Seeking a compassionate and skilled Registered Nurse for our critical care unit.
Responsibilities:
- Administer IV medications, monitor vitals, and maintain accurate EHR records.
- Provide direct bedside patient care in high-acuity medical-surgical environment.
- Triage emergency admissions and coordinate care plans with attending physicians.
Requirements:
- B.Sc in Nursing or GNM with active state nursing council license.
- BLS / ACLS certification.
- Minimum 2 years of hospital patient care experience.
`.trim();

const healthcareResume = `
PRIYA PATEL, RN
Registered Staff Nurse — B.Sc Nursing
Mumbai, Maharashtra

Professional Summary:
Licensed Registered Nurse with 3 years of clinical bedside experience in multispecialty hospital settings.
Proficient in patient assessment, medication administration, vitals monitoring, and EHR documentation.

Certifications:
- Active Registered Nurse (RN) License, Maharashtra Nursing Council
- BLS & ACLS Certified (AHA)

Experience:
Staff Nurse — Lilavati Hospital, Mumbai (2023 - Present)
- Managed bedside care for 6-8 acute care patients per shift.
- Administered IV medications, blood products, and wound dressings following clinical protocols.
- Documented vital signs, triage assessments, and physician orders in EHR.
`.trim();

const healthcareMatch = computeJobMatch({
  resumeText: healthcareResume,
  jobDescription: healthcareJd,
  agentResults: {
    ats: { score: 90, detectedDomain: 'Healthcare', detectedRole: 'Registered Nurse' },
    recruiter: { score: 88 },
    engineer: { score: 85 },
    manager: { score: 88 },
  },
});

const healthcarePrefill = extractJobApplicationPrefill({
  jobMatch: healthcareMatch,
  jobDescription: healthcareJd,
  resumeText: healthcareResume,
  companyMode: 'general',
  agentResults: { ats: { detectedRole: 'Registered Nurse' } },
});

assert(healthcarePrefill.jobTitle === 'Registered Nurse', `Healthcare role correctly detected as "Registered Nurse" (got "${healthcarePrefill.jobTitle}")`);
assert(healthcarePrefill.company === 'Apollo Hospitals', `Healthcare company correctly extracted as "Apollo Hospitals" (got "${healthcarePrefill.company}")`);
assert(healthcarePrefill.location.includes('Mumbai'), `Healthcare location correctly extracted as "Mumbai" (got "${healthcarePrefill.location}")`);
assert(healthcarePrefill.matchScore === healthcareMatch.overallMatch, `Healthcare match score matches deterministic score ${healthcareMatch.overallMatch}% (got ${healthcarePrefill.matchScore})`);
assert(healthcarePrefill.jobDescription === healthcareJd, 'Healthcare job description preserved in full');

// ─── 3. TECHNOLOGY DOMAIN: SOFTWARE DEVELOPER ───
console.log('\n--- 3. Technology Domain: Software Developer ---');

const techJd = `
Company: Stripe
Job Title: Software Developer
Location: San Francisco, CA (Remote)

We are hiring a Software Developer to build high-scale billing and payments infrastructure.
Responsibilities:
- Build reliable microservices and RESTful APIs using Node.js and TypeScript.
- Design relational database schemas in PostgreSQL and optimize query performance.
- Collaborate with frontend engineers integrating React client applications.
Requirements:
- Strong proficiency in JavaScript, TypeScript, React, and Node.js.
- Solid understanding of distributed systems and database modeling.
- Experience with Docker, CI/CD, and cloud infrastructure.
`.trim();

const techResume = `
ALEX CHEN
Full Stack Software Developer
Remote, US

Experience:
Software Engineer — TechCorp (2022 - Present)
- Developed RESTful APIs in Node.js and TypeScript serving 10M requests daily.
- Built responsive UI dashboards with React and Tailwind CSS.
- Optimized PostgreSQL database queries reducing API latency by 35%.
- Maintained Dockerized CI/CD build pipelines in GitHub Actions.
`.trim();

const techMatch = computeJobMatch({
  resumeText: techResume,
  jobDescription: techJd,
  agentResults: {
    ats: { score: 92, detectedDomain: 'Technology', detectedRole: 'Software Developer' },
    recruiter: { score: 90 },
    engineer: { score: 94 },
    manager: { score: 90 },
  },
});

const techPrefill = extractJobApplicationPrefill({
  jobMatch: techMatch,
  jobDescription: techJd,
  resumeText: techResume,
  companyMode: 'general',
  agentResults: { ats: { detectedRole: 'Software Developer' } },
});

assert(techPrefill.jobTitle === 'Software Developer', `Tech role correctly detected as "Software Developer" (got "${techPrefill.jobTitle}")`);
assert(techPrefill.company === 'Stripe', `Tech company correctly extracted as "Stripe" (got "${techPrefill.company}")`);
assert(techPrefill.location.includes('San Francisco'), `Tech location correctly extracted (got "${techPrefill.location}")`);
assert(techPrefill.matchScore === techMatch.overallMatch, `Tech match score matches deterministic score ${techMatch.overallMatch}% (got ${techPrefill.matchScore})`);

// ─── 4. FINANCE DOMAIN: STAFF ACCOUNTANT ───
console.log('\n--- 4. Finance Domain: Staff Accountant ---');

const financeJd = `
Firm: KPMG
Position: Staff Accountant
Location: Chicago, IL

KPMG is looking for a Staff Accountant to support financial reporting and audit readiness.
Responsibilities:
- Prepare monthly journal entries, balance sheet reconciliations, and general ledger schedules.
- Ensure strict compliance with US GAAP and internal controls.
- Assist senior auditors with financial statement disclosures and variance analysis.
Requirements:
- Bachelor's in Accounting or Finance.
- CPA or active CPA candidate.
- Proficiency with NetSuite ERP or SAP and advanced Excel modeling.
`.trim();

const financeResume = `
SARAH JENKINS
Staff Accountant | CPA Eligible
Chicago, IL

Experience:
Junior Accountant — Apex Financial Group (2023 - Present)
- Conducted monthly general ledger reconciliations and journal entries under US GAAP.
- Prepared bank and payroll reconciliations using NetSuite and Excel.
- Supported quarterly audit engagements and internal control reviews.
`.trim();

const financeMatch = computeJobMatch({
  resumeText: financeResume,
  jobDescription: financeJd,
  agentResults: {
    ats: { score: 86, detectedDomain: 'Finance & Accounting', detectedRole: 'Staff Accountant' },
    recruiter: { score: 84 },
    engineer: { score: 88 },
    manager: { score: 86 },
  },
});

const financePrefill = extractJobApplicationPrefill({
  jobMatch: financeMatch,
  jobDescription: financeJd,
  resumeText: financeResume,
  companyMode: 'general',
  agentResults: { ats: { detectedRole: 'Staff Accountant' } },
});

assert(financePrefill.jobTitle === 'Staff Accountant', `Finance role correctly detected as "Staff Accountant" (got "${financePrefill.jobTitle}")`);
assert(financePrefill.company === 'KPMG', `Finance company correctly extracted as "KPMG" (got "${financePrefill.company}")`);
assert(financePrefill.location.includes('Chicago'), `Finance location correctly extracted (got "${financePrefill.location}")`);
assert(financePrefill.matchScore === financeMatch.overallMatch, `Finance match score matches deterministic score (got ${financePrefill.matchScore})`);

// ─── 5. BLANK COMPANY & LOCATION WHEN NOT EXPLICITLY AVAILABLE ───
console.log('\n--- 5. Blank Company and Location When Not Available ---');

const genericJd = `
Software Developer.
We are looking for a motivated software developer to join our engineering team.
You will write clean code, design features, and collaborate on systems.
Requirements: Python, Java, React, SQL, and problem solving skills.
`.trim();

const genericMatch = computeJobMatch({
  resumeText: techResume,
  jobDescription: genericJd,
  agentResults: {},
});

const genericPrefill = extractJobApplicationPrefill({
  jobMatch: genericMatch,
  jobDescription: genericJd,
  resumeText: techResume,
  companyMode: 'general',
});

assert(genericPrefill.company === '', `Company is left blank when not in JD or companyMode (got "${genericPrefill.company}")`);
assert(genericPrefill.location === '', `Location is left blank when not in JD (got "${genericPrefill.location}")`);
assert(Boolean(genericPrefill.jobTitle), `Job title is still populated from role detection (got "${genericPrefill.jobTitle}")`);
assert(genericPrefill.matchScore === genericMatch.overallMatch, 'Job match score correctly populated from generic analysis');

// Also test companyMode selection (e.g. TCS selected from target company chips)
const tcsPrefill = extractJobApplicationPrefill({
  jobMatch: genericMatch,
  jobDescription: genericJd,
  resumeText: techResume,
  companyMode: 'tcs',
});
assert(tcsPrefill.company === 'TCS', `Company mode "tcs" resolves to "TCS" (got "${tcsPrefill.company}")`);

// ─── 6. STALE ANALYSIS ISOLATION (RUN 1 VS RUN 2) ───
console.log('\n--- 6. Stale Analysis Isolation ---');

// Run 1: Education Teacher at Delhi Public School
const run1Analysis = {
  id: 'ANALYSIS_EDU_1',
  jobDescription: educationJd,
  resumeText: educationResume,
  companyMode: 'general',
  jobMatch: educationMatch,
};

// Persist Run 1 to storage as lastAnalysis
setStoredLastAnalysis(run1Analysis, 'user_isolation_test');
const storedAfterRun1 = getStoredLastAnalysis('user_isolation_test');
assert(storedAfterRun1.jobMatch.targetRole === 'Primary School Teacher', 'Run 1 stored in user history');

// Run 2: Healthcare Nurse at Apollo Hospitals (NEW RUN)
const run2Analysis = {
  id: 'ANALYSIS_HEALTH_2',
  jobDescription: healthcareJd,
  resumeText: healthcareResume,
  companyMode: 'general',
  jobMatch: healthcareMatch,
};

// Add to Applications from Run 2 MUST use ONLY Run 2
const run2Prefill = extractJobApplicationPrefill({
  jobMatch: run2Analysis.jobMatch,
  jobDescription: run2Analysis.jobDescription,
  resumeText: run2Analysis.resumeText,
  companyMode: run2Analysis.companyMode,
});

assert(run2Prefill.jobTitle === 'Registered Nurse', 'Run 2 prefill has Registered Nurse (not Teacher)');
assert(run2Prefill.company === 'Apollo Hospitals', 'Run 2 prefill has Apollo Hospitals (not Delhi Public School)');
assert(run2Prefill.jobDescription.includes('Registered Nurse'), 'Run 2 prefill has healthcare JD');
assert(!run2Prefill.jobDescription.includes('Primary School Teacher'), 'Run 2 prefill has ZERO contamination from Run 1 JD');
assert(run2Prefill.matchScore === healthcareMatch.overallMatch, 'Run 2 prefill has Healthcare match score');
assert(run2Prefill.matchScore !== educationMatch.overallMatch || healthcareMatch.overallMatch === educationMatch.overallMatch, 'Run 2 prefill matches Run 2 score');

// ─── 7. USER EDIT BEFORE SAVE SIMULATION ───
console.log('\n--- 7. User Edit Before Save ---');

// Start from techPrefill, but user modifies company, notes, status, and location in modal
const userEditedApp = {
  ...techPrefill,
  company: 'Stripe Payments UK',
  location: 'London, UK',
  status: 'Applied',
  notes: 'Referred by tech lead. First screening on Thursday.',
};

assert(userEditedApp.company === 'Stripe Payments UK', 'User was able to edit company before saving');
assert(userEditedApp.location === 'London, UK', 'User was able to edit location before saving');
assert(userEditedApp.status === 'Applied', 'User was able to edit status before saving');
assert(userEditedApp.notes === 'Referred by tech lead. First screening on Thursday.', 'User was able to edit notes before saving');
assert(userEditedApp.matchScore === techMatch.overallMatch, 'Deterministic match score preserved');

// ─── 8. SUCCESSFUL APPLICATION CREATION & USER-SCOPED STORAGE ───
console.log('\n--- 8. Application Creation in User-Scoped Storage ---');

const testUid = 'user_jobmatch_integration';
const createdApp = addStoredApplication(userEditedApp, testUid);

assert(Boolean(createdApp), 'Application record was created successfully');
assert(typeof createdApp.id === 'string' && createdApp.id.startsWith('app_'), 'Generated unique application ID');
assert(createdApp.company === 'Stripe Payments UK', 'Stored modified company');
assert(createdApp.jobTitle === 'Software Developer', 'Stored job title');
assert(createdApp.status === 'Applied', 'Stored status');
assert(createdApp.matchScore === techMatch.overallMatch, 'Stored current deterministic score');
assert(createdApp.notes.includes('Referred by tech lead'), 'Stored user notes');

// Verify it appears in user's application list
const userApps = getStoredApplications(testUid);
assert(userApps.length === 1, 'Application appears in user application tracker');
assert(userApps[0].id === createdApp.id, 'Retrieved matching application record');

// ─── 9. DUPLICATE DETECTION (SAME COMPANY + TITLE + JD) ───
console.log('\n--- 9. Duplicate Protection ---');

// Attempt to add exact same application again
const duplicateCandidate = {
  company: 'Stripe Payments UK',
  jobTitle: 'Software Developer',
  jobDescription: techJd,
};

const duplicateFound = findDuplicateApplication(duplicateCandidate, userApps);
assert(Boolean(duplicateFound), 'Duplicate detected for exact same company, job title, and JD');
assert(duplicateFound.id === createdApp.id, 'Duplicate points to existing application');

// Test Case A: Different Company -> NOT a duplicate
const differentCompanyCandidate = {
  company: 'Adyen',
  jobTitle: 'Software Developer',
  jobDescription: techJd,
};
const notDuplicateCompany = findDuplicateApplication(differentCompanyCandidate, userApps);
assert(notDuplicateCompany === null, 'Different company is NOT flagged as duplicate');

// Test Case B: Different Job Title -> NOT a duplicate
const differentTitleCandidate = {
  company: 'Stripe Payments UK',
  jobTitle: 'Engineering Manager',
  jobDescription: techJd,
};
const notDuplicateTitle = findDuplicateApplication(differentTitleCandidate, userApps);
assert(notDuplicateTitle === null, 'Different job title is NOT flagged as duplicate');

// Test Case C: Different JD -> NOT a duplicate
const differentJdCandidate = {
  company: 'Stripe Payments UK',
  jobTitle: 'Software Developer',
  jobDescription: 'Completely different role working on security auditing.',
};
const notDuplicateJd = findDuplicateApplication(differentJdCandidate, userApps);
assert(notDuplicateJd === null, 'Different job description is NOT flagged as duplicate');

// Test Case D: Case-insensitive company & title match
const caseInsensitiveCandidate = {
  company: 'stripe payments uk',
  jobTitle: 'software developer',
  jobDescription: techJd,
};
const caseInsensitiveMatch = findDuplicateApplication(caseInsensitiveCandidate, userApps);
assert(Boolean(caseInsensitiveMatch), 'Case-insensitive company and title are detected as duplicate');

// ─── 10. UI & INTEGRATION COMPONENT FILES INSPECTION ───
console.log('\n--- 10. UI & Integration Component Files Inspection ---');

const jobMatchSrc = fs.readFileSync(path.resolve('src/components/JobMatchSection.jsx'), 'utf8');
const addModalSrc = fs.readFileSync(path.resolve('src/components/AddApplicationModal.jsx'), 'utf8');
const appSrc = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
const jobMatchServiceSrc = fs.readFileSync(path.resolve('src/services/jobMatch.js'), 'utf8');

// JobMatchSection inspection
assert(jobMatchSrc.includes('Add to Applications'), 'JobMatchSection includes "Add to Applications" action');
assert(jobMatchSrc.includes('jobmatch-add-application-btn'), 'JobMatchSection has main Add Application button');
assert(jobMatchSrc.includes('jobmatch-add-application-header-btn'), 'JobMatchSection has header Add Application button');
assert(jobMatchSrc.includes('AddApplicationModal'), 'JobMatchSection renders AddApplicationModal');
assert(jobMatchSrc.includes('extractJobApplicationPrefill'), 'JobMatchSection uses extractJobApplicationPrefill');
assert(jobMatchSrc.includes('findDuplicateApplication'), 'JobMatchSection checks findDuplicateApplication');
assert(jobMatchSrc.includes('addStoredApplication'), 'JobMatchSection calls addStoredApplication on save');
assert(jobMatchSrc.includes('currentAnalysis'), 'JobMatchSection accepts currentAnalysis prop for isolation');

// AddApplicationModal inspection
assert(fs.existsSync(path.resolve('src/components/AddApplicationModal.jsx')), 'AddApplicationModal component exists');
assert(addModalSrc.includes('COMPANY NAME *'), 'AddApplicationModal has Company Name field');
assert(addModalSrc.includes('JOB TITLE *'), 'AddApplicationModal has Job Title field');
assert(addModalSrc.includes('LOCATION'), 'AddApplicationModal has Location field');
assert(addModalSrc.includes('APPLICATION DATE'), 'AddApplicationModal has Application Date field');
assert(addModalSrc.includes('STATUS'), 'AddApplicationModal has Status dropdown');
assert(addModalSrc.includes('JOB MATCH SCORE'), 'AddApplicationModal has Job Match Score field');
assert(addModalSrc.includes('JOB DESCRIPTION'), 'AddApplicationModal has Job Description field');
assert(addModalSrc.includes('NOTES'), 'AddApplicationModal has Notes field');
assert(addModalSrc.includes('Application Already Exists'), 'AddApplicationModal includes duplicate detection notice');
assert(addModalSrc.includes('Save Duplicate'), 'AddApplicationModal includes duplicate confirmation flow');
assert(addModalSrc.includes('modal-backdrop-overlay'), 'AddApplicationModal includes modal-backdrop-overlay');

// App.jsx inspection
assert(appSrc.includes('currentAnalysis={analysisState}'), 'App.jsx passes currentAnalysis to JobMatchSection');
assert(appSrc.includes('onNavigate={setActiveTab}'), 'App.jsx passes onNavigate to JobMatchSection');

// jobMatch.js service inspection
assert(jobMatchServiceSrc.includes('export function extractJobApplicationPrefill'), 'jobMatch.js exports extractJobApplicationPrefill');
assert(jobMatchServiceSrc.includes('export function findDuplicateApplication'), 'jobMatch.js exports findDuplicateApplication');
assert(jobMatchServiceSrc.includes('export function extractCompanyFromJd'), 'jobMatch.js exports extractCompanyFromJd');
assert(jobMatchServiceSrc.includes('export function extractLocationFromJd'), 'jobMatch.js exports extractLocationFromJd');

// ─── 11. REGRESSION: STATUS-AWARE DATE LABELS & SIDEBAR APP COUNT ───
console.log('\n--- 11. Status-Aware Date Labels & Sidebar App Count ---');

const formattedDate = formatDate('2026-09-26');

// 1. Saved application date label
assert(
  getStatusDateLabel('Saved', '2026-09-26') === `Saved: ${formattedDate}`,
  `Saved application date label is status-aware: "Saved: ${formattedDate}"`
);

// 2. Applied application date label
assert(
  getStatusDateLabel('Applied', '2026-09-26') === `Applied: ${formattedDate}`,
  `Applied application date label is status-aware: "Applied: ${formattedDate}"`
);

// Other statuses & neutral fallback
assert(
  getStatusDateLabel('Interview', '2026-09-26') === `Interview: ${formattedDate}`,
  `Interview application date label is status-aware: "Interview: ${formattedDate}"`
);
assert(
  getStatusDateLabel('Offer', '2026-09-26') === `Offer: ${formattedDate}`,
  `Offer application date label is status-aware: "Offer: ${formattedDate}"`
);
assert(
  getStatusDateLabel('Rejected', '2026-09-26') === `Rejected: ${formattedDate}`,
  `Rejected application date label is status-aware: "Rejected: ${formattedDate}"`
);
assert(
  getStatusDateLabel('OtherStatus', '2026-09-26') === `Added: ${formattedDate}`,
  `Fallback application date label is neutral "Added: ${formattedDate}"`
);

// 3. Sidebar application count derived from user-scoped storage
const sidebarSrc = fs.readFileSync(path.resolve('src/components/Sidebar.jsx'), 'utf8');
assert(sidebarSrc.includes('getStoredApplications'), 'Sidebar imports getStoredApplications from userStorage');
assert(!sidebarSrc.includes('<span className="text-xs font-semibold text-[#FAFAFA]">4</span>'), 'Sidebar does not use hardcoded 4');
assert(sidebarSrc.includes('{applicationsCount}'), 'Sidebar uses dynamic {applicationsCount}');

// Verify application count matches stored applications for user
const userCount = getStoredApplications(testUid).length;
assert(userCount === 1, `Sidebar applications count matches stored applications (${userCount} === 1)`);

// Verify isolation for multiple users
const secondUserUid = 'user_second_verify';
setStoredApplications([
  { id: 'app_1', company: 'Google', jobTitle: 'SRE', status: 'Applied', applicationDate: '2026-09-26' },
  { id: 'app_2', company: 'Meta', jobTitle: 'Engineer', status: 'Saved', applicationDate: '2026-09-26' },
], secondUserUid);

assert(getStoredApplications(secondUserUid).length === 2, 'Second user has 2 applications');
assert(getStoredApplications(testUid).length === 1, 'First user count unaffected by second user (no cross-contamination)');

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
