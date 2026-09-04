// End-to-end verification of the REAL CareerLens pipeline (ATS → Recruiter →
// Engineer → Hiring Manager → Optimizer → Final Job Match Report).
//
// Runs the actual src/services modules (prompts, retry logic, API client) through
// Vite's SSR loader, so import.meta.env and the /api/groq dev proxy behave like
// the browser app. Uses the real Groq API key from .env — costs a few calls.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5199;

const AGENT_ORDER = ['ats', 'recruiter', 'engineer', 'manager', 'optimizer'];

const RESUME = `SAM JONES
Full-Stack Developer | sam.jones@email.com | (555) 010-2030

SKILLS
Python, ReactJS, NodeJS, Docker, PostgreSQL, RESTful APIs, Express, Git, Agile

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
- REST APIs, microservices, and a solid understanding of data structures and algorithms.

NICE TO HAVE
- GraphQL, Redis`;

const server = await createServer({
  root,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
});
await server.listen();

// The API client calls a relative URL (/api/groq/...) that Vite proxies to
// api.groq.com in dev. In Node, resolve relative URLs to our local server.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const resolved = url.startsWith('/') ? `http://127.0.0.1:${PORT}${url}` : url;
  return nativeFetch(resolved, init);
};

let failures = 0;
const check = (label, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) { failures++; console.log(`✗ ${label} expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`); }
  else console.log(`✓ ${label}`);
};
const isInt01_100 = (v) => Number.isInteger(v) && v >= 0 && v <= 100;

try {
  const hiringApi = await server.ssrLoadModule('/src/services/hiringApi.js');
  const { computeJobMatch, MATCH_WEIGHTS } = await server.ssrLoadModule('/src/services/jobMatch.js');

  console.log('=== Running 5-agent pipeline (real Groq API) ===');
  const agentResults = {};
  const agentErrors = {};
  for (const agentId of AGENT_ORDER) {
    try {
      const result = await hiringApi.analyzeWithAgent(agentId, RESUME, JD, 'general');
      agentResults[agentId] = result;
      const score = agentId === 'optimizer' ? result.overallImpactScore : result.score;
      console.log(`[${agentId}] OK — score: ${score}`);
      console.log(`    ${JSON.stringify(result).slice(0, agentId === 'optimizer' ? 1500 : 400)}`);
    } catch (err) {
      agentErrors[agentId] = err.message || String(err);
      console.log(`[${agentId}] FAILED — ${agentErrors[agentId]}`);
    }
  }

  // All five agents must have actually executed and produced structured output.
  for (const agentId of AGENT_ORDER) {
    check(`agent executed: ${agentId}`, !!agentResults[agentId] && typeof agentResults[agentId] === 'object', true);
  }
  check('ATS score present', Number.isFinite(Number(agentResults.ats?.score)), true);
  check('Recruiter structured fields present', Array.isArray(agentResults.recruiter?.strongProjects) && Array.isArray(agentResults.recruiter?.missingExperience), true);
  check('Engineer structured fields present', Array.isArray(agentResults.engineer?.weakTechnicalAreas) && Array.isArray(agentResults.engineer?.likelyInterviewQuestions), true);
  check('Manager decision present', ['HIRE', 'MAYBE', 'REJECT'].includes(agentResults.manager?.decision), true);
  check('Optimizer improved bullets present', Array.isArray(agentResults.optimizer?.improvedBullets), true);

  // ── Final Job Match Report (deterministic) ───────────────────────────────
  const jobMatch = computeJobMatch({ resumeText: RESUME, jobDescription: JD, agentResults });
  console.log('\n=== jobMatch ===');
  console.log(JSON.stringify(jobMatch, null, 2));

  check('jobMatch keys', Object.keys(jobMatch).sort(), ['atsCompatibility', 'experienceMatch', 'matchedSkills', 'missingSkills', 'overallMatch', 'recommendations', 'requirementBreakdown', 'skillsMatch', 'technicalMatch', 'topGaps', 'weakSkills'].sort());
  check('requirementBreakdown has 4 categorized arrays', ['technicalSkills', 'responsibilities', 'experienceRequirements', 'softSkills'].every((k) => Array.isArray(jobMatch.requirementBreakdown?.[k])), true);
  for (const k of ['overallMatch', 'atsCompatibility', 'skillsMatch', 'experienceMatch', 'technicalMatch']) {
    check(`jobMatch.${k} is int 0–100`, isInt01_100(jobMatch[k]), true);
  }
  check('matchedSkills populated', Array.isArray(jobMatch.matchedSkills) && jobMatch.matchedSkills.length > 0, true);
  check('matchedSkills grounded (React)', jobMatch.matchedSkills.includes('React'), true);
  check('matchedSkills grounded (Node.js normalized from NodeJS)', jobMatch.matchedSkills.includes('Node.js'), true);
  check('missingSkills populated', Array.isArray(jobMatch.missingSkills) && jobMatch.missingSkills.length > 0, true);
  check('missingSkills grounded (SQL)', jobMatch.missingSkills.includes('SQL'), true);
  check('topGaps populated & shaped', jobMatch.topGaps.length > 0 && jobMatch.topGaps.every((g) => typeof g.skill === 'string' && ['high', 'medium'].includes(g.importance) && typeof g.reason === 'string'), true);
  check('recommendations 3–5', jobMatch.recommendations.length >= 3 && jobMatch.recommendations.length <= 5, true);
  console.log('weights:', JSON.stringify(MATCH_WEIGHTS));

  // ── Final recommendation (existing fields must remain intact) ────────────
  console.log('\n=== recommendation ===');
  const recommendation = await hiringApi.generateHiringRecommendation(RESUME, JD, agentResults, 'general', jobMatch);
  console.log(JSON.stringify(recommendation, null, 2));

  const recFields = ['overallMatch', 'recommendation', 'actionableTakeaway', 'keyStrengths', 'keyWeaknesses', 'hiringInsight', 'nextStep'];
  for (const f of recFields) check(`recommendation.${f} present`, f in recommendation, true);
  check('recommendation label valid', ['SHORTLIST', 'MAYBE', 'NOT_ALIGNED'].includes(recommendation.recommendation), true);
  check('recommendation.overallMatch === jobMatch.overallMatch', recommendation.overallMatch === jobMatch.overallMatch, true);

  console.log(`\n${failures === 0 ? 'ALL E2E CHECKS PASSED' : `${failures} CHECK(S) FAILED`} (agentErrors: ${JSON.stringify(agentErrors)})`);
} catch (err) {
  failures++;
  console.error('E2E harness crashed:', err);
} finally {
  globalThis.fetch = nativeFetch;
  await server.close();
}

process.exit(failures === 0 ? 0 : 1);
