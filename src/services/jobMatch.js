// ─────────────────────────────────────────────────────────────────────────────
// CareerLens — Resume ↔ Job Description Match Report (deterministic engine)
// -----------------------------------------------------------------------------
// This module is the "Final Match Report" stage of the analysis pipeline. It
// runs AFTER the five agents (ATS → Recruiter → Engineer → Hiring Manager →
// Optimizer) and combines their structured outputs with the raw resume and job
// description text into one explainable `jobMatch` object.
//
// DESIGN RULES
// 1. No random or invented scores. Every number is either an agent-reported
//    score (clamped to 0–100) or a deterministic calculation on the real
//    inputs (documented below).
// 2. Skills are only ever claimed as "matched" when they appear in BOTH the
//    job description and the resume (after safe alias normalization).
// 3. Missing/weak separation: no evidence → missing; some textual evidence but
//    an expert agent flags insufficient depth → weak.
// 4. When an agent's output is unavailable the affected sub-score degrades to
//    the deterministic lexical coverage instead of crashing (agent failures
//    are reported separately in `agentErrors` by the caller).
// 5. This module performs NO network calls and uses NO AI provider — it only
//    combines data the agents already produced.
// 6. `requirementBreakdown` classifies the job description's requirements into
//    four categories (technicalSkills, responsibilities, experienceRequirements,
//    softSkills), each evaluated against the ACTUAL resume text with status
//    'matched' | 'weak' | 'missing'. Generic duties (test, maintain) are never
//    listed as skills, and eligibility terms (fresher, years, degree) are never
//    listed as skills.
// ─────────────────────────────────────────────────────────────────────────────

// ─── SCORE WEIGHTING (documented) ────────────────────────────────────────────
// overallMatch is the weighted average of the four explainable sub-scores:
//   atsCompatibility  25%  — ATS agent score (or lexical keyword coverage fallback)
//   skillsMatch       30%  — deterministic normalized-skill coverage of the JD
//   experienceMatch   25%  — Recruiter agent score (or lexical coverage fallback)
//   technicalMatch    20%  — Engineer agent score (or lexical coverage fallback)
// Skills carry the most weight because they are the most verifiable signal;
// ATS and experience weigh slightly less because they also reflect formatting
// and narrative factors that are secondary to raw fit. Weights sum to 1.0.
export const MATCH_WEIGHTS = Object.freeze({
  ats: 0.25,
  skills: 0.30,
  experience: 0.25,
  technical: 0.20,
});

// Manager decision gate (also documented): the Hiring Manager's verdict is a
// hard signal, so a REJECT caps the blend at 45 and a MAYBE caps it at 85.
// This keeps the numeric match from ever contradicting the shortlist decision.
const MANAGER_DECISION_CAPS = Object.freeze({ REJECT: 45, MAYBE: 85 });

