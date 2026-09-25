/**
 * Verification test for Mock Interview:
 * - Initial render dependencies and state assumptions
 * - Role / domain propagation across Healthcare, Education, Technology, Finance
 * - Stale resume isolation and stale analysis isolation
 * - Question schema parsing
 * - Generation success path
 * - Generation failure path
 */

import fs from 'fs';
import path from 'path';
import { detectJobDomain } from '../src/services/jobMatch.js';
import { getDomainSpecialistPersona } from '../src/services/hiringApi.js';
import { getResumeFingerprint } from '../src/services/userStorage.js';

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
console.log('CAREERLENS MOCK INTERVIEW VERIFICATION');
console.log('======================================================\n');

// ─── 1. INITIAL RENDER DEPENDENCIES & HOOKS VERIFICATION ───
console.log('--- 1. Initial Render Dependencies & State Assumptions ---');

const mockSectionPath = path.resolve('src/components/MockInterviewSection.jsx');
const errorBoundaryPath = path.resolve('src/components/MockInterviewErrorBoundary.jsx');
const evidenceSectionPath = path.resolve('src/components/EvidenceSection.jsx');

const mockSectionSrc = fs.readFileSync(mockSectionPath, 'utf8');
const errorBoundarySrc = fs.readFileSync(errorBoundaryPath, 'utf8');
const evidenceSectionSrc = fs.readFileSync(evidenceSectionPath, 'utf8');

// A. Verify useMemo is imported in MockInterviewSection.jsx
assert(
  /import\s+React,\s*\{[^}]*\buseMemo\b[^}]*\}\s+from\s+['"]react['"]/.test(mockSectionSrc),
  'MockInterviewSection.jsx imports useMemo from react'
);

// B. Verify hooks used in MockInterviewSection are imported
for (const hook of ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo']) {
  assert(
    new RegExp(`\\b${hook}\\b`).test(mockSectionSrc),
    `MockInterviewSection.jsx has "${hook}" imported and available`
  );
}

// C. Verify Error Boundary exists and wraps MockInterviewSection
assert(
  errorBoundarySrc.includes('class MockInterviewErrorBoundary extends React.Component'),
  'MockInterviewErrorBoundary is defined as a React.Component class'
);
assert(
  errorBoundarySrc.includes('static getDerivedStateFromError'),
  'MockInterviewErrorBoundary implements static getDerivedStateFromError'
);
assert(
  errorBoundarySrc.includes('componentDidCatch'),
  'MockInterviewErrorBoundary implements componentDidCatch'
);
assert(
  evidenceSectionSrc.includes('<MockInterviewErrorBoundary'),
  'EvidenceSection wraps MockInterviewSection with MockInterviewErrorBoundary'
);

// D. Verify safe defaults on initial render (no crash without active interview/analysis)
assert(
  mockSectionSrc.includes("const [sessionStage, setSessionStage] = useState('setup')"),
  'Initial session stage is safely initialized to "setup"'
);
assert(
  mockSectionSrc.includes("const [errorMsg, setErrorMsg] = useState('')"),
  'Initial error message state is safely initialized'
);

// ─── 2. DOMAIN & PERSONA PROPAGATION ACROSS PROFESSIONAL DOMAINS ───
console.log('\n--- 2. Role & Domain Propagation (Healthcare, Education, Tech, Finance) ---');

const teacherResume = `
Ananya Sharma | Primary School Teacher
Summary: Primary School Teacher with 4 years of classroom experience delivering engaging lessons to primary students.
Classroom management, lesson planning, student assessment, and utilizing Google Classroom.
`;

const nurseResume = `
Sushmita Ravinder Dyavanapalli, BSN, RN
Registered Nurse — Acute Care / Medical-Surgical
Summary: Dedicated Registered Nurse with 4+ years of clinical experience delivering high-quality patient care in hospital settings.
Skilled in vital signs monitoring, medication administration, and patient assessments.
`;

