// Offline verification for src/services/jobMatch.js — no network, no AI calls.
import { computeJobMatch, MATCH_WEIGHTS } from '../src/services/jobMatch.js';

let failures = 0;
const check = (label, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    failures++;
    console.log(`✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`✓ ${label}`);
  }
};
const intInRange = (label, v) => {
  const pass = Number.isInteger(v) && v >= 0 && v <= 100;
  if (!pass) { failures++; console.log(`✗ ${label}: ${v} is not an int in 0..100`); }
  else console.log(`✓ ${label}: ${v}`);
};

// ── Fixture: real-ish resume + job description ──────────────────────────────
const RESUME = `SAM JONES
Full-Stack Developer | sam.jones@email.com | (555) 010-2030

SKILLS
Python, ReactJS, NodeJS, Docker, PostgreSQL, RESTful APIs, Express, Git, agile, basic TypeScript

EXPERIENCE
Senior Developer — FinTech Labs (2019–Present)
- Built RESTful APIs with Express running on NodeJS serving 20k daily users.
- Developed a React SPA used by the internal ops team for reporting.
- Automated deployment with Docker containers and PostgreSQL schema migrations.

EXPERIENCE
Junior Developer — WebShop (2016–2019)
- Maintained Python backend services and fixed production bugs.
- Worked with Git-based workflows in an agile team of six.

EDUCATION
B.S. Computer Science`;

const JD = `Software Engineer — Product Team
We are looking for a full-stack engineer to own features end to end.

REQUIREMENTS
- Strong React.js experience building modern single page applications.
- Production experience with Node.js backend services.
- Solid Python or Java skills.
- Working knowledge of SQL and databases such as PostgreSQL.
- Experience with AWS (EC2, S3) is required.
- CI/CD pipelines (GitHub Actions) and Docker are a plus.
- Familiarity with TypeScript preferred.
- REST APIs, microservices, and solid understanding of data structures and algorithms.

NICE TO HAVE
- GraphQL, Redis`;

const agentResults = {
  ats: { score: 72, missingKeywords: ['AWS', 'TypeScript', 'GraphQL'], presentKeywords: ['React', 'Python', 'PostgreSQL'], suggestions: ['Add AWS keywords to the skills section.', 'Quantify project impact in the top role.'] },
  recruiter: { score: 68, strongProjects: ['FinTech Labs REST platform'], weakProjects: ['Limited cloud exposure'], missingExperience: ['AWS deployments'], techStackAlignment: 'Good React/Node/Python alignment.' },
  engineer: { score: 61, strongTechnicalAreas: ['React', 'Node.js'], weakTechnicalAreas: ['System Design', 'TypeScript'], likelyInterviewQuestions: ['Design a rate limiter?'], architectureObservation: 'Monolith services.' },
  manager: { decision: 'MAYBE', score: 63, reasons: ['Solid stack fit'], summary: 'Shortlist pending cloud evidence.' },
  optimizer: { overallImpactScore: 55, summary: 'Wording improved.' },
};

const m = computeJobMatch({ resumeText: RESUME, jobDescription: JD, agentResults });

for (const k of ['overallMatch', 'atsCompatibility', 'skillsMatch', 'experienceMatch', 'technicalMatch']) {
  intInRange(`${k} is 0–100`, m[k]);
}

// ── Normalization: "ReactJS"/"NodeJS" in resume ↔ "React.js"/"Node.js" in JD ─
check('matchedSkills contains React + Node.js (normalized)', m.matchedSkills.includes('React') && m.matchedSkills.includes('Node.js'), true);
check('matchedSkills does NOT contain Java', m.matchedSkills.includes('Java'), false);
check('missingSkills contains AWS', m.missingSkills.includes('AWS'), true);
check('missingSkills does NOT contain TypeScript (moved to weak)', m.missingSkills.includes('TypeScript'), false);
check('missingSkills does NOT contain Python', m.missingSkills.includes('Python'), false);
check('weakSkills contains TypeScript (agent flagged, some evidence)', m.weakSkills.includes('TypeScript'), true);
check('matchedSkills does NOT contain TypeScript (moved to weak)', m.matchedSkills.includes('TypeScript'), false);
check('matchedSkills contains Docker (present in both texts)', m.matchedSkills.includes('Docker'), true);

console.log('skillsMatch actual:', m.skillsMatch, '(canonical coverage incl. half-credit weak)');
console.log('matchedSkills:', m.matchedSkills.join(', '));
console.log('missingSkills:', m.missingSkills.join(', '));
console.log('weakSkills:', m.weakSkills.join(', '));
console.log('topGaps:', JSON.stringify(m.topGaps, null, 1));
console.log('recommendations:', JSON.stringify(m.recommendations, null, 1));
console.log('overallMatch actual:', m.overallMatch, 'weights:', MATCH_WEIGHTS);

// ── React Native must NOT satisfy a plain "React" requirement ───────────────
const rnResume = 'Mobile dev. Built apps with React Native and Firebase.';
const rnJd = 'Mobile Engineer with React Native experience shipping iOS and Android apps.';
const m2 = computeJobMatch({ resumeText: rnResume, jobDescription: rnJd, agentResults: {} });
check('React NOT claimed when only React Native present', m2.matchedSkills.includes('React'), false);
check('React Native claimed when present in both', m2.matchedSkills.includes('React Native'), true);

// ── Manager REJECT caps overallMatch ────────────────────────────────────────
const rejectResults = { ...agentResults, manager: { ...agentResults.manager, decision: 'REJECT', score: 30 } };
const m3 = computeJobMatch({ resumeText: RESUME, jobDescription: JD, agentResults: rejectResults });
check('REJECT caps overall at 45', m3.overallMatch <= 45, true);
console.log('overallMatch under REJECT:', m3.overallMatch);

// ── Full agent failure still degrades deterministically (no crash) ─────────
const m4 = computeJobMatch({ resumeText: RESUME, jobDescription: JD, agentResults: {} });
for (const k of ['overallMatch', 'atsCompatibility', 'skillsMatch', 'experienceMatch', 'technicalMatch']) {
  intInRange(`no-agents ${k} is 0–100`, m4[k]);
}
check('no-agents matchedSkills still grounded in texts', m4.matchedSkills.includes('Python'), true);
check('no-agents missingSkills still grounded in texts', m4.missingSkills.includes('SQL'), true);
console.log('no-agents overallMatch:', m4.overallMatch);

// ── Recommendation fields exist (3–5) ───────────────────────────────────────
check('recommendations 3–5 items', m.recommendations.length >= 3 && m.recommendations.length <= 5, true);

// ── requirementBreakdown exists on every result (new structured field) ──────
check('requirementBreakdown present with 4 arrays', !!m.requirementBreakdown
  && ['technicalSkills', 'responsibilities', 'experienceRequirements', 'softSkills'].every((k) => Array.isArray(m.requirementBreakdown[k])), true);
const rbMain = m.requirementBreakdown;
check('main JD: Databases concept classified as technical (not a missing "skill")', rbMain.technicalSkills.some((t) => t.name === 'Databases'), true);
check('main JD: Database concept matched (PostgreSQL proves databases)', rbMain.technicalSkills.find((t) => t.name === 'Databases')?.status, 'matched');
check('main JD: Web Applications concept present (single page applications)', rbMain.technicalSkills.some((t) => t.name === 'Web Applications'), true);

// ── The EXACT Software Developer JD from the requirement spec ───────────────
const SOFTDEV_JD = 'We are looking for a motivated Software Developer to design, develop, test, and maintain web applications. The candidate should have basic knowledge of programming, databases, and problem-solving skills. Freshers with a willingness to learn are welcome.';
const FRESHER_RESUME = `PRIYA SHARMA
Junior Software Developer | priya.sharma@email.com | (555) 900-1122

PROFILE
Recent graduate with a passion for programming and web applications. Strong problem-solving skills and a willingness to learn new technologies.

SKILLS
Python, JavaScript, React, SQL, Git

PROJECTS
- Developed a web application for a college library using React and SQL.
- Designed and tested a small inventory dashboard as a course project.

EDUCATION
B.S. Computer Science, 2025`;

const softdev = computeJobMatch({ resumeText: FRESHER_RESUME, jobDescription: SOFTDEV_JD, agentResults: {} });
const rb = softdev.requirementBreakdown;
const techNames = rb.technicalSkills.map((t) => t.name);
const techStatus = (name) => rb.technicalSkills.find((t) => t.name === name)?.status;

check('SOFTDEV: technicalSkills contains Programming, Databases, Web Applications',
  ['Programming', 'Databases', 'Web Applications'].every((n) => techNames.includes(n)), true);
check('SOFTDEV: testing is NOT a technical skill', techNames.some((n) => n.toLowerCase() === 'test' || n.toLowerCase() === 'testing'), false);
check('SOFTDEV: maintenance is NOT a technical skill', techNames.some((n) => n.toLowerCase() === 'maintain' || n.toLowerCase() === 'maintenance'), false);
check('SOFTDEV: fresher is NOT a technical skill', techNames.some((n) => n.toLowerCase() === 'fresher'), false);
check('SOFTDEV: Programming matched (resume says programming + Python)', techStatus('Programming'), 'matched');
check('SOFTDEV: Databases matched (resume says SQL)', techStatus('Databases'), 'matched');
check('SOFTDEV: Web Applications matched (resume built one)', techStatus('Web Applications'), 'matched');
check('SOFTDEV: skillsMatch is a grounded deterministic 100 (all 3 concepts evidenced)', softdev.skillsMatch, 100);
check('SOFTDEV: responsibilities phrase contains test + maintain',
  rb.responsibilities.length === 1 && rb.responsibilities[0].name.includes('test') && rb.responsibilities[0].name.includes('maintain'), true);
check('SOFTDEV: responsibility phrase evidenced (Developed/Designed/tested in resume)', rb.responsibilities[0].status, 'matched');
check('SOFTDEV: experienceRequirements contains Fresher', rb.experienceRequirements.some((e) => e.name === 'Fresher'), true);
check('SOFTDEV: Fresher matched (recent graduate, 0 years)', rb.experienceRequirements.find((e) => e.name === 'Fresher')?.status, 'matched');
check('SOFTDEV: problem-solving classified as a soft skill', rb.softSkills.some((s) => s.name === 'Problem Solving'), true);
check('SOFTDEV: Problem Solving matched (resume says problem-solving skills)', rb.softSkills.find((s) => s.name === 'Problem Solving')?.status, 'matched');
check('SOFTDEV: willingness to learn classified as a soft skill', rb.softSkills.some((s) => s.name === 'Willingness to Learn'), true);
check('SOFTDEV: all scores still int 0–100', ['overallMatch', 'atsCompatibility', 'skillsMatch', 'experienceMatch', 'technicalMatch'].every((k) => Number.isInteger(softdev[k]) && softdev[k] >= 0 && softdev[k] <= 100), true);

// ── Experienced candidate vs the same fresher-targeting JD (honest gaps) ────
const softdevExp = computeJobMatch({ resumeText: RESUME, jobDescription: SOFTDEV_JD, agentResults: {} }).requirementBreakdown;
check('SOFTDEV+experienced: Fresher honestly missing (10 years exp, no fresher marker)',
  softdevExp.experienceRequirements.find((e) => e.name === 'Fresher')?.status, 'missing');
check('SOFTDEV+experienced: Programming still matched (Python proof)',
  softdevExp.technicalSkills.find((t) => t.name === 'Programming')?.status, 'matched');
check('SOFTDEV+experienced: Problem Solving missing (not mentioned in resume)',
  softdevExp.softSkills.find((s) => s.name === 'Problem Solving')?.status, 'missing');

// ── Empty resume: everything must degrade to 'missing' with no invented data ─
const softdevNone = computeJobMatch({ resumeText: '', jobDescription: SOFTDEV_JD, agentResults: {} });
check('SOFTDEV+empty resume: skillsMatch deterministically 0', softdevNone.skillsMatch, 0);
check('SOFTDEV+empty resume: all technical statuses missing',
  softdevNone.requirementBreakdown.technicalSkills.length > 0
  && softdevNone.requirementBreakdown.technicalSkills.every((t) => t.status === 'missing'), true);
check('SOFTDEV+empty resume: responsibility status missing',
  softdevNone.requirementBreakdown.responsibilities.every((r) => r.status === 'missing'), true);

// ── Backward compatibility: all pre-existing fields intact on every result ──
const legacyFields = ['overallMatch', 'atsCompatibility', 'skillsMatch', 'experienceMatch', 'technicalMatch', 'matchedSkills', 'missingSkills', 'weakSkills', 'topGaps', 'recommendations'];
check('legacy fields present on new results (incl. empty-agent run)', legacyFields.every((k) => k in softdevNone), true);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