// ─── SKILL LEXICON ───────────────────────────────────────────────────────────
// Curated, conservative list of commonly-required technical skills. Each entry
// maps several written variations ("React.js", "ReactJS", "React") onto one
// canonical label so obvious normalization is safe. Only skills in this lexicon
// participate in the deterministic coverage score; everything else that the
// agents mention is kept as raw phrases in the matched/missing/weak lists.
const SKILL_DEFINITIONS = [
  { name: 'JavaScript', aliases: ['javascript'] },
  { name: 'TypeScript', aliases: ['typescript'] },
  { name: 'HTML', aliases: ['html'] },
  { name: 'CSS', aliases: ['css'] },
  { name: 'React', aliases: ['reactjs', 'react.js', 'react js'] },
  { name: 'React Native', aliases: ['react native', 'react-native'] },
  { name: 'Next.js', aliases: ['next.js', 'nextjs'] },
  { name: 'Vue.js', aliases: ['vue', 'vue.js', 'vuejs'] },
  { name: 'Angular', aliases: ['angular', 'angularjs'] },
  { name: 'Redux', aliases: ['redux'] },
  { name: 'Tailwind CSS', aliases: ['tailwind css', 'tailwindcss', 'tailwind'] },
  { name: 'Bootstrap', aliases: ['bootstrap'] },
  { name: 'SASS', aliases: ['sass', 'scss'] },
  { name: 'jQuery', aliases: ['jquery'] },
  { name: 'Webpack', aliases: ['webpack'] },
  { name: 'Vite', aliases: ['vite'] },
  { name: 'Node.js', aliases: ['node', 'nodejs', 'node.js', 'node js'] },
  { name: 'Express.js', aliases: ['express.js', 'expressjs'] },
  { name: 'Python', aliases: ['python'] },
  { name: 'Django', aliases: ['django'] },
  { name: 'Flask', aliases: ['flask'] },
  { name: 'FastAPI', aliases: ['fastapi', 'fast api'] },
  { name: 'Java', aliases: ['java'] },
  { name: 'Spring Boot', aliases: ['spring boot', 'springboot', 'spring'] },
  { name: 'C++', aliases: ['c++', 'cpp'] },
  { name: 'C#', aliases: ['c#', 'csharp'] },
  { name: '.NET', aliases: ['.net', 'dotnet'] },
  { name: 'ASP.NET', aliases: ['asp.net', 'aspnet'] },
  { name: 'Go', aliases: ['go', 'golang'] },
  { name: 'Ruby', aliases: ['ruby'] },
  { name: 'Ruby on Rails', aliases: ['ruby on rails', 'rails'] },
  { name: 'PHP', aliases: ['php'] },
  { name: 'Swift', aliases: ['swift'] },
  { name: 'Kotlin', aliases: ['kotlin'] },
  { name: 'Rust', aliases: ['rust'] },
  { name: 'Scala', aliases: ['scala'] },
  { name: 'Dart', aliases: ['dart'] },
  { name: 'Objective-C', aliases: ['objective-c', 'objective c'] },
  { name: 'SQL', aliases: ['sql'] },
  { name: 'NoSQL', aliases: ['nosql'] },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { name: 'MySQL', aliases: ['mysql'] },
  { name: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { name: 'Redis', aliases: ['redis'] },
  { name: 'Elasticsearch', aliases: ['elasticsearch'] },
  { name: 'Kafka', aliases: ['kafka'] },
  { name: 'RabbitMQ', aliases: ['rabbitmq', 'rabbit mq'] },
  { name: 'Snowflake', aliases: ['snowflake'] },
  { name: 'BigQuery', aliases: ['bigquery', 'big query'] },
  { name: 'Apache Spark', aliases: ['apache spark', 'spark'] },
  { name: 'Hadoop', aliases: ['hadoop'] },
  { name: 'Airflow', aliases: ['airflow'] },
  { name: 'ETL', aliases: ['etl'] },
  { name: 'AWS', aliases: ['aws', 'amazon web services'] },
  { name: 'Azure', aliases: ['azure'] },
  { name: 'GCP', aliases: ['gcp', 'google cloud'] },
  { name: 'Firebase', aliases: ['firebase'] },
  { name: 'Docker', aliases: ['docker'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'Terraform', aliases: ['terraform'] },
  { name: 'Jenkins', aliases: ['jenkins'] },
  { name: 'GitHub Actions', aliases: ['github actions', 'github-actions'] },
  { name: 'Git', aliases: ['git'] },
  { name: 'CI/CD', aliases: ['ci/cd', 'cicd', 'continuous integration'] },
  { name: 'Linux', aliases: ['linux'] },
  { name: 'Nginx', aliases: ['nginx'] },
  { name: 'Ansible', aliases: ['ansible'] },
  { name: 'GraphQL', aliases: ['graphql'] },
  { name: 'gRPC', aliases: ['grpc'] },
  { name: 'REST APIs', aliases: ['rest api', 'rest apis', 'restful api', 'restful apis', 'restful'] },
  { name: 'WebSocket', aliases: ['websocket', 'web socket'] },
  { name: 'Microservices', aliases: ['microservices', 'microservice', 'micro-service'] },
  { name: 'System Design', aliases: ['system design', 'systems design'] },
  { name: 'Data Structures & Algorithms', aliases: ['data structures and algorithms', 'data structures & algorithms', 'data structures', 'dsa'] },
  { name: 'Object-Oriented Programming', aliases: ['object-oriented programming', 'oop'] },
  { name: 'Design Patterns', aliases: ['design patterns'] },
  { name: 'Machine Learning', aliases: ['machine learning', 'ml'] },
  { name: 'Deep Learning', aliases: ['deep learning'] },
  { name: 'NLP', aliases: ['nlp', 'natural language processing'] },
  { name: 'Computer Vision', aliases: ['computer vision'] },
  { name: 'TensorFlow', aliases: ['tensorflow', 'tensor flow'] },
  { name: 'PyTorch', aliases: ['pytorch'] },
  { name: 'NumPy', aliases: ['numpy'] },
  { name: 'Pandas', aliases: ['pandas'] },
  { name: 'LLM', aliases: ['llm', 'large language model', 'large language models'] },
  { name: 'Generative AI', aliases: ['generative ai', 'genai', 'generative artificial intelligence'] },
  { name: 'Blockchain', aliases: ['blockchain'] },
  { name: 'Jest', aliases: ['jest'] },
  { name: 'Cypress', aliases: ['cypress'] },
  { name: 'Playwright', aliases: ['playwright'] },
  { name: 'Selenium', aliases: ['selenium'] },
  { name: 'Agile', aliases: ['agile'] },
  { name: 'Scrum', aliases: ['scrum'] },
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "React" must not be claimed when only "React Native" appears (space or
// hyphen separated), and bare "react" keeps word boundaries so words like
// "reactivate" or "reaction" are never counted. Everything else in the lexicon
// uses plain word boundaries.
const SPECIAL_PATTERNS = {
  React: [
    { source: '(?<![a-z0-9])react(?![a-z0-9])(?![\\s-]*native)', flags: 'gi' },
  ],
};

const compileSkills = () => {
  const index = new Map();
  for (const def of SKILL_DEFINITIONS) {
    const specials = SPECIAL_PATTERNS[def.name];
    const patterns = [];
    const add = (re) => { patterns.push(re); };
    if (specials) {
      // Specified patterns are used INSTEAD of the generic aliases, so React
      // must also get explicit patterns for its common written variations.
      if (def.name === 'React') {
        add(new RegExp('(?<![a-z0-9])reactjs(?![a-z0-9])', 'gi'));
        add(new RegExp('(?<![a-z0-9])react\\.js(?![a-z0-9])', 'gi'));
        add(new RegExp('(?<![a-z0-9])react js(?![a-z0-9])', 'gi'));
      }
      specials.forEach((s) => add(new RegExp(s.source, s.flags)));
    } else {
      for (const alias of def.aliases) {
        add(new RegExp(`(?<![a-z0-9])${escapeRegex(alias)}(?![a-z0-9])`, 'gi'));
      }
    }
    index.set(def.name, { name: def.name, patterns });
  }
  return index;
};

const SKILL_INDEX = compileSkills();

// ─── SMALL HELPERS ───────────────────────────────────────────────────────────
const asText = (v) => String(v ?? '');
const asArray = (v) => (Array.isArray(v) ? v : []).filter((x) => typeof x === 'string' && x.trim());
const cleanLabel = (s) => asText(s).replace(/\*\*/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const clampScore = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
};
const isSkillLikePhrase = (phrase) => {
  const p = phrase.trim();
  if (p.length < 2 || p.length > 60) return false;
  if (p.split(/\s+/).length > 8) return false; // sentences are not skills
  if (/\d/.test(p) || /[$£€%]/.test(p)) return false; // metrics → achievement text, not a skill
  return true;
};
const stripGapPrefix = (phrase) => phrase.replace(/^(no|lack of|missing|little|limited|minimal|less|weak|insufficient)\s+/i, '');
const textHasPhrase = (text, phrase) => {
  const t = asText(text).toLowerCase();
  const p = cleanLabel(phrase).toLowerCase();
  if (!p) return false;
  if (p.includes(' ')) return t.includes(p);
  const re = new RegExp(`(?<![a-z0-9])${escapeRegex(p)}(?![a-z0-9])`, 'i');
  return re.test(asText(text));
};
const countOccurrences = (text, needle) => {
  if (!needle) return 0;
  if (needle.includes(' ')) {
    const t = asText(text).toLowerCase();
    const n = needle.toLowerCase();
    return t.split(n).length - 1;
  }
  const re = new RegExp(`(?<![a-z0-9])${escapeRegex(needle)}(?![a-z0-9])`, 'gi');
  return (asText(text).match(re) || []).length;
};
// NOTE: must use String.match (not RegExp.test) — the shared patterns carry the
// 'g' flag and .test() would advance lastIndex between calls, producing random
// results. String.match with a global regex always starts from position 0.
const skillIsMentioned = (text, skill) => {
  const t = asText(text);
  return skill.patterns.some((pattern) => (t.match(pattern) || []).length > 0);
};
const sortByJdPresence = (items, jdText) => {
  const withCount = items.map((name) => ({ name, count: countOccurrences(jdText, name) }));
  withCount.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return withCount.map((x) => x.name);
};
const dedupeStrings = (list) => {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = asText(item).toLowerCase();
    if (item && !seen.has(key)) { seen.add(key); out.push(item); }
  }
  return out;
};

// ─── REQUIREMENT CLASSIFICATION (JD → four categories) ──────────────────────
// The job description is broken down into four requirement categories so the
// match report distinguishes technical skills from duties, eligibility rules,
// and soft skills. Every category is classified against the ACTUAL resume text:
//   technicalSkills          — canonical skill lexicon + technical concepts
//                              (programming, databases, web development, ...)
//   responsibilities         — action-verb phrases (design, develop, test, ...)
//   experienceRequirements   — eligibility terms (fresher, years, degree, ...)
//   softSkills               — problem solving, communication, teamwork, ...
// Status values: 'matched' (the resume demonstrates it), 'weak' (some evidence
// but insufficient depth), 'missing' (no evidence). Nothing is invented — each
// status follows the documented rules below.

// Technical concepts are broader than the canonical skill lexicon: a JD may
// require "programming" or "databases" without naming a specific language or
// database engine. They participate in the deterministic skillsMatch score on
// the same matched / half-weak-credit basis as canonical skills.
const TECHNICAL_CONCEPT_DEFINITIONS = [
  { name: 'Programming', patterns: ['programming', 'coding'] },
  { name: 'Databases', patterns: ['databases', 'database'] },
  { name: 'Web Applications', patterns: ['web applications', 'web application', 'web apps', 'web app', 'single page applications', 'single-page applications', 'single page application', 'single-page application', 'spa', 'website', 'web development'] },
  { name: 'Web Development', patterns: ['web development', 'web dev'] },
  { name: 'Frontend Development', patterns: ['frontend development', 'front-end development', 'front end development', 'frontend', 'front-end'] },
  { name: 'Backend Development', patterns: ['backend development', 'back-end development', 'back end development', 'backend', 'back-end'] },
  { name: 'Mobile Development', patterns: ['mobile development', 'ios development', 'android development'] },
  { name: 'API Development', patterns: ['api development', 'api design', 'api integration', 'rest api development'] },
  { name: 'Cloud Computing', patterns: ['cloud computing', 'cloud platforms', 'cloud infrastructure'] },
  { name: 'Software Engineering', patterns: ['software engineering', 'software development'] },
  { name: 'DevOps', patterns: ['devops'] },
  { name: 'Data Analysis', patterns: ['data analysis', 'data analytics'] },
  { name: 'Automation', patterns: ['automation', 'automated'] },
  { name: 'Quality Assurance', patterns: ['quality assurance', 'test automation', 'automated testing', 'unit testing', 'integration testing', 'qa'] },
  { name: 'UI/UX Design', patterns: ['ui/ux', 'ui design', 'ux design', 'user interface design', 'user experience design'] },
];

// Safe inference rules: a resume that demonstrates any term in the proof set
// also demonstrates the broader concept (e.g. Python ⇒ programming,
// PostgreSQL ⇒ databases). These are documented, conservative equivalences —
// never invented skills.
const CONCEPT_PROOF_RULES = {
  Programming: ['python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'golang', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'scala', 'dart', 'coding', 'scripting'],
  Databases: ['sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'database', 'databases', 'nosql'],
};

// Responsibility verbs (duties, not skills): "design, develop, test, and
// maintain web applications" is a responsibility phrase — the verbs inside it
// must NEVER be reported as technical skills.
const RESPONSIBILITY_VERBS = [
  'design', 'develop', 'build', 'create', 'implement', 'test', 'maintain',
  'debug', 'deploy', 'ship', 'launch', 'architect', 'optimize', 'analyze',
  'review', 'refactor', 'integrate', 'document', 'monitor', 'troubleshoot',
  'support', 'write', 'manage', 'lead', 'mentor', 'coordinate', 'plan',
  'estimate', 'improve', 'automate', 'migrate', 'secure', 'configure',
  'operate', 'release', 'solve', 'fix', 'collaborate', 'communicate',
  'deliver', 'drive', 'enhance', 'scale', 'research', 'prototype',
  'validate', 'verify',
];
const RESPONSIBILITY_VERB_SET = new Set(RESPONSIBILITY_VERBS);
const RESPONSIBILITY_VERB_PATTERN = new RegExp(
  `(?<![a-z0-9])(?:${RESPONSIBILITY_VERBS.map(escapeRegex).join('|')})(?![a-z0-9])`,
  'i'
);
// Irregular / noun forms used ONLY for resume evidence (never detection).
const RESPONSIBILITY_EVIDENCE_EXTRAS = {
  build: ['built', 'building'],
  write: ['wrote', 'written'],
  lead: ['led'],
  maintain: ['maintenance'],
};

// Soft skills (noun phrases, e.g. "problem-solving", "willingness to learn").
const SOFT_SKILL_DEFINITIONS = [
  { name: 'Problem Solving', patterns: ['problem-solving skills', 'problem solving skills', 'problem-solving', 'problem solving'] },
  { name: 'Communication', patterns: ['communication skills', 'written and verbal communication', 'verbal and written communication', 'communication'] },
  { name: 'Teamwork', patterns: ['teamwork', 'team player', 'collaboration', 'collaborative', 'cross-functional'] },
  { name: 'Adaptability', patterns: ['adaptability', 'adaptable', 'flexibility', 'flexible'] },
  { name: 'Leadership', patterns: ['leadership', 'lead teams', 'leading teams'] },
  { name: 'Creativity', patterns: ['creativity', 'creative'] },
  { name: 'Critical Thinking', patterns: ['critical thinking', 'analytical thinking', 'analytical skills'] },
  { name: 'Attention to Detail', patterns: ['attention to detail', 'detail-oriented', 'detail oriented'] },
  { name: 'Time Management', patterns: ['time management', 'prioritization'] },
  { name: 'Willingness to Learn', patterns: ['willingness to learn', 'willing to learn', 'eagerness to learn', 'desire to learn', 'fast learner', 'quick learner'] },
  { name: 'Self-Motivation', patterns: ['self-motivated', 'self motivated', 'self-starter', 'self starter', 'proactive', 'motivated', 'initiative'] },
  { name: 'Positive Attitude', patterns: ['positive attitude', 'can-do attitude', 'positive mindset'] },
  { name: 'Interpersonal Skills', patterns: ['interpersonal skills', 'interpersonal'] },
  { name: 'Work Ethic', patterns: ['work ethic', 'hardworking', 'hard-working', 'reliable'] },
];

// Experience / eligibility requirements (fresher, years, degree, ...).
const EXPERIENCE_DEFINITIONS = [
  { name: 'Fresher', patterns: ['fresher', 'freshers', 'fresh graduate', 'fresh graduates', 'recent graduate', 'recent graduates', 'new graduate', 'new graduates', 'new grad'] },
  { name: 'Entry level', patterns: ['entry-level', 'entry level', 'junior', 'junior-level', 'junior level'] },
  { name: 'Years of experience', useRawMatch: true, patterns: [
    /\d+\s*\+\s*years?/i,
    /\d+\s*[-–—]\s*\d+\s*years?/i,
    /\d+\s*years?(?:\s+of)?\s+(?:experience|exp)/i,
  ] },
  { name: "Bachelor's degree", patterns: ['bachelor', "bachelor's", 'bachelor’s', 'bachelors', 'b.s.', 'b.tech', 'b.e.', 'bsc', 'b.sc', 'undergraduate'] },
  { name: "Master's degree", patterns: ['master', "master's", 'master’s', 'masters', 'm.s.', 'm.tech', 'm.sc', 'mba', 'graduate degree', 'postgraduate'] },
  { name: 'Degree', patterns: ['degree', 'diploma'] },
];

const compileLexicon = (definitions) => {
  const index = new Map();
  for (const def of definitions) {
    const patterns = [];
    for (const p of def.patterns) {
      if (p instanceof RegExp) patterns.push(new RegExp(p.source, p.flags.includes('g') ? p.flags : `${p.flags}g`));
      else patterns.push(new RegExp(`(?<![a-z0-9])${escapeRegex(p)}(?![a-z0-9])`, 'gi'));
    }
    index.set(def.name, { name: def.name, patterns, useRawMatch: !!def.useRawMatch });
  }
  return index;
};
const TECHNICAL_CONCEPT_INDEX = compileLexicon(TECHNICAL_CONCEPT_DEFINITIONS);
const SOFT_SKILL_INDEX = compileLexicon(SOFT_SKILL_DEFINITIONS);
const EXPERIENCE_INDEX = compileLexicon(EXPERIENCE_DEFINITIONS);
const CONCEPT_PROOF_PATTERNS = Object.fromEntries(
  Object.entries(CONCEPT_PROOF_RULES).map(([name, terms]) => [
    name,
    terms.map((t) => new RegExp(`(?<![a-z0-9])${escapeRegex(t)}(?![a-z0-9])`, 'gi')),
  ])
);

// NOTE: like the skill patterns, these shared 'g' regexes are only used via
// String.match (never .test()), so they are stateless between calls.
const mentionedBy = (text, def, extraPatterns = []) => {
  const t = asText(text);
  return [...def.patterns, ...extraPatterns].some((p) => (t.match(p) || []).length > 0);
};
const firstMatchInfo = (text, def) => {
  const t = asText(text);
  let best = null;
  for (const p of def.patterns) {
    const m = t.match(p);
    if (m && (best == null || m.index < best.index)) best = m;
  }
  return best;
};
const toRequirementSegments = (text) => asText(text)
  .replace(/\r/g, '')
  .split(/(?<=[.!?])\s+|\n|[•·]/)
  .map((s) => s.replace(/^\s*[-–—*•·>\d.)]+\s*/, '').trim())
  .filter((s) => s.length >= 2);
const cleanPhrase = (s) => asText(s).replace(/[.;!?,\s]+$/g, '').replace(/\s+/g, ' ').trim();
const extractResponsibilityPhrases = (jd) => {
  const phrases = [];
  for (const segment of toRequirementSegments(jd)) {
    const verbMatch = segment.match(RESPONSIBILITY_VERB_PATTERN);
    if (!verbMatch) continue;
    let phrase;
    if (segment.split(/\s+/).length <= 12) {
      phrase = cleanPhrase(segment);
    } else {
      // Long sentences: capture the "to <verbs> <object>" clause the duty sits in.
      const toIdx = segment.lastIndexOf(' to ', verbMatch.index);
      const start = toIdx >= 0 ? toIdx + 4 : 0;
      const tail = segment.slice(verbMatch.index);
      const endIdx = tail.search(/[.;!?]|$/);
      phrase = cleanPhrase(segment.slice(start, verbMatch.index + endIdx));
    }
    if (phrase) phrases.push(phrase);
  }
  return dedupeStrings(phrases);
};
const responsibilityEvidence = (resume, verb) => {
  const variants = [verb, `${verb}s`, `${verb}ed`, `${verb}d`, `${verb}ing`, `${verb}es`, `${verb}ged`, `${verb}ging`];
  if (RESPONSIBILITY_EVIDENCE_EXTRAS[verb]) variants.push(...RESPONSIBILITY_EVIDENCE_EXTRAS[verb]);
  const re = new RegExp(`(?<![a-z0-9])(?:${variants.map(escapeRegex).join('|')})(?![a-z0-9])`, 'i');
  return re.test(asText(resume));
};
const phraseVerbs = (phrase) => phrase
  .split(/\s*(?:,|\band\b)\s*/i)
  .map((t) => t.trim().toLowerCase())
  .filter((t) => RESPONSIBILITY_VERB_SET.has(t));
const estimateResumeYears = (resume) => {
  const t = asText(resume);
  const ranges = [...t.matchAll(/(\d{4})\s*(?:-|–|—|to)\s*(?:present|now|current|\d{4})/gi)];
  const currentYear = new Date().getFullYear();
  let total = 0;
  for (const m of ranges) {
    const from = Number(m[1]);
    const to = m[2] && /^\d{4}$/.test(m[2]) ? Number(m[2]) : currentYear;
    total += Math.max(0, to - from);
  }
  return Math.round(total);
};
const experienceStatus = (def, rawName, resume) => {
  const years = estimateResumeYears(resume);
  if (def.name === 'Fresher') return mentionedBy(resume, def) || years <= 1 ? 'matched' : 'missing';
  if (def.name === 'Entry level') return mentionedBy(resume, def) || years <= 2 ? 'matched' : 'missing';
  if (def.name === 'Years of experience') {
    const required = Number((rawName.match(/\d+/) || [0])[0]);
    return years >= required ? 'matched' : 'missing';
  }
  return mentionedBy(resume, def) ? 'matched' : 'missing';
};
const extractExperienceRequirements = (jd, resume) => {
  const found = [];
  for (const def of EXPERIENCE_INDEX.values()) {
    const m = firstMatchInfo(jd, def);
    if (!m) continue;
    found.push({ def, idx: m.index, name: def.useRawMatch ? cleanPhrase(m[0]) : def.name });
  }
  found.sort((a, b) => a.idx - b.idx);
  const hasSpecificDegree = found.some((f) => f.def.name === "Bachelor's degree" || f.def.name === "Master's degree");
  const out = [];
  const seen = new Set();
  for (const f of found) {
    if (f.def.name === 'Degree' && hasSpecificDegree) continue;
    if (seen.has(f.name.toLowerCase())) continue;
    seen.add(f.name.toLowerCase());
    out.push({ name: f.name, status: experienceStatus(f.def, f.name, resume) });
  }
  return out;
};

// ─── AGENT OUTPUT SOURCES ────────────────────────────────────────────────────
// Which structured fields each agent contributes to the match report.
const AGENT_GAP_SOURCES = [
  ['ats', 'missingKeywords'],
  ['recruiter', 'missingExperience'],
  ['recruiter', 'weakProjects'],
  ['engineer', 'weakTechnicalAreas'],
];
const AGENT_POSITIVE_SOURCES = [
  ['ats', 'presentKeywords'],
  ['engineer', 'strongTechnicalAreas'],
];

// ─── MAIN ENTRY ──────────────────────────────────────────────────────────────
/**
 * Build the final structured Resume ↔ Job match report.
 *
 * @param {object}  opts
 * @param {string}  opts.resumeText       Full resume text
 * @param {string}  opts.jobDescription   Full job description text
 * @param {object}  opts.agentResults     Map of agentId → parsed agent JSON
 * @returns {object} jobMatch report:
 *   overallMatch, atsCompatibility, skillsMatch, experienceMatch,
 *   technicalMatch (all ints 0–100),
 *   matchedSkills, missingSkills, weakSkills (string arrays),
 *   topGaps ([{skill, importance, reason}]), recommendations (string array),
 *   requirementBreakdown ({technicalSkills, responsibilities,
 *     experienceRequirements, softSkills} — each [{name, status}] where
 *     status is 'matched' | 'weak' | 'missing' against the resume text)
 */
export function computeJobMatch({ resumeText = '', jobDescription = '', agentResults = {} }) {
  const resume = asText(resumeText);
  const jd = asText(jobDescription);
  const results = agentResults || {};
  const ats = results.ats || {};
  const recruiter = results.recruiter || {};
  const engineer = results.engineer || {};
  const manager = results.manager || {};

  // Skills the job description actually mentions (from the normalized lexicon)
  const jdSkills = [...SKILL_INDEX.values()].filter((s) => skillIsMentioned(jd, s));

  // Technical concepts the JD requires (programming, databases, ...). These are
  // broader than the canonical lexicon and are evidenced by the concept terms
  // themselves or the documented CONCEPT_PROOF_RULES (e.g. Python ⇒ Programming).
  const jdConcepts = [...TECHNICAL_CONCEPT_INDEX.values()].filter((c) => mentionedBy(jd, c));
  const matchedConcepts = [];
  const missingConcepts = [];
  for (const concept of jdConcepts) {
    const proof = CONCEPT_PROOF_PATTERNS[concept.name] || [];
    if (mentionedBy(resume, concept, proof)) matchedConcepts.push(concept.name);
    else missingConcepts.push(concept.name);
  }

  // Collect every skill/requirement phrase the expert agents flagged.
  const gapPhrases = [];
  const positivePhrases = [];
  for (const [agentId, field] of AGENT_GAP_SOURCES) {
    for (const raw of asArray(results[agentId]?.[field])) {
      const p = cleanLabel(stripGapPrefix(raw));
      if (p && isSkillLikePhrase(p)) gapPhrases.push(p);
    }
  }
  for (const [agentId, field] of AGENT_POSITIVE_SOURCES) {
    for (const raw of asArray(results[agentId]?.[field])) {
      const p = cleanLabel(raw);
      if (p && isSkillLikePhrase(p)) positivePhrases.push(p);
    }
  }

  // ── Canonical (lexicon) classification: matched / weak / missing ─────────
  // A gap phrase that contains a canonical name (e.g. agent says "AWS lambdas")
  // flags that canonical as weak when it does appear in the resume.
  const flaggedCanonicals = new Set();
  for (const skill of jdSkills) {
    const lowerName = skill.name.toLowerCase();
    if (gapPhrases.some((p) => p.toLowerCase().includes(lowerName) || lowerName.includes(p.toLowerCase()))) {
      flaggedCanonicals.add(skill.name);
    }
  }

  const matchedLexicon = [];
  const weakLexicon = [];
  const missingLexicon = [];
  for (const skill of jdSkills) {
    if (!skillIsMentioned(resume, skill)) {
      missingLexicon.push(skill.name);
    } else if (flaggedCanonicals.has(skill.name)) {
      weakLexicon.push(skill.name);
    } else {
      matchedLexicon.push(skill.name);
    }
  }

  // ── Agent phrase classification ──────────────────────────────────────────
  // Phrases only enter the lists when they are verifiable in the raw inputs.
  const jdCanonicalNames = jdSkills.map((s) => s.name);
  // Drop agent phrases that merely restate a canonical skill already covered
  // (e.g. "CI/CD pipelines" vs canonical "CI/CD", or "data structures" vs
  // "Data Structures & Algorithms") to keep the lists clean and grounded.
  const redundantWithCanonical = (phrase) => {
    const p = phrase.toLowerCase();
    return jdCanonicalNames.some((name) => {
      const cn = name.toLowerCase();
      if (cn === p) return false;
      const shorter = Math.min(cn.length, p.length);
      return shorter >= 3 && (p.includes(cn) || cn.includes(p));
    });
  };

  const matchedPhrases = [];
  const weakPhrases = [];
  const missingPhrases = [];
  for (const phrase of gapPhrases) {
    if (redundantWithCanonical(phrase)) continue;
    const inJd = textHasPhrase(jd, phrase);
    if (!inJd) continue; // phrase must be grounded in the job description
    if (textHasPhrase(resume, phrase)) weakPhrases.push(cleanLabel(phrase));
    else missingPhrases.push(cleanLabel(phrase));
  }
  for (const phrase of positivePhrases) {
    if (redundantWithCanonical(phrase)) continue;
    if (textHasPhrase(jd, phrase) && textHasPhrase(resume, phrase)) {
      matchedPhrases.push(cleanLabel(phrase));
    }
  }

  // Merge + dedupe (case-insensitive), phrases never duplicate canonicals.
  const dedupe = (list) => {
    const seen = new Set();
    const out = [];
    for (const item of list) {
      const key = item.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(item); }
    }
    return out;
  };

  const matchedSkills = dedupe([...matchedLexicon, ...matchedPhrases]);
  const weakSkills = dedupe([...weakLexicon, ...weakPhrases]);
  const missingSkills = dedupe([...missingLexicon, ...missingPhrases]);

  // ── Deterministic skills coverage ─────────────────────────────────────────
  // Only canonical skills AND technical concepts are scored (stable +
  // explainable). A weak match earns half credit because some evidence exists
  // but depth is insufficient. Concepts (programming, databases, ...) count
  // because a JD may require them without naming a specific tool; they are
  // evidenced by the concept terms themselves or the documented proof rules.
  const canonicalTotal = matchedLexicon.length + weakLexicon.length + missingLexicon.length + jdConcepts.length;
  const canonicalCoveragePercent = canonicalTotal > 0
    ? Math.round((100 * (matchedLexicon.length + matchedConcepts.length + 0.5 * weakLexicon.length)) / canonicalTotal)
    : null;

  // Fallback when the JD has no recognizable canonical skills: use the ATS
  // agent's keyword counts (present vs missing) as the lexical signal.
  const atsPresent = asArray(ats.presentKeywords).length;
  const atsMissing = asArray(ats.missingKeywords).length;
  const keywordCoveragePercent = (atsPresent + atsMissing) > 0
    ? Math.round((100 * atsPresent) / (atsPresent + atsMissing))
    : null;

  // Final lexical proxy used when an agent score is unavailable. It is a real
  // calculation over the two documents — never a random number — and the
  // caller reports the underlying agent failure separately (agentErrors).
  const coverageProxy = canonicalCoveragePercent ?? keywordCoveragePercent ?? clampScore(ats.score) ?? 0;

  // ── Sub-scores (all ints 0–100) ───────────────────────────────────────────
  const atsCompatibility = clampScore(ats.score) ?? coverageProxy;
  const skillsMatch = canonicalCoveragePercent ?? keywordCoveragePercent ?? coverageProxy;
  const experienceMatch = clampScore(recruiter.score) ?? coverageProxy;
  const technicalMatch = clampScore(engineer.score) ?? coverageProxy;

  // ── overallMatch = documented weighted blend ─────────────────────────────
  let overallMatch = Math.round(
    MATCH_WEIGHTS.ats * atsCompatibility +
    MATCH_WEIGHTS.skills * skillsMatch +
    MATCH_WEIGHTS.experience * experienceMatch +
    MATCH_WEIGHTS.technical * technicalMatch
  );
  const managerDecision = cleanLabel(manager.decision).toUpperCase();
  const decisionCap = MANAGER_DECISION_CAPS[managerDecision];
  if (decisionCap != null) overallMatch = Math.min(overallMatch, decisionCap);
  overallMatch = clampScore(overallMatch);

  // ── Top gaps ──────────────────────────────────────────────────────────────
  const topGapCandidates = [];
  for (const skillName of missingSkills) {
    topGapCandidates.push({
      skill: skillName,
      importance: 'high',
      kind: 'missing',
      count: countOccurrences(jd, skillName),
      reason: 'Required or expected by the job description but not demonstrated in the resume',
    });
  }
  for (const skillName of weakSkills) {
    topGapCandidates.push({
      skill: skillName,
      importance: countOccurrences(jd, skillName) >= 3 ? 'high' : 'medium',
      kind: 'weak',
      count: countOccurrences(jd, skillName),
      reason: 'Some evidence in the resume, but expert reviewers flagged insufficient depth for this role',
    });
  }
  topGapCandidates.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'missing' ? -1 : 1;
    return b.count - a.count || a.skill.localeCompare(b.skill);
  });
  const topGaps = topGapCandidates.slice(0, 5).map(({ skill, importance, reason }) => ({ skill, importance, reason }));

  // ── Actionable recommendations (3–5, grounded in real inputs) ────────────
  const recommendations = [];
  const missingForRecs = topGapCandidates.filter((g) => g.kind === 'missing').slice(0, 2);
  const weakForRecs = topGapCandidates.filter((g) => g.kind === 'weak').slice(0, 2);
  for (const g of missingForRecs) {
    recommendations.push(
      `Add ${g.skill} to the resume — the job description requires it but it is not currently demonstrated in your skills or experience.`
    );
  }
  for (const g of weakForRecs) {
    recommendations.push(
      `Strengthen the ${g.skill} evidence on the resume — the job description values it and the current mention is too shallow.`
    );
  }
  // Agent-written suggestions are grounded in the actual documents.
  for (const raw of asArray(ats.suggestions)) {
    const s = cleanLabel(raw);
    if (s.length >= 8 && s.length <= 220) recommendations.push(s);
    if (recommendations.length >= 4) break;
  }
  while (recommendations.length < 3) {
    if (recommendations.length === 0) recommendations.push('Resume already reflects the core skills in the job description — add quantified, real outcomes to your most relevant project bullets.');
    else recommendations.push('Lead the resume with the experience and keywords this job description emphasizes.');
  }
  const finalRecommendations = dedupe(recommendations.map((s) => cleanLabel(s)).filter(Boolean)).slice(0, 5);

  // ── Requirement breakdown (four-category JD classification) ──────────────
  // technicalSkills: canonical skills + concepts, reusing the exact
  // matched/weak/missing classification computed above.
  const lexiconStatus = new Map();
  for (const s of matchedLexicon) lexiconStatus.set(s, 'matched');
  for (const s of weakLexicon) lexiconStatus.set(s, 'weak');
  for (const s of missingLexicon) lexiconStatus.set(s, 'missing');
  const technicalBreakdownNames = sortByJdPresence(
    [...jdSkills.map((s) => s.name), ...matchedConcepts, ...missingConcepts],
    jd
  );
  const technicalBreakdown = technicalBreakdownNames.map((name) => ({
    name,
    status: matchedConcepts.includes(name) ? 'matched'
      : missingConcepts.includes(name) ? 'missing'
      : lexiconStatus.get(name) || 'matched',
  }));

  // responsibilities: verb phrases from the JD; 'matched' when ANY verb in the
  // phrase is evidenced (stemmed) in the resume.
  const responsibilityBreakdown = extractResponsibilityPhrases(jd).map((phrase) => ({
    name: phrase,
    status: phraseVerbs(phrase).some((v) => responsibilityEvidence(resume, v)) ? 'matched' : 'missing',
  }));

  // softSkills: noun phrases from the JD; 'matched' when the resume mentions
  // the same phrase (aliases included).
  const softSkillNames = sortByJdPresence(
    [...SOFT_SKILL_INDEX.values()].filter((d) => mentionedBy(jd, d)).map((d) => d.name),
    jd
  );
  const softSkillsBreakdown = softSkillNames.map((name) => ({
    name,
    status: mentionedBy(resume, SOFT_SKILL_INDEX.get(name)) ? 'matched' : 'missing',
  }));

  // experienceRequirements: fresher/entry/years/degree rules, evidenced by
  // markers in the resume or an estimated years-of-experience total.
  const experienceBreakdown = extractExperienceRequirements(jd, resume);

  const requirementBreakdown = {
    technicalSkills: technicalBreakdown,
    responsibilities: responsibilityBreakdown,
    experienceRequirements: experienceBreakdown,
    softSkills: softSkillsBreakdown,
  };

  // ── Output ────────────────────────────────────────────────────────────────
  return {
    overallMatch,
    atsCompatibility,
    skillsMatch,
    experienceMatch,
    technicalMatch,
    matchedSkills: sortByJdPresence(matchedSkills, jd),
    missingSkills: sortByJdPresence(missingSkills, jd),
    weakSkills: sortByJdPresence(weakSkills, jd),
    topGaps,
    recommendations: finalRecommendations,
    requirementBreakdown,
  };
}