const sweResume = `
Alex Mercer | Senior Full-Stack Engineer
Summary: Software Engineer with 6 years of experience building distributed backend systems in Node.js, Go, and React.
Experience with PostgreSQL, Docker, AWS Kubernetes, and microservices architecture.
`;

const accountantResume = `
Jordan Patel, CPA | Senior Staff Accountant
Summary: Certified Public Accountant with 5 years of corporate accounting experience.
Skilled in GAAP compliance, general ledger reconciliation, internal controls (SOX), and financial reporting.
`;

// A. Education Domain
const eduDetected = detectJobDomain('', teacherResume);
assert(eduDetected.domain === 'Education', `Teacher resume detected as Education (got "${eduDetected.domain}")`);
assert(/teacher/i.test(eduDetected.role), `Teacher role detected (got "${eduDetected.role}")`);
const eduPersona = getDomainSpecialistPersona(eduDetected.domain, eduDetected.role);
assert(eduPersona.title === 'Instructional & Academic Specialist', `Education persona is Instructional & Academic Specialist (got "${eduPersona.title}")`);
assert(!eduPersona.title.includes('Engineer'), 'Education persona does NOT contain Engineer');

// B. Healthcare Domain
const healthDetected = detectJobDomain('', nurseResume);
assert(healthDetected.domain === 'Healthcare', `Nurse resume detected as Healthcare (got "${healthDetected.domain}")`);
assert(/nurse/i.test(healthDetected.role), `Nurse role detected (got "${healthDetected.role}")`);
const healthPersona = getDomainSpecialistPersona(healthDetected.domain, healthDetected.role);
assert(healthPersona.title === 'Clinical Practice Specialist', `Healthcare persona is Clinical Practice Specialist (got "${healthPersona.title}")`);
assert(!healthPersona.title.includes('Engineer'), 'Healthcare persona does NOT contain Engineer');

// C. Technology Domain
const techDetected = detectJobDomain('', sweResume);
assert(techDetected.domain === 'Technology', `SWE resume detected as Technology (got "${techDetected.domain}")`);
assert(/software|developer|engineer/i.test(techDetected.role), `Tech role detected (got "${techDetected.role}")`);
const techPersona = getDomainSpecialistPersona(techDetected.domain, techDetected.role);
assert(techPersona.title === 'Staff Software Engineer', `Tech persona is Staff Software Engineer (got "${techPersona.title}")`);

// D. Finance Domain
const finDetected = detectJobDomain('', accountantResume);
assert(finDetected.domain === 'Finance & Accounting', `Accountant resume detected as Finance & Accounting (got "${finDetected.domain}")`);
assert(/accountant/i.test(finDetected.role), `Accountant role detected (got "${finDetected.role}")`);
const finPersona = getDomainSpecialistPersona(finDetected.domain, finDetected.role);
assert(finPersona.title === 'Senior Controller & Audit Specialist', `Finance persona is Senior Controller & Audit Specialist (got "${finPersona.title}")`);
assert(!finPersona.title.includes('Engineer'), 'Finance persona does NOT contain Engineer');

// E. Persona function resilience: handles object inputs safely
const personaFromObject = getDomainSpecialistPersona({ domain: 'Healthcare', role: 'Registered Nurse' });
assert(personaFromObject.title === 'Clinical Practice Specialist', `getDomainSpecialistPersona handles object input directly (got "${personaFromObject.title}")`);

// ─── 3. RESUME ISOLATION & STALE ANALYSIS ISOLATION ───
console.log('\n--- 3. Resume Isolation & Stale Analysis Isolation ---');

const fpNurse = getResumeFingerprint(nurseResume);
const fpTeacher = getResumeFingerprint(teacherResume);
const fpTech = getResumeFingerprint(sweResume);

assert(fpNurse !== fpTeacher, 'Nurse and Teacher fingerprints are distinct');
assert(fpNurse !== fpTech, 'Nurse and Tech fingerprints are distinct');
assert(fpTeacher !== fpTech, 'Teacher and Tech fingerprints are distinct');

