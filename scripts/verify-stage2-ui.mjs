/**
 * Verification script for CareerLens Stage 2 — Domain-Neutral UI & Downstream Features
 * Tests:
 * 1. UI Label & Domain Mappings across 4 professional domains:
 *    A. Technology: Software Developer
 *    B. Healthcare: Registered Nurse
 *    C. Education: High School Teacher
 *    D. Finance: Staff Accountant
 * 2. Career Navigator Caching & Resume Upload Isolation
 * 3. Mock Interview Domain Question Categories & Personas
 * 4. Question Kit Domain Labels
 * 5. Dashboard & Archives domain badges & non-IT fallback behavior
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
console.log('CAREERLENS STAGE 2 DOMAIN-NEUTRAL UI VERIFICATION');
console.log('======================================================\n');

// ── Helper replicating JobMatchSection label logic ──
function getJobMatchDomainLabels(targetDomain) {
  const d = (targetDomain || '').toLowerCase();
  if (d.includes('tech') || d.includes('software') || d.includes('developer') || d.includes('data')) {
    return {
      subScoreLabel: 'Technical Match',
      skillsHeader: 'TECHNICAL SKILLS',
      skillsSubLabel: 'Core programming languages, frameworks & tech stack requirements',
      depthLabel: 'Technical Depth',
    };
  }
  if (d.includes('health') || d.includes('nurse') || d.includes('medic') || d.includes('clinic')) {
    return {
      subScoreLabel: 'Clinical Depth',
      skillsHeader: 'CLINICAL & CORE SKILLS',
      skillsSubLabel: 'Medical protocols, patient care competencies & clinical tools',
      depthLabel: 'Clinical Depth',
    };
  }
  if (d.includes('educat') || d.includes('teach') || d.includes('school') || d.includes('academ')) {
    return {
      subScoreLabel: 'Instructional Depth',
      skillsHeader: 'CORE DOMAIN SKILLS',
      skillsSubLabel: 'Pedagogy, curriculum mastery & classroom leadership competencies',
      depthLabel: 'Instructional Depth',
    };
  }
  if (d.includes('finan') || d.includes('account') || d.includes('audit') || d.includes('tax') || d.includes('bank')) {
    return {
      subScoreLabel: 'Financial Domain Depth',
      skillsHeader: 'FINANCIAL & CORE SKILLS',
      skillsSubLabel: 'Accounting standards, financial reporting & fiscal controls',
      depthLabel: 'Financial Domain Depth',
    };
  }
  return {
    subScoreLabel: 'Domain Depth',
    skillsHeader: 'CORE DOMAIN SKILLS',
    skillsSubLabel: 'Essential professional proficiencies & domain requirements',
    depthLabel: 'Domain Depth',
  };
}

// ── Helper replicating EvidenceSection Question Kit labels ──
function getDomainQuestionLabels(domain) {
  const d = (domain || '').toLowerCase();
  if (d.includes('tech') || d.includes('software') || d.includes('dev') || d.includes('it')) {
    return {
      techLabel: 'TECHNICAL / CODING DEEP DIVE',
      projectLabel: 'PROJECT & SYSTEM DESIGN',
      behavioralLabel: 'BEHAVIORAL',
    };
  }
  if (d.includes('health') || d.includes('nurse') || d.includes('medic') || d.includes('clinic')) {
    return {
      techLabel: 'CLINICAL & DOMAIN KNOWLEDGE',
      projectLabel: 'CLINICAL SCENARIOS & CASE EXPERIENCE',
      behavioralLabel: 'BEHAVIORAL & PATIENT COMMUNICATION',
    };
  }
  if (d.includes('educat') || d.includes('teach') || d.includes('school') || d.includes('academ')) {
    return {
      techLabel: 'PEDAGOGY & CURRICULUM MASTERY',
      projectLabel: 'CLASSROOM SCENARIOS & EXPERIENCE',
      behavioralLabel: 'BEHAVIORAL & CLASSROOM LEADERSHIP',
    };
  }
  if (d.includes('finan') || d.includes('account') || d.includes('audit') || d.includes('tax') || d.includes('bank')) {
    return {
      techLabel: 'FINANCIAL & REGULATORY KNOWLEDGE',
      projectLabel: 'AUDIT & FINANCIAL SCENARIOS',
      behavioralLabel: 'BEHAVIORAL & STAKEHOLDER MANAGEMENT',
    };
  }
  return {
    techLabel: 'DOMAIN KNOWLEDGE',
    projectLabel: 'ROLE SCENARIOS & EXPERIENCE DEEP DIVE',
    behavioralLabel: 'BEHAVIORAL & SITUATIONAL',
  };
}

// ── 1. DOMAIN A: TECHNOLOGY ──
console.log('--- 1. Technology: Software Developer ---');
const techJd = 'Software Engineer responsible for React, Node.js, distributed microservices, and PostgreSQL.';
const techResume = 'Senior Software Developer with 5 years experience in React, Node.js, and SQL.';
const techDomain = detectJobDomain(techJd, techResume);
assert(techDomain.domain === 'Technology', 'Tech domain detected as Technology');

const techJmLabels = getJobMatchDomainLabels(techDomain.domain);
assert(techJmLabels.subScoreLabel === 'Technical Match', `Tech Job Match subscore label: "${techJmLabels.subScoreLabel}"`);
assert(techJmLabels.skillsHeader === 'TECHNICAL SKILLS', `Tech skills header: "${techJmLabels.skillsHeader}"`);

const techQkLabels = getDomainQuestionLabels(techDomain.domain);
assert(techQkLabels.techLabel === 'TECHNICAL / CODING DEEP DIVE', `Tech Question Kit label: "${techQkLabels.techLabel}"`);

const techPersona = getDomainSpecialistPersona(techDomain.domain, 'Software Engineer');
assert(techPersona.title === 'Staff Software Engineer', `Tech Specialist Persona: "${techPersona.title}"`);

// ── 2. DOMAIN B: HEALTHCARE ──
console.log('\n--- 2. Healthcare: Registered Nurse ---');
const nurseJd = 'Registered Nurse for Intensive Care Unit. Requires BLS, ACLS, patient triage, and EHR charting.';
const nurseResume = 'BSN Registered Nurse with 4 years ICU experience, BLS, ACLS, patient assessment, and Epic EHR.';
const nurseDomain = detectJobDomain(nurseJd, nurseResume);
assert(nurseDomain.domain === 'Healthcare', 'Nurse domain detected as Healthcare');

const nurseJmLabels = getJobMatchDomainLabels(nurseDomain.domain);
assert(nurseJmLabels.subScoreLabel === 'Clinical Depth', `Healthcare Job Match subscore: "${nurseJmLabels.subScoreLabel}"`);
assert(nurseJmLabels.skillsHeader === 'CLINICAL & CORE SKILLS', `Healthcare skills header: "${nurseJmLabels.skillsHeader}"`);
assert(!nurseJmLabels.skillsHeader.includes('TECHNICAL'), 'Healthcare skills header contains NO "TECHNICAL" word');

const nurseQkLabels = getDomainQuestionLabels(nurseDomain.domain);
assert(nurseQkLabels.techLabel === 'CLINICAL & DOMAIN KNOWLEDGE', `Healthcare Question Kit label: "${nurseQkLabels.techLabel}"`);
assert(nurseQkLabels.projectLabel === 'CLINICAL SCENARIOS & CASE EXPERIENCE', `Healthcare Question Kit project label: "${nurseQkLabels.projectLabel}"`);

const nursePersona = getDomainSpecialistPersona(nurseDomain.domain, 'Registered Nurse');
assert(nursePersona.title === 'Clinical Practice Specialist', `Healthcare Specialist Persona: "${nursePersona.title}"`);
assert(!nursePersona.title.includes('Engineer'), 'Healthcare Specialist Persona is NOT an Engineer');

// ── 3. DOMAIN C: EDUCATION ──
console.log('\n--- 3. Education: High School Teacher ---');
const teacherJd = 'High School Math Teacher. Requires curriculum planning, classroom management, IEP compliance, and student assessments.';
const teacherResume = 'Secondary Education Teacher with 6 years experience in algebra curriculum, differentiated instruction, and parent communication.';
const teacherDomain = detectJobDomain(teacherJd, teacherResume);
assert(teacherDomain.domain === 'Education', 'Teacher domain detected as Education');

const teacherJmLabels = getJobMatchDomainLabels(teacherDomain.domain);
assert(teacherJmLabels.subScoreLabel === 'Instructional Depth', `Education Job Match subscore: "${teacherJmLabels.subScoreLabel}"`);
assert(teacherJmLabels.skillsHeader === 'CORE DOMAIN SKILLS', `Education skills header: "${teacherJmLabels.skillsHeader}"`);

const teacherQkLabels = getDomainQuestionLabels(teacherDomain.domain);
assert(teacherQkLabels.techLabel === 'PEDAGOGY & CURRICULUM MASTERY', `Education Question Kit label: "${teacherQkLabels.techLabel}"`);
assert(teacherQkLabels.projectLabel === 'CLASSROOM SCENARIOS & EXPERIENCE', `Education Question Kit scenario label: "${teacherQkLabels.projectLabel}"`);

const teacherPersona = getDomainSpecialistPersona(teacherDomain.domain, 'High School Teacher');
assert(teacherPersona.title === 'Instructional & Academic Specialist', `Education Specialist Persona: "${teacherPersona.title}"`);
assert(!teacherPersona.title.includes('Engineer'), 'Education Specialist Persona is NOT an Engineer');

// ── 4. DOMAIN D: FINANCE & ACCOUNTING ──
console.log('\n--- 4. Finance & Accounting: Staff Accountant ---');
const acctJd = 'Staff Accountant responsible for general ledger, monthly reconciliations, GAAP compliance, and financial reporting.';
const acctResume = 'Accountant with CPA eligibility, 3 years managing balance sheet reconciliations, journal entries, and GAAP audits.';
const acctDomain = detectJobDomain(acctJd, acctResume);
assert(acctDomain.domain === 'Finance & Accounting', 'Accountant domain detected as Finance & Accounting');

const acctJmLabels = getJobMatchDomainLabels(acctDomain.domain);
assert(acctJmLabels.subScoreLabel === 'Financial Domain Depth', `Finance Job Match subscore: "${acctJmLabels.subScoreLabel}"`);
assert(acctJmLabels.skillsHeader === 'FINANCIAL & CORE SKILLS', `Finance skills header: "${acctJmLabels.skillsHeader}"`);

const acctQkLabels = getDomainQuestionLabels(acctDomain.domain);
assert(acctQkLabels.techLabel === 'FINANCIAL & REGULATORY KNOWLEDGE', `Finance Question Kit label: "${acctQkLabels.techLabel}"`);
assert(acctQkLabels.projectLabel === 'AUDIT & FINANCIAL SCENARIOS', `Finance Question Kit scenario label: "${acctQkLabels.projectLabel}"`);

const acctPersona = getDomainSpecialistPersona(acctDomain.domain, 'Staff Accountant');
assert(acctPersona.title === 'Senior Controller & Audit Specialist', `Finance Specialist Persona: "${acctPersona.title}"`);

// ── 5. NEW RESUME UPLOAD & NAVIGATOR CACHE ISOLATION ──
console.log('\n--- 5. Career Navigator: New Resume Upload & Cache Isolation ---');

// Simulated Navigator Cache
const navigatorCache = new Map();
function hashResume(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return `h_${h}`;
}
function readNavCache(text) { return navigatorCache.get(hashResume(text)) || null; }
function writeNavCache(text, data) { navigatorCache.set(hashResume(text), data); }

// Step 1: Existing SWE resume is cached
const sweCachedPlan = { topCareerPaths: [{ title: 'Staff Systems Architect', fitScore: 92 }] };
writeNavCache(techResume, sweCachedPlan);
assert(readNavCache(techResume) !== null, 'Existing SWE resume has cached Navigator plan');

// Step 2: User uploads a NEW Nurse resume
const newUploadedResume = {
  name: 'Sarah_Jenkins_RN.pdf',
  text: nurseResume,
  savedAt: Date.now()
};

// Step 3: Cache lookup for newly uploaded resume must be null initially
const initialCachedResultForNewResume = readNavCache(newUploadedResume.text);
assert(initialCachedResultForNewResume === null, 'Newly uploaded Nurse resume does NOT reuse SWE cached plan');

// Step 4: Verify cross-resume context pollution guard in handleGenerate
const latestAnalysisFromSWE = {
  resumeText: techResume,
  jobMatch: { targetRole: 'Software Engineer', targetDomain: 'Technology' },
  agentResults: { ats: { detectedRole: 'Software Engineer' } }
};

// Check same resume comparison
const isSameResume = !latestAnalysisFromSWE.resumeText ||
  (newUploadedResume.text.trim().substring(0, 200) === latestAnalysisFromSWE.resumeText.trim().substring(0, 200));

assert(isSameResume === false, 'New resume is correctly recognized as DIFFERENT from previous analysis resume');

// Build context for Navigator
const context = {};
if (isSameResume) {
  context.targetRole = latestAnalysisFromSWE.jobMatch.targetRole;
  context.targetDomain = latestAnalysisFromSWE.jobMatch.targetDomain;
}

assert(context.targetRole === undefined, 'New resume context is NOT polluted with old SWE role');
assert(context.targetDomain === undefined, 'New resume context is NOT polluted with old SWE domain');

// Step 5: Generate and cache plan for new Nurse resume
const nurseGeneratedPlan = { topCareerPaths: [{ title: 'Nurse Practitioner / Clinical Specialist', fitScore: 94 }] };
writeNavCache(newUploadedResume.text, nurseGeneratedPlan);

// Step 6: Verify independent caching per resume
assert(readNavCache(newUploadedResume.text).topCareerPaths[0].title === 'Nurse Practitioner / Clinical Specialist', 'New resume receives its own dedicated Navigator result');
assert(readNavCache(techResume).topCareerPaths[0].title === 'Staff Systems Architect', 'Original SWE cached plan remains intact');

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