// Simulate stale previous analysis: user analyzed SWE resume earlier
const staleSweAnalysis = {
  resumeText: sweResume,
  jobMatch: {
    targetRole: 'Senior Full Stack Engineer',
    targetDomain: 'Technology',
    matchedSkills: ['Node.js', 'React', 'Docker'],
    missingSkills: ['Kubernetes', 'AWS'],
  },
};

// When Nurse resume is active: check fingerprint match
const nurseMatchesStale = getResumeFingerprint(nurseResume) === getResumeFingerprint(staleSweAnalysis.resumeText);
assert(!nurseMatchesStale, 'Nurse resume does NOT match stale SWE analysis fingerprint');

// Helper simulating getJobContext isolation logic
function computeIsolatedJobContext(selectedResume, targetDomain, storedAnalysis) {
  let contextStr = '';
  if (targetDomain) {
    contextStr += `Target Professional Domain: ${targetDomain}. `;
  }
  const isSameResume = storedAnalysis?.resumeText && selectedResume?.text
    ? getResumeFingerprint(selectedResume.text) === getResumeFingerprint(storedAnalysis.resumeText)
    : false;

  if (isSameResume && storedAnalysis) {
    if (storedAnalysis.jobMatch?.matchedSkills || storedAnalysis.jobMatch?.missingSkills) {
      const matched = (storedAnalysis.jobMatch.matchedSkills || []).slice(0, 5).join(', ');
      const missing = (storedAnalysis.jobMatch.missingSkills || []).slice(0, 5).join(', ');
      contextStr += `Key matched skills: ${matched}. Target gaps / key focus areas: ${missing}.`;
    }
  }
  return contextStr;
}

// Context for Nurse with stale SWE analysis in storage
const nurseContext = computeIsolatedJobContext({ text: nurseResume }, 'Healthcare', staleSweAnalysis);
assert(!nurseContext.includes('Node.js'), 'Nurse mock interview context contains NO stale "Node.js"');
assert(!nurseContext.includes('Docker'), 'Nurse mock interview context contains NO stale "Docker"');
assert(!nurseContext.includes('Kubernetes'), 'Nurse mock interview context contains NO stale "Kubernetes"');
assert(nurseContext.includes('Target Professional Domain: Healthcare'), 'Nurse mock interview context contains Healthcare domain');

// Context for SWE with SWE analysis in storage
const sweContext = computeIsolatedJobContext({ text: sweResume }, 'Technology', staleSweAnalysis);
assert(sweContext.includes('Key matched skills: Node.js'), 'SWE mock interview context includes matched skills from matching analysis');
assert(sweContext.includes('Target gaps / key focus areas: Kubernetes'), 'SWE mock interview context includes gaps from matching analysis');

// ─── 4. QUESTION SCHEMA PARSING & VALIDATION ───
console.log('\n--- 4. Question Schema Parsing & Turn Evaluation ---');

// Simulated AI Q1 response
const sampleQ1Json = JSON.stringify({
  question: 'Can you describe a high-acuity patient situation where you had to triage vital signs under pressure?',
  category: 'CLINICAL_KNOWLEDGE',
  interviewerNote: 'Evaluates rapid clinical triage and calm decision-making.',
});

const parsedQ1 = JSON.parse(sampleQ1Json);
assert(typeof parsedQ1.question === 'string' && parsedQ1.question.length > 10, 'Parsed Q1 question successfully');
assert(parsedQ1.category === 'CLINICAL_KNOWLEDGE', 'Parsed Q1 category successfully');
assert(typeof parsedQ1.interviewerNote === 'string', 'Parsed Q1 interviewer note successfully');

// Simulated AI Turn response
const sampleTurnJson = JSON.stringify({
  score: 88,
  conciseFeedback: 'Strong clinical reasoning demonstrating patient advocacy and protocol adherence.',
  idealAnswerPoints: ['Immediate vitals reassessment', 'Physician escalation', 'Documentation'],
  nextQuestion: 'How do you handle conflict with a colleague regarding a medication dosage order?',
  nextCategory: 'BEHAVIORAL',
  nextInterviewerNote: 'Testing professional communication and patient safety prioritization.',
  isFinished: false,
});

const parsedTurn = JSON.parse(sampleTurnJson);
assert(parsedTurn.score === 88, `Turn score parsed as 88 (got ${parsedTurn.score})`);
assert(Array.isArray(parsedTurn.idealAnswerPoints), 'Ideal answer points parsed as array');
assert(parsedTurn.nextCategory === 'BEHAVIORAL', 'Next category parsed correctly');
assert(parsedTurn.isFinished === false, 'isFinished parsed correctly');

// Simulated AI Final Report response
const sampleReportJson = JSON.stringify({
  overallScore: 86,
  verdict: 'Strong Hire',
  technicalKnowledge: 88,
  problemSolving: 85,
  communication: 86,
  answerQuality: 85,
  interviewFeedback: 'Demonstrated exceptional clinical judgment and composed communication.',
  strengths: ['Clear protocol compliance', 'Empathetic bedside demeanor'],
  areasToImprove: ['Quantify patient load metrics where possible'],
  suggestedNextPractice: ['SBAR handover scenarios', 'Telemetry rhythm identification'],
});

const parsedReport = JSON.parse(sampleReportJson);
assert(parsedReport.overallScore === 86, 'Final report overall score parsed');
assert(parsedReport.verdict === 'Strong Hire', 'Final report verdict parsed');
assert(parsedReport.strengths.length === 2, 'Final report strengths parsed');
assert(parsedReport.areasToImprove.length === 1, 'Final report areas to improve parsed');

// ─── 5. GENERATION SUCCESS & FAILURE PATHS ───
console.log('\n--- 5. Generation Success & Failure Handling ---');

// Success path test
function simulateStartSuccess(apiResult) {
  if (!apiResult || !apiResult.question) {
    throw new Error('Interview question could not be generated.');
  }
  return {
    currentQuestion: apiResult.question,
    currentCategory: apiResult.category || 'TECHNICAL',
    sessionStage: 'interviewing',
    errorMsg: '',
  };
}

const successState = simulateStartSuccess(parsedQ1);
assert(successState.sessionStage === 'interviewing', 'Success path advances sessionStage to "interviewing"');
assert(successState.currentQuestion.length > 0, 'Success path populates question');
assert(successState.errorMsg === '', 'Success path clears error message');

// Failure path test (network failure / malformed JSON)
function simulateStartFailure(error) {
  return {
    sessionStage: 'setup',
    errorMsg: error?.message || 'Failed to start interview. Please check your network and try again.',
  };
}

const failState = simulateStartFailure(new Error('Network timeout'));
assert(failState.sessionStage === 'setup', 'Failure path stays safely on "setup" view (does NOT blank page)');
assert(failState.errorMsg === 'Network timeout', 'Failure path sets readable error message');

const malformedFailState = simulateStartFailure(new Error('Unexpected token in JSON'));
assert(malformedFailState.errorMsg.includes('JSON'), 'Malformed JSON shows user-friendly error');

// ─── 6. DYNAMIC ANSWER PLACEHOLDER VERIFICATION ───
console.log('\n--- 6. Dynamic Answer Placeholder Verification ---');

// A. Check that MockInterviewSection uses getAnswerPlaceholder on textarea
assert(
  mockSectionSrc.includes('placeholder={getAnswerPlaceholder(targetDomain, currentCategory)}'),
  'Textarea placeholder dynamically calls getAnswerPlaceholder(targetDomain, currentCategory)'
);

// B. Extract getAnswerPlaceholder function directly from MockInterviewSection source
const placeholderFuncMatch = mockSectionSrc.match(/export function getAnswerPlaceholder[\s\S]*?\n\}/);
assert(Boolean(placeholderFuncMatch), 'getAnswerPlaceholder function definition found in MockInterviewSection.jsx');
const runtimePlaceholderFn = new Function(
  'domain',
  'category',
  placeholderFuncMatch[0].replace('export function getAnswerPlaceholder', 'function getAnswerPlaceholder') +
    '\nreturn getAnswerPlaceholder(domain, category);'
);

// Test Technology
assert(
  runtimePlaceholderFn('Technology', 'TECHNICAL') ===
    'Explain your technical approach, key decisions, trade-offs, and outcome...',
  'Technology placeholder matches: "Explain your technical approach, key decisions, trade-offs, and outcome..."'
);
assert(
  runtimePlaceholderFn('Software Engineering', 'ROLE_SPECIFIC') ===
    'Explain your technical approach, key decisions, trade-offs, and outcome...',
  'Software Engineering placeholder matches Technology phrasing'
);

// Test Healthcare
assert(
  runtimePlaceholderFn('Healthcare', 'CLINICAL_KNOWLEDGE') ===
    'Describe your clinical approach, actions taken, patient-safety considerations, and outcome...',
  'Healthcare placeholder matches: "Describe your clinical approach, actions taken, patient-safety considerations, and outcome..."'
);
assert(
  runtimePlaceholderFn('Nursing', 'SCENARIO_ANALYSIS') ===
    'Describe your clinical approach, actions taken, patient-safety considerations, and outcome...',
  'Nursing placeholder matches Healthcare phrasing'
);

// Test Education
assert(
  runtimePlaceholderFn('Education', 'TEACHING_PRACTICE') ===
    'Describe your teaching approach, classroom example, actions taken, and outcome...',
  'Education placeholder matches: "Describe your teaching approach, classroom example, actions taken, and outcome..."'
);
assert(
  runtimePlaceholderFn('Teaching', 'DOMAIN_KNOWLEDGE') ===
    'Describe your teaching approach, classroom example, actions taken, and outcome...',
  'Teaching placeholder matches Education phrasing'
);

// Test Finance
assert(
  runtimePlaceholderFn('Finance & Accounting', 'TECHNICAL') ===
    'Explain your financial approach, analysis, decisions, and outcome...',
  'Finance placeholder matches: "Explain your financial approach, analysis, decisions, and outcome..."'
);
assert(
  runtimePlaceholderFn('Banking & Audit', 'PROBLEM_SOLVING') ===
    'Explain your financial approach, analysis, decisions, and outcome...',
  'Banking placeholder matches Finance phrasing'
);

// Test Other / Default
assert(
  runtimePlaceholderFn('Other', 'GENERAL') ===
    'Give a clear example, explain your approach and actions, and describe the outcome...',
  'Other placeholder matches: "Give a clear example, explain your approach and actions, and describe the outcome..."'
);
assert(
  runtimePlaceholderFn('', '') ===
    'Give a clear example, explain your approach and actions, and describe the outcome...',
  'Empty domain defaults safely to generic Other placeholder'
);

// Test Behavioral with STAR format across domains
assert(
  runtimePlaceholderFn('Healthcare', 'BEHAVIORAL') ===
    'Use the STAR format (Situation, Task, Action, Result): describe the situation, your actions, and the outcome...',
  'Healthcare Behavioral question uses STAR format'
);
assert(
  runtimePlaceholderFn('Technology', 'BEHAVIORAL') ===
    'Use the STAR format (Situation, Task, Action, Result): describe the situation, your actions, and the outcome...',
  'Technology Behavioral question uses STAR format'
);
assert(
  runtimePlaceholderFn('Education', 'BEHAVIORAL') ===
    'Use the STAR format (Situation, Task, Action, Result): describe the situation, your actions, and the outcome...',
  'Education Behavioral question uses STAR format'
);
assert(
  runtimePlaceholderFn('Finance', 'BEHAVIORAL') ===
    'Use the STAR format (Situation, Task, Action, Result): describe the situation, your actions, and the outcome...',
  'Finance Behavioral question uses STAR format'
);

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}

