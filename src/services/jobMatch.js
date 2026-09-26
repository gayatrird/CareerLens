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
export const MATCH_WEIGHTS = Object.freeze(Object.defineProperties(
  {
    ats: 0.25,
    skills: 0.30,
    experience: 0.25,
    domainDepth: 0.20,
  },
  {
    technical: {
      get() { return this.domainDepth; },
      enumerable: false,
    },
  }
));

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
// ─── JD FILTERING & STRUCTURAL CLASSIFICATION ────────────────────────────────
export const isJdSectionHeading = (phrase) => {
  const s = cleanLabel(phrase).replace(/[:#*–—\s]+$/, '').replace(/^[:#*–—\s]+/, '').trim().toLowerCase();
  if (!s || s.length > 55) return false;

  const headingPatterns = [
    // Skills / Requirements / Qualifications headings
    /^(?:key\s+|core\s+|primary\s+|job\s+|basic\s+|minimum\s+|preferred\s+|required\s+|desired\s+|additional\s+|technical\s+|functional\s+|role\s+|candidate\s+)?(?:skills|qualifications|requirements|competencies|prerequisites)(?:\s+(?:required|needed))?$/i,
    /^(?:skills|qualifications|requirements)\s+(?:and|&)\s+(?:experience|responsibilities|qualifications|skills|requirements|competencies)$/i,
    /^(?:responsibilities|duties|key duties|core duties|primary duties|job responsibilities|duties\s+(?:and|&)\s+responsibilities|scope\s+of\s+work)$/i,
    /^(?:what\s+you(?:'ll|\s+will)\s+do|what\s+you\s+bring|what\s+we(?:'re|\s+are)\s+looking\s+for|who\s+you\s+are|what\s+you\s+need|who\s+we\s+are)$/i,
    /^(?:about\s+the\s+role|about\s+the\s+job|about\s+the\s+position|about\s+us|about\s+the\s+company|about\s+our\s+team|company\s+overview|job\s+overview|role\s+overview|position\s+overview|overview|job\s+summary|summary)$/i,
    /^(?:nice\s+to\s+have|good\s+to\s+have|bonus\s+points|bonus\s+qualifications|pluses|preferred)$/i,
    /^(?:education|education\s+requirements|educational\s+qualifications|academic\s+qualifications|academic\s+background|education\s+(?:and|&)\s+experience)$/i,
    /^(?:key\s+technologies|tech\s+stack|tools\s+(?:and|&)\s+technologies|technologies|tools\s+(?:and|&)\s+platforms)$/i,
    /^(?:job\s+type|employment\s+type|work\s+type|workplace\s+type|position\s+type|schedule|work\s+schedule)$/i,
    /^(?:location|job\s+location|work\s+location|office\s+location)$/i,
    /^(?:domain|industry|department|reports\s+to)$/i,
    /^(?:experience|experience\s+required|minimum\s+experience|work\s+experience)$/i,
    /^(?:benefits|what\s+we\s+offer|perks|compensation|salary|compensation\s+(?:and|&)\s+benefits)$/i,
  ];

  return headingPatterns.some((pattern) => pattern.test(s));
};

export const isJdMetadata = (phrase) => {
  const raw = cleanLabel(phrase).trim();
  if (!raw) return false;

  // 1. "Key: Value" metadata structures
  const metaMatch = raw.match(/^([a-z\s/&_-]{2,25})\s*:\s*(.+)$/i);
  if (metaMatch) {
    const key = metaMatch[1].trim().toLowerCase();
    const METADATA_KEYS = new Set([
      'domain', 'role', 'job role', 'title', 'job title', 'position', 'position title',
      'location', 'job location', 'work location', 'workplace', 'city', 'state', 'country',
      'job type', 'employment type', 'work type', 'type', 'contract type', 'schedule', 'shift',
      'department', 'industry', 'reports to', 'salary', 'compensation', 'pay', 'rate', 'ctc',
      'experience level', 'experience', 'posted', 'date', 'req id', 'requisition id', 'job id',
      'company', 'organization', 'school', 'hospital', 'employer',
    ]);
    if (METADATA_KEYS.has(key)) return true;
  }

  // 2. Standalone metadata values (e.g. "Full-time", "Part-time", "Hybrid", "Remote")
  const lower = raw.toLowerCase();
  if (/^(?:location|domain|role|job type|employment type|job title|title)\s*:/i.test(lower)) return true;
  if (/^(?:full[- ]time|part[- ]time|contract|temporary|internship|remote|hybrid|on[- ]site|permanent)\s*$/i.test(lower)) return true;

  return false;
};

export const isJdInstructionOrTestText = (phrase) => {
  const s = cleanLabel(phrase).trim().toLowerCase();
  if (!s) return false;

  const testInstructionPatterns = [
    /\b(?:for|in)\s+(?:your|our|this|the)?\s*(?:careerlens|analyzer|test|testing|benchmark|evaluation)\b/i,
    /^(?:for\s+testing|for\s+test|test\s+case|test\s+scenario|test\s+run|test\s+data|testing\s+notes?)\b/i,
    /\b(?:should|must)\s+(?:ideally|preferably|expectedly)?\s*(?:produce|output|yield|generate|show|display|return)\b/i,
    /^(?:this\s+should|you\s+should\s+see|expected\s+output|expected\s+results?|expected\s+behavior|note\s+for\s+testing)\b/i,
    /^(?:use\s+this\s+(?:jd|job\s+description|test|sample)|sample\s+job\s+description)\b/i,
    /^(?:please\s+note|important\s+note|instructions?|directions?)\s*:/i,
    /\bproduce\s+something\s+like\b/i,
    /^(?:expected\s+extracted\s+requirements?|expected\s+requirements?|test\s+this\s+case)\b/i,
  ];

  return testInstructionPatterns.some((pattern) => pattern.test(s));
};

export const isInvalidJdRequirement = (phrase) => {
  if (!phrase) return true;
  const p = cleanLabel(phrase).trim();
  if (p.length < 2) return true;
  if (isJdSectionHeading(p)) return true;
  if (isJdMetadata(p)) return true;
  if (isJdInstructionOrTestText(p)) return true;
  return false;
};

const isSkillLikePhrase = (phrase) => {
  const p = phrase.trim();
  if (p.length < 2 || p.length > 60) return false;
  if (p.split(/\s+/).length > 8) return false; // sentences are not skills
  if (/\d/.test(p) || /[$£€%]/.test(p)) return false; // metrics → achievement text, not a skill
  if (isInvalidJdRequirement(p)) return false;
  return true;
};
const stripGapPrefix = (phrase) => phrase.replace(/^(no|lack of|missing|little|limited|minimal|less|weak|insufficient)\s+/i, '');
export const textHasPhrase = (text, phrase) => {
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
// must NEVER be reported as technical/domain skills.
const RESPONSIBILITY_VERBS = [
  'design', 'develop', 'build', 'create', 'implement', 'test', 'maintain',
  'debug', 'deploy', 'ship', 'launch', 'architect', 'optimize', 'analyze',
  'review', 'refactor', 'integrate', 'document', 'monitor', 'troubleshoot',
  'support', 'write', 'manage', 'lead', 'mentor', 'coordinate', 'plan',
  'estimate', 'improve', 'automate', 'migrate', 'secure', 'configure',
  'operate', 'release', 'solve', 'fix', 'collaborate', 'communicate',
  'deliver', 'drive', 'enhance', 'scale', 'research', 'prototype',
  'validate', 'verify', 'provide', 'assist', 'use', 'utilize',
  // Healthcare / Clinical
  'administer', 'assess', 'triage', 'treat', 'care', 'discharge', 'admit',
  'counsel', 'dispense', 'rehabilitate', 'chart', 'sanitize',
  // Education / Teaching
  'teach', 'instruct', 'educate', 'grade', 'evaluate', 'lecture', 'facilitate',
  'tutor', 'adapt', 'motivate', 'supervise',
  // Finance / Accounting
  'reconcile', 'audit', 'calculate', 'close', 'balance', 'report', 'forecast',
  'file', 'invoice', 'budget', 'journalize', 'consolidate',
  // Operations / General
  'organize', 'schedule', 'process', 'comply', 'ensure', 'track', 'dispatch',
  'purchase', 'order',
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
  maintain: ['maintenance', 'maintained'],
  teach: ['taught', 'teaching'],
  administer: ['administered', 'administering', 'administration'],
  reconcile: ['reconciled', 'reconciling', 'reconciliation', 'reconciliations'],
  audit: ['audited', 'auditing'],
  assess: ['assessed', 'assessing', 'assessment', 'assessments'],
  evaluate: ['evaluated', 'evaluating', 'evaluation', 'evaluations'],
  assist: ['assisted', 'assisting', 'assistance'],
  provide: ['provided', 'providing'],
  monitor: ['monitored', 'monitoring'],
  care: ['cared', 'caring'],
  use: ['used', 'using', 'usage'],
  utilize: ['utilized', 'utilizing'],
  plan: ['planned', 'planning'],
  manage: ['managed', 'managing', 'management'],
  organize: ['organized', 'organizing'],
  communicate: ['communicated', 'communicating', 'communication'],
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
  { name: 'Compassion & Empathy', patterns: ['compassionate', 'compassion', 'empathy', 'empathetic', 'patient advocacy', 'caring', 'bedside manner', 'patient comfort', 'family support', 'supportive care', 'quality patient care', 'patient care'] },
  { name: 'Responsibility & Accountability', patterns: ['responsible', 'responsibility', 'responsibilities', 'accountable', 'accountability', 'dependable', 'reliable', 'adherence', 'protocols', 'accurate documentation', 'oversaw', 'managed care', 'coordinate care'] },
];

// Experience / eligibility requirements (fresher, years, degree, ...).
const EXPERIENCE_DEFINITIONS = [
  { name: 'Fresher', patterns: ['fresher', 'freshers', 'fresh graduate', 'fresh graduates', 'recent graduate', 'recent graduates', 'new graduate', 'new graduates', 'new grad'] },
  { name: 'Entry level', patterns: ['entry-level', 'entry level', 'junior', 'junior-level', 'junior level'] },
  { name: 'Years of experience', useRawMatch: true, patterns: [
    /\d+\s*[-–—]\s*\d+\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-z]+){0,3}\s+(?:experience|exp)?/i,
    /\d+\s*to\s*\d+\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-z]+){0,3}\s+(?:experience|exp)?/i,
    /(?:at\s+least|minimum|min\.?|no\s+less\s+than)\s*\d+\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-z]+){0,3}\s+(?:experience|exp)?/i,
    /\d+\s*\+\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-z]+){0,3}\s+(?:experience|exp)?/i,
    /\d+\s*[-–—]\s*\d+\s*(?:years?|yrs?)/i,
    /\d+\s*\+\s*(?:years?|yrs?)/i,
    /\d+\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-z]+){0,3}\s+(?:experience|exp)/i,
    /\d+\s*(?:years?|yrs?)/i,
  ] },
  { name: "Bachelor's degree", patterns: ['bachelor', "bachelor's", 'bachelor’s', 'bachelors', 'b.s.', 'b.tech', 'b.e.', 'bsc', 'b.sc', 'bsn', 'undergraduate'] },
  { name: "Master's degree", patterns: ['master', "master's", 'master’s', 'masters', 'm.s.', 'm.tech', 'm.sc', 'msn', 'mba', 'graduate degree', 'postgraduate'] },
  { name: 'Degree', patterns: ['degree', 'diploma', 'associate degree', 'associates'] },
  { name: 'Certification / Licensure', patterns: ['license', 'licensed', 'licensure', 'certified', 'certification', 'credentials', 'board certified'] },
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
export function parseJdSections(jdText) {
  const lines = asText(jdText).replace(/\r/g, '').split('\n');
  const sections = {
    about: [],
    responsibilities: [],
    skills: [],
    qualifications: [],
    other: [],
  };
  let currentSection = 'other';

  for (const rawLine of lines) {
    const line = cleanLabel(rawLine).trim();
    if (!line) continue;
    if (isJdMetadata(line) || isJdInstructionOrTestText(line)) continue;

    if (isJdSectionHeading(line)) {
      const lower = line.toLowerCase();
      if (/responsibilit|duties|what you will do|what you'll do|scope of work/i.test(lower)) {
        currentSection = 'responsibilities';
      } else if (/skills|competencies|technologies|tech stack|tools/i.test(lower)) {
        currentSection = 'skills';
      } else if (/qualifications|education|requirements|prerequisites|nice to have|pluses/i.test(lower)) {
        currentSection = 'qualifications';
      } else if (/about|overview|summary/i.test(lower)) {
        currentSection = 'about';
      } else {
        currentSection = 'other';
      }
      continue;
    }

    const bulletParts = line.split(/[•·]/);
    for (const part of bulletParts) {
      const stripped = part.replace(/^\s*[-–—*•·>\d.)]+\s*/, '').trim();
      if (!stripped || isInvalidJdRequirement(stripped)) continue;

      const sentenceParts = stripped.split(/(?<=[a-z]{2,}\.)\s+(?=[A-Z])/);
      for (const sent of sentenceParts) {
        const clean = sent.replace(/[.;!?,\s]+$/, '').trim();
        if (clean.length >= 2 && !isInvalidJdRequirement(clean)) {
          sections[currentSection].push(clean);
        }
      }
    }
  }

  return sections;
}

export const toRequirementSegments = (text) => {
  const sections = parseJdSections(text);
  const out = [];
  for (const list of [sections.responsibilities, sections.skills, sections.qualifications, sections.about, sections.other]) {
    for (const item of list) {
      if (item && !isInvalidJdRequirement(item)) {
        out.push(item);
      }
    }
  }
  return dedupeStrings(out);
};

const cleanPhrase = (s) => asText(s).replace(/[.;!?,\s]+$/g, '').replace(/\s+/g, ' ').trim();
const splitResponsibilityClause = (clause) => {
  const parts = clause.split(/\s*(?:,|;|\band\b)\s*/i).map(cleanPhrase).filter(Boolean);
  const validParts = parts.filter((p) => p.split(/\s+/).length >= 2 && RESPONSIBILITY_VERB_PATTERN.test(p));
  if (validParts.length >= 2) {
    return validParts;
  }
  return [cleanPhrase(clause)];
};

const extractResponsibilityPhrases = (jd) => {
  const sections = parseJdSections(jd);
  const phrases = [];

  if (sections.responsibilities.length > 0) {
    for (const item of sections.responsibilities) {
      if (isInvalidJdRequirement(item)) continue;
      phrases.push(cleanPhrase(item));
    }
  } else {
    for (const segment of toRequirementSegments(jd)) {
      if (isInvalidJdRequirement(segment)) continue;
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
      if (phrase && !isInvalidJdRequirement(phrase)) {
        const subPhrases = splitResponsibilityClause(phrase);
        for (const sp of subPhrases) {
          if (sp && !isInvalidJdRequirement(sp)) phrases.push(sp);
        }
      }
    }
  }
  return dedupeStrings(phrases);
};
const responsibilityEvidence = (resume, verb) => {
  const variants = [verb, `${verb}s`, `${verb}ed`, `${verb}d`, `${verb}ing`, `${verb}es`, `${verb}ged`, `${verb}ging`];
  if (RESPONSIBILITY_EVIDENCE_EXTRAS[verb]) variants.push(...RESPONSIBILITY_EVIDENCE_EXTRAS[verb]);
  const re = new RegExp(`(?<![a-z0-9])(?:${variants.map(escapeRegex).join('|')})(?![a-z0-9])`, 'i');
  return re.test(asText(resume));
};
const phraseVerbs = (phrase) => {
  const words = cleanLabel(phrase).toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  return words.filter((w) => RESPONSIBILITY_VERB_SET.has(w));
};

const DOMAIN_RESPONSIBILITY_SYNONYMS = {
  'monitor patients': ['patient monitoring', 'monitoring patient', 'monitored patient', 'monitored patients', 'hemodynamic monitoring', 'vital signs', 'vitals', 'triage', 'patient assessment', 'overseeing patient', 'monitor vitals', 'monitored vitals'],
  'patient care': ['patient care', 'care to patients', 'direct care', 'nursing care', 'quality care', 'care plans', 'care delivery'],
  'provide quality patient care': ['patient care', 'direct care', 'nursing care', 'quality care', 'care to patients', 'care delivery', 'clinical care', 'compassionate care', 'critical care'],
  'assist doctors': ['physician', 'physicians', 'doctor', 'doctors', 'assisted physician', 'assisted doctor', 'provider orders', 'rounding', 'collaborate with physician', 'collaborate with physicians', 'multidisciplinary'],
  'maintain accurate medical records': ['medical records', 'documentation', 'document', 'charting', 'chart', 'ehr', 'emr', 'epic', 'cerner', 'records', 'accurate records', 'clinical assessments'],
};

export const evaluateResponsibilityEvidence = (resume, phrase) => {
  const res = asText(resume);
  const lowerPhrase = cleanPhrase(phrase).toLowerCase();
  
  // 1. Direct text match
  if (textHasPhrase(res, phrase)) return true;

  // 2. Domain-specific synonyms
  for (const [key, synonyms] of Object.entries(DOMAIN_RESPONSIBILITY_SYNONYMS)) {
    if (lowerPhrase.includes(key) || key.includes(lowerPhrase)) {
      if (synonyms.some((syn) => textHasPhrase(res, syn))) return true;
    }
  }

  // 3. Verbs stemming check
  const verbs = phraseVerbs(phrase);
  if (verbs.some((v) => responsibilityEvidence(res, v))) {
    return true;
  }

  return false;
};
export const estimateResumeYears = (resume, context = {}) => {
  const t = asText(resume);
  const currentYear = new Date().getFullYear();

  // 1. Explicit years from analysis context if provided
  const contextYears = Number(context?.yearsOfExperience || context?.candidateYears || context?.experienceYears);
  let maxFound = Number.isFinite(contextYears) && contextYears > 0 ? contextYears : 0;

  // 2. Explicit textual statements in resume:
  // e.g. "4 years of experience", "4 years of primary teaching experience", "4+ years of clinical experience", "3 years of classroom experience"
  const explicitMatches = [
    ...t.matchAll(/(?:(?:over|more than|at least|approx(?:imately)?|around|about|nearly)\s+)?(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-z]+){0,4}\s*(?:experience|exp|teaching|clinical|nursing|work|career|practice|classroom)\b/gi),
    ...t.matchAll(/(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+[a-z]+){0,2}\s+(?:experience|exp)\b/gi),
    ...t.matchAll(/with\s+(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\b/gi),
  ];

  for (const m of explicitMatches) {
    const val = Number(m[1]);
    if (Number.isFinite(val) && val > 0 && val < 60) {
      if (val > maxFound) maxFound = val;
    }
  }

  // 3. Calendar year ranges in resume: "2021 - Present", "2019–2022"
  const ranges = [...t.matchAll(/(\d{4})\s*(?:-|–|—|to)\s*(present|now|current|\d{4})/gi)];
  let rangeTotal = 0;
  for (const m of ranges) {
    const from = Number(m[1]);
    const to = m[2] && /^\d{4}$/.test(m[2]) ? Number(m[2]) : currentYear;
    if (from >= 1970 && from <= currentYear) {
      rangeTotal += Math.max(0, to - from);
    }
  }

  return Math.round(Math.max(maxFound, rangeTotal));
};

export const parseExperienceRange = (phrase) => {
  const s = cleanLabel(phrase).toLowerCase().replace(/[\u2013\u2014]/g, '-');

  // 1. Range: "2–5 years", "2-5 years", "2 to 5 years", "between 2 and 5 years"
  const rangeMatch = s.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)/i) ||
                     s.match(/between\s*(\d+)\s*(?:and|&)\s*(\d+)\s*(?:years?|yrs?)/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    return { min: Math.min(min, max), max: Math.max(min, max), isRange: true };
  }

  // 2. Minimum with plus: "2+ years", "2 + years", "2 years+", "2+ yrs"
  const plusMatch = s.match(/(\d+)\s*(?:\+\s*(?:years?|yrs?)|(?:years?|yrs?)\s*\+)/i);
  if (plusMatch) {
    return { min: Number(plusMatch[1]), max: null, isRange: false };
  }

  // 3. Explicit "at least", "minimum", "no less than": "at least 3 years", "minimum 2 years"
  const minMatch = s.match(/(?:at\s+least|minimum|min\.?|no\s+less\s+than)\s*(\d+)\s*(?:years?|yrs?)/i);
  if (minMatch) {
    return { min: Number(minMatch[1]), max: null, isRange: false };
  }

  // 4. Standard "X years": "3 years of experience", "3 years"
  const singleMatch = s.match(/(\d+)\s*(?:years?|yrs?)/i);
  if (singleMatch) {
    return { min: Number(singleMatch[1]), max: null, isRange: false };
  }

  return null;
};

export const isExperienceSatisfied = (reqPhrase, candidateYears) => {
  const range = parseExperienceRange(reqPhrase);
  if (!range) return false;
  if (range.isRange) {
    return candidateYears >= range.min && candidateYears <= range.max;
  }
  return candidateYears >= range.min;
};

export const isMatchedExperiencePhrase = (phrase, candidateYears, matchedExpNames = []) => {
  const norm = (s) => cleanLabel(s).toLowerCase().replace(/[\u2013\u2014]/g, '-');
  const p = norm(phrase);
  for (const name of matchedExpNames) {
    const n = norm(name);
    if (p.includes(n) || n.includes(p)) return true;
  }
  const range = parseExperienceRange(p);
  if (range && Number.isFinite(candidateYears)) {
    if (range.isRange) return candidateYears >= range.min && candidateYears <= range.max;
    return candidateYears >= range.min;
  }
  return false;
};

export const experienceStatus = (def, rawName, resume, context = {}) => {
  const years = estimateResumeYears(resume, context);
  if (def.name === 'Fresher') return mentionedBy(resume, def) || years <= 1 ? 'matched' : 'missing';
  if (def.name === 'Entry level') return mentionedBy(resume, def) || years <= 2 ? 'matched' : 'missing';
  if (def.name === 'Years of experience') {
    const satisfied = isExperienceSatisfied(rawName, years);
    return satisfied ? 'matched' : 'missing';
  }
  return mentionedBy(resume, def) ? 'matched' : 'missing';
};

export const extractExperienceRequirements = (jd, resume, context = {}) => {
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
    out.push({ name: f.name, status: experienceStatus(f.def, f.name, resume, context) });
  }
  return out;
};

// ─── DOMAIN & ROLE IDENTIFICATION (Deterministic + ATS assisted) ───────────
export function detectJobDomain(jdText = '', resumeText = '', atsResult = {}) {
  let role = cleanLabel(atsResult.detectedRole);
  let domain = cleanLabel(atsResult.detectedDomain);

  const jd = asText(jdText);
  const resume = asText(resumeText);
  const combined = `${jd.slice(0, 1000)} ${resume.slice(0, 600)}`.toLowerCase();

  if (!domain) {
    if (/\b(nurse|nursing|rn|bsn|clinical|icu|patient|hospital|medical|healthcare|physician|triage|pharmacology)\b/i.test(combined)) {
      domain = 'Healthcare';
    } else if (/\b(teacher|teaching|curriculum|pedagogy|classroom|student|students|k-12|elementary|algebra|educator|school)\b/i.test(combined)) {
      domain = 'Education';
    } else if (/\b(accountant|accounting|cpa|gaap|ledger|sox|audit|auditing|tax|financial reporting|reconciliation|bookkeeping)\b/i.test(combined)) {
      domain = 'Finance & Accounting';
    } else if (/\b(developer|software|frontend|backend|fullstack|devops|engineer|programming|coding|react|python|java|aws)\b/i.test(combined)) {
      domain = 'Technology';
    } else if (/\b(marketing|seo|sem|content|social media|brand|campaign)\b/i.test(combined)) {
      domain = 'Marketing';
    } else if (/\b(hr|human resources|recruiting|talent acquisition|payroll|onboarding)\b/i.test(combined)) {
      domain = 'Human Resources';
    } else if (/\b(legal|attorney|paralegal|counsel|litigation|contract)\b/i.test(combined)) {
      domain = 'Legal';
    } else {
      domain = 'General';
    }
  }

  if (!role) {
    const titleMatch = jd.match(/^(?:job\s+title|role|position\s+title|title|position)\s*:\s*(.+)$/im);
    if (titleMatch && titleMatch[1]) {
      const rawTitle = cleanLabel(titleMatch[1]).replace(/[-–—]\s*product team.*$/i, '').trim();
      if (rawTitle && rawTitle.length <= 60 && !isJdInstructionOrTestText(rawTitle)) {
        role = rawTitle;
      }
    }
    if (!role) {
      const lines = jd.split('\n').map((s) => s.replace(/^[#*–—\s]+/, '').trim()).filter((s) => s && !isInvalidJdRequirement(s));
      const firstLine = lines[0] || '';
      if (firstLine && firstLine.length <= 60 && !/^(about|job|description|overview|we are|summary|welcome)/i.test(firstLine)) {
        role = firstLine.replace(/[-–—]\s*product team.*$/i, '').trim();
      } else {
        const match = combined.match(/\b(registered nurse|icu nurse|staff nurse|high school teacher|math teacher|primary school teacher|elementary teacher|staff accountant|senior accountant|accounting manager|software engineer|frontend developer|backend engineer|full[- ]stack developer|data analyst)\b/i);
        role = match ? cleanLabel(match[0]) : (domain === 'Technology' ? 'Software Engineer' : `${domain} Professional`);
      }
    }
  }

  return { role, domain };
}

// ─── OPEN-DOMAIN REQUIREMENT EXTRACTION ──────────────────────────────────────
const DOMAIN_REQ_STOP_WORDS = new Set([
  'with', 'and', 'for', 'from', 'your', 'that', 'this', 'have', 'required', 'preferred',
  'skills', 'skill', 'experience', 'minimum', 'plus', 'years', 'using', 'ability', 'must'
]);

const domainRequirementEvidence = (resumeText, reqPhrase) => {
  const res = asText(resumeText);
  if (textHasPhrase(res, reqPhrase)) return true;
  const words = reqPhrase.split(/\s+/).filter((w) => w.length >= 3 && !DOMAIN_REQ_STOP_WORDS.has(w.toLowerCase()));
  if (!words.length) return false;
  const t = res.toLowerCase();
  const matched = words.filter((w) => {
    const raw = w.toLowerCase();
    const root = raw.replace(/(ing|tion|tions|ed|s|ment|ments|al|ive)$/, '');
    const check = root.length >= 3 ? root : raw;
    return t.includes(check);
  });
  return (matched.length / words.length) >= 0.5;
};

const extractDomainRequirements = (jd, resume, ats) => {
  const extracted = [];
  const seen = new Set();
  const firstLine = asText(jd).split(/\r?\n/).map(cleanPhrase).filter(Boolean)[0] || '';
  const firstLineKey = firstLine.toLowerCase();

  const add = (phrase) => {
    const p = cleanLabel(phrase);
    const key = p.toLowerCase();
    if (!p || seen.has(key)) return;
    if (isInvalidJdRequirement(p)) return;
    if (key === firstLineKey || (firstLineKey && firstLineKey.startsWith(key) && key.length > 5)) return;
    if (key.includes(' — ') || key.includes(' - ') || key.includes(' – ')) return;
    if (/^(registered nurse|software engineer|high school teacher|primary school teacher|elementary teacher|staff accountant|developer|engineer|teacher|nurse|accountant)\b/i.test(key)) return;
    if (!isSkillLikePhrase(p)) return;
    if (RESPONSIBILITY_VERB_SET.has(key)) return;
    if (RESPONSIBILITY_VERB_PATTERN.test(p) && p.split(/\s+/).length <= 2) return;
    for (const def of SOFT_SKILL_INDEX.values()) {
      if (mentionedBy(p, def)) return;
    }
    for (const def of EXPERIENCE_INDEX.values()) {
      if (mentionedBy(p, def)) return;
    }
    seen.add(key);
    extracted.push(p);
  };

  // 1. From ATS agent explicit extractedRequirements if present (ONLY if grounded in JD and not invalid)
  for (const r of asArray(ats.extractedRequirements)) {
    if (textHasPhrase(jd, r) && !isInvalidJdRequirement(r)) {
      add(r);
    }
  }

  // 2. From ATS present/missing keywords that appear in JD
  for (const k of [...asArray(ats.presentKeywords), ...asArray(ats.missingKeywords)]) {
    if (textHasPhrase(jd, k) && !isInvalidJdRequirement(k)) {
      add(k);
    }
  }

  // 3. Extract capitalized acronyms (e.g. BLS, ACLS, CPR, HIPAA, GAAP, SOX, CPA, CFA, IEP, ELL, PMP, EHR, EMR, OSHA, FDA, AWS, GCP, SQL)
  const acronyms = [...asText(jd).matchAll(/\b[A-Z]{2,6}\b/g)].map((m) => m[0]);
  const IGNORE_ACRONYMS = new Set([
    'AND', 'THE', 'FOR', 'WITH', 'NOT', 'YOU', 'OUR', 'ARE', 'PER', 'ALL', 'NEW', 'WHO', 'CAN', 'HAS', 'HAD', 'JOB', 'SWE', 'USA', 'INC', 'LLC', 'LTD',
    'TO', 'HAVE', 'NICE', 'PLUS', 'MUST', 'WILL', 'WHAT', 'WHEN', 'WHY', 'HOW', 'EACH', 'SOME', 'ANY', 'BOTH', 'FROM', 'INTO', 'THAT', 'THIS', 'THEIR', 'THEM',
    'ROLE', 'TEAM', 'WORK', 'GOOD', 'BEST', 'HIGH', 'WELL', 'VERY', 'FULL', 'PART', 'TIME', 'DAYS', 'YEAR', 'JOIN', 'HELP', 'MAKE', 'TAKE', 'GIVE',
    'DOMAIN', 'LOCATION', 'ROLE', 'TYPE', 'SKILL', 'SKILLS', 'DUTIES', 'TEST', 'TESTS', 'NOTE', 'NOTES', 'ABOUT', 'LIKE', 'CAREERLENS', 'CITY', 'STATE', 'DATE', 'INFO'
  ]);
  const HEADING_PHRASES = /^(requirements|qualifications|nice to have|must have|responsibilities|duties|what you will do|who you are|about the role|about us|benefits|overview)\b/i;
  for (const a of acronyms) {
    if (!IGNORE_ACRONYMS.has(a) && !isInvalidJdRequirement(a)) add(a);
  }

  // 4. Bullet items from skills / qualifications sections of JD
  const sections = parseJdSections(jd);
  for (const seg of [...sections.skills, ...sections.qualifications]) {
    if (seg.length >= 3 && seg.length <= 60 && !isInvalidJdRequirement(seg)) {
      const toolMatch = seg.match(/\b(Google Classroom|Canvas|Blackboard|Moodle|Seesaw|Schoology|Zoom|Microsoft Teams|Epic|Cerner|QuickBooks|NetSuite|Salesforce)\b/i);
      if (toolMatch) {
        add(cleanLabel(toolMatch[0]));
      }
      if (/\bb\.?ed\b/i.test(seg)) {
        add('B.Ed. qualification');
      }
      const firstWord = seg.split(/\s+/)[0].toLowerCase();
      if (!RESPONSIBILITY_VERB_SET.has(firstWord) && isSkillLikePhrase(seg) && !HEADING_PHRASES.test(seg)) {
        add(seg);
      }
    }
  }

  for (const seg of sections.other) {
    if (seg.length >= 3 && seg.length <= 50 && isSkillLikePhrase(seg) && !HEADING_PHRASES.test(seg) && !isInvalidJdRequirement(seg)) {
      const firstWord = seg.split(/\s+/)[0].toLowerCase();
      if (!RESPONSIBILITY_VERB_SET.has(firstWord)) {
        add(seg);
      }
    }
  }

  return extracted;
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

  // Identify target role & domain (deterministic + ATS assisted)
  const { role: targetRole, domain: targetDomain } = detectJobDomain(jd, resume, ats);

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

  // ── Open-domain requirement extraction & evaluation ───────────────────────
  const jdCanonicalNames = jdSkills.map((s) => s.name);
  const redundantWithCanonical = (phrase) => {
    const p = phrase.toLowerCase();
    return jdCanonicalNames.some((name) => {
      const cn = name.toLowerCase();
      if (cn === p) return false;
      const shorter = Math.min(cn.length, p.length);
      return shorter >= 3 && (p.includes(cn) || cn.includes(p));
    });
  };

  const rawDomainReqs = extractDomainRequirements(jd, resume, ats);
  const openDomainEvaluated = [];
  for (const req of rawDomainReqs) {
    if (redundantWithCanonical(req)) continue;
    const lower = req.toLowerCase();
    const isWeak = gapPhrases.some((p) => p.toLowerCase().includes(lower) || lower.includes(p.toLowerCase()));
    const hasEvidence = domainRequirementEvidence(resume, req);
    if (!hasEvidence) {
      openDomainEvaluated.push({ name: req, status: 'missing' });
    } else if (isWeak) {
      openDomainEvaluated.push({ name: req, status: 'weak' });
    } else {
      openDomainEvaluated.push({ name: req, status: 'matched' });
    }
  }

  // ── Experience requirements evaluation ────────────────────────────────────
  const candidateYears = estimateResumeYears(resume, ats);
  const experienceBreakdown = extractExperienceRequirements(jd, resume, ats).filter((e) => !isInvalidJdRequirement(e.name));

  const matchedExpNames = new Set(
    experienceBreakdown.filter((e) => e.status === 'matched').map((e) => e.name.toLowerCase())
  );

  const isMatchedExp = (phrase) => isMatchedExperiencePhrase(phrase, candidateYears, matchedExpNames);

  // ── Agent phrase classification ──────────────────────────────────────────
  // Phrases only enter the lists when they are verifiable in the raw inputs.
  const matchedPhrases = [];
  const weakPhrases = [];
  const missingPhrases = [];
  for (const phrase of gapPhrases) {
    if (redundantWithCanonical(phrase)) continue;
    if (isMatchedExp(phrase)) continue;
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

  const openMatchedNames = openDomainEvaluated.filter((o) => o.status === 'matched').map((o) => o.name);
  const openWeakNames = openDomainEvaluated.filter((o) => o.status === 'weak').map((o) => o.name);
  const openMissingNames = openDomainEvaluated.filter((o) => o.status === 'missing').map((o) => o.name);

  const matchedSkills = dedupe([...matchedLexicon, ...matchedPhrases, ...openMatchedNames]).filter((s) => !isInvalidJdRequirement(s));
  const weakSkills = dedupe([...weakLexicon, ...weakPhrases, ...openWeakNames]).filter((s) => !isInvalidJdRequirement(s));
  const missingSkills = dedupe([...missingLexicon, ...missingPhrases, ...openMissingNames]).filter((s) => !isInvalidJdRequirement(s) && !isMatchedExp(s));

  // ── Deterministic skills coverage ─────────────────────────────────────────
  // 1. Canonical coverage (tech jobs): scored on canonical skills + concepts.
  const canonicalTotal = matchedLexicon.length + weakLexicon.length + missingLexicon.length + jdConcepts.length;
  const canonicalCoveragePercent = canonicalTotal > 0
    ? Math.round((100 * (matchedLexicon.length + matchedConcepts.length + 0.5 * weakLexicon.length)) / canonicalTotal)
    : null;

  // 2. Open-domain coverage (non-tech jobs): scored on extracted domain requirements.
  const openTotal = openDomainEvaluated.length;
  const openCoveragePercent = openTotal > 0
    ? Math.round((100 * (openMatchedNames.length + 0.5 * openWeakNames.length)) / openTotal)
    : null;

  // 3. Fallback when JD has no recognizable skills: use ATS present vs missing keyword count.
  const atsPresent = asArray(ats.presentKeywords).length;
  const atsMissing = asArray(ats.missingKeywords).length;
  const keywordCoveragePercent = (atsPresent + atsMissing) > 0
    ? Math.round((100 * atsPresent) / (atsPresent + atsMissing))
    : null;

  // Final skills coverage: canonical first (if tech skills exist), otherwise open-domain, then keywords.
  const skillsCoveragePercent = canonicalCoveragePercent ?? openCoveragePercent;
  const coverageProxy = skillsCoveragePercent ?? keywordCoveragePercent ?? clampScore(ats.score) ?? 0;

  // ── Sub-scores (all ints 0–100) ───────────────────────────────────────────
  const atsCompatibility = clampScore(ats.score) ?? coverageProxy;
  const skillsMatch = skillsCoveragePercent ?? keywordCoveragePercent ?? coverageProxy;
  const expTotal = experienceBreakdown.length;
  const expMatchedCount = experienceBreakdown.filter((e) => e.status === 'matched').length;
  const calculatedExpScore = expTotal > 0 ? Math.round((100 * expMatchedCount) / expTotal) : null;
  const experienceMatch = clampScore(recruiter.score) ?? calculatedExpScore ?? coverageProxy;
  const domainDepthMatch = clampScore(engineer.score) ?? coverageProxy;
  const technicalMatch = domainDepthMatch; // legacy alias for backward compatibility

  // ── overallMatch = documented weighted blend ─────────────────────────────
  let overallMatch = Math.round(
    MATCH_WEIGHTS.ats * atsCompatibility +
    MATCH_WEIGHTS.skills * skillsMatch +
    MATCH_WEIGHTS.experience * experienceMatch +
    MATCH_WEIGHTS.domainDepth * domainDepthMatch
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
    if (s.length >= 8 && s.length <= 220 && !isInvalidJdRequirement(s) && !isMatchedExp(s)) recommendations.push(s);
    if (recommendations.length >= 4) break;
  }
  while (recommendations.length < 3) {
    if (recommendations.length === 0) recommendations.push('Resume already reflects the core skills in the job description — add quantified, real outcomes to your most relevant experience bullets.');
    else recommendations.push('Lead the resume with the experience and keywords this job description emphasizes.');
  }
  const finalRecommendations = dedupe(recommendations.map((s) => cleanLabel(s)).filter((s) => s && !isInvalidJdRequirement(s) && !isMatchedExp(s))).slice(0, 5);

  // ── Requirement breakdown (four-category JD classification) ──────────────
  // Canonical breakdown
  const lexiconStatus = new Map();
  for (const s of matchedLexicon) lexiconStatus.set(s, 'matched');
  for (const s of weakLexicon) lexiconStatus.set(s, 'weak');
  for (const s of missingLexicon) lexiconStatus.set(s, 'missing');
  const technicalBreakdownNames = sortByJdPresence(
    [...jdSkills.map((s) => s.name), ...matchedConcepts, ...missingConcepts],
    jd
  ).filter((s) => !isInvalidJdRequirement(s));
  const technicalBreakdown = technicalBreakdownNames.map((name) => ({
    name,
    status: matchedConcepts.includes(name) ? 'matched'
      : missingConcepts.includes(name) ? 'missing'
      : lexiconStatus.get(name) || 'matched',
  }));

  // Domain skills breakdown: canonical skills + open domain requirements
  const domainSkillsBreakdown = [...technicalBreakdown].filter((s) => !isInvalidJdRequirement(s.name));
  const seenSkillNames = new Set(technicalBreakdown.map((s) => s.name.toLowerCase()));
  for (const od of openDomainEvaluated) {
    if (!seenSkillNames.has(od.name.toLowerCase()) && !isInvalidJdRequirement(od.name)) {
      seenSkillNames.add(od.name.toLowerCase());
      domainSkillsBreakdown.push(od);
    }
  }

  // responsibilities: verb phrases from the JD; 'matched' when ANY verb in the
  // phrase is evidenced (stemmed) in the resume.
  const responsibilityBreakdown = extractResponsibilityPhrases(jd)
    .filter((phrase) => !isInvalidJdRequirement(phrase))
    .map((phrase) => ({
      name: phrase,
      status: evaluateResponsibilityEvidence(resume, phrase) ? 'matched' : 'missing',
    }));

  // softSkills: noun phrases from the JD; 'matched' when the resume mentions
  // the same phrase (aliases included).
  const softSkillNames = sortByJdPresence(
    [...SOFT_SKILL_INDEX.values()].filter((d) => mentionedBy(jd, d)).map((d) => d.name),
    jd
  ).filter((s) => !isInvalidJdRequirement(s));
  const softSkillsBreakdown = softSkillNames.map((name) => ({
    name,
    status: mentionedBy(resume, SOFT_SKILL_INDEX.get(name)) ? 'matched' : 'missing',
  }));

  const requirementBreakdown = {
    coreDomainSkills: domainSkillsBreakdown,
    technicalSkills: domainSkillsBreakdown, // legacy alias for backward compatibility
    responsibilities: responsibilityBreakdown,
    experienceRequirements: experienceBreakdown,
    softSkills: softSkillsBreakdown,
  };

  // ── Output ────────────────────────────────────────────────────────────────
  return {
    targetRole,
    targetDomain,
    overallMatch,
    overallScore: overallMatch, // alias for consistency
    atsCompatibility,
    skillsMatch,
    experienceMatch,
    domainDepthMatch,
    technicalMatch, // legacy alias
    matchedSkills: sortByJdPresence(matchedSkills, jd).filter((s) => !isInvalidJdRequirement(s)),
    missingSkills: sortByJdPresence(missingSkills, jd).filter((s) => !isInvalidJdRequirement(s)),
    weakSkills: sortByJdPresence(weakSkills, jd).filter((s) => !isInvalidJdRequirement(s)),
    topGaps: topGaps.filter((g) => !isInvalidJdRequirement(g.skill)),
    recommendations: finalRecommendations,
    requirementBreakdown,
  };
}

/**
 * Single normalized requirement-evidence analysis for a JD against a resume.
 * Unifies ATS, Skills, Breakdown, Top Gaps, Deep ATS, and Recommendations.
 */
export function analyzeJdRequirements(jobDescription = '', resumeText = '', atsResult = {}) {
  const jd = asText(jobDescription);
  const resume = asText(resumeText);
  const { role, domain } = detectJobDomain(jd, resume, atsResult);

  // 1. Responsibilities (action duties from JD)
  const responsibilityPhrases = extractResponsibilityPhrases(jd);
  const responsibilities = responsibilityPhrases
    .filter((phrase) => !isInvalidJdRequirement(phrase))
    .map((phrase) => {
      const isMatched = evaluateResponsibilityEvidence(resume, phrase);
      return {
        name: phrase,
        status: isMatched ? 'matched' : 'missing',
      };
    });

  // 2. Soft Skills (strictly from JD)
  const softSkillDefs = [...SOFT_SKILL_INDEX.values()].filter((d) => mentionedBy(jd, d));
  const softSkills = softSkillDefs
    .filter((d) => !isInvalidJdRequirement(d.name))
    .map((d) => {
      const isMatched = mentionedBy(resume, d);
      return {
        name: d.name,
        status: isMatched ? 'matched' : 'missing',
      };
    });

  // 3. Experience Requirements
  const experienceRequirements = extractExperienceRequirements(jd, resume, atsResult)
    .filter((e) => !isInvalidJdRequirement(e.name));

  const candidateYears = estimateResumeYears(resume, atsResult);
  const matchedExpNames = new Set(
    experienceRequirements.filter((e) => e.status === 'matched').map((e) => e.name.toLowerCase())
  );

  const isMatchedExp = (phrase) => isMatchedExperiencePhrase(phrase, candidateYears, matchedExpNames);

  // 4. Core Domain Skills (strictly grounded in JD)
  const jdSkills = [...SKILL_INDEX.values()].filter((s) => skillIsMentioned(jd, s));
  const rawDomainReqs = extractDomainRequirements(jd, resume, atsResult);
  const coreDomainSkills = [];
  const seenSkill = new Set();

  for (const s of jdSkills) {
    if (isInvalidJdRequirement(s.name)) continue;
    seenSkill.add(s.name.toLowerCase());
    const isMatched = skillIsMentioned(resume, s);
    coreDomainSkills.push({
      name: s.name,
      status: isMatched ? 'matched' : 'missing',
    });
  }

  for (const req of rawDomainReqs) {
    if (!seenSkill.has(req.toLowerCase()) && textHasPhrase(jd, req) && !isInvalidJdRequirement(req)) {
      seenSkill.add(req.toLowerCase());
      const hasEvidence = domainRequirementEvidence(resume, req);
      coreDomainSkills.push({
        name: req,
        status: hasEvidence ? 'matched' : 'missing',
      });
    }
  }

  // Unified matched and missing lists
  const matchedList = [];
  const missingList = [];

  for (const r of responsibilities) {
    if (r.status === 'matched') matchedList.push(r.name);
    else missingList.push(r.name);
  }
  for (const s of softSkills) {
    if (s.status === 'matched') matchedList.push(s.name);
    else missingList.push(s.name);
  }
  for (const d of coreDomainSkills) {
    if (d.status === 'matched') matchedList.push(d.name);
    else missingList.push(d.name);
  }
  for (const e of experienceRequirements) {
    if (e.status === 'matched') matchedList.push(e.name);
    else missingList.push(e.name);
  }

  const extractedRequirements = dedupeStrings([
    ...responsibilities.map((r) => r.name),
    ...coreDomainSkills.map((d) => d.name),
    ...softSkills.map((s) => s.name),
    ...experienceRequirements.map((e) => e.name),
  ]).filter((r) => !isInvalidJdRequirement(r));

  return {
    targetRole: role,
    targetDomain: domain,
    responsibilities,
    softSkills,
    experienceRequirements,
    coreDomainSkills,
    matchedList: dedupeStrings(matchedList).filter((s) => !isInvalidJdRequirement(s)),
    missingList: dedupeStrings(missingList).filter((s) => !isInvalidJdRequirement(s) && !isMatchedExp(s)),
    extractedRequirements,
    candidateYears,
  };
}

// ─── JOB MATCH → APPLICATIONS INTEGRATION HELPERS ───────────────────────────

/**
 * Extracts company name if explicitly available in Job Description.
 * Otherwise returns an empty string.
 */
export function extractCompanyFromJd(jobDescription = '') {
  if (!jobDescription || typeof jobDescription !== 'string') return '';
  const text = jobDescription.trim();
  if (!text) return '';

  const BLACKLIST_WORDS = new Set([
    'about us', 'about the company', 'about the role', 'about our team', 'about',
    'the company', 'company overview', 'who we are', 'we are', 'our team',
    'overview', 'job overview', 'job description', 'description', 'requirements',
    'the role', 'responsibilities', 'qualifications', 'position summary',
    'role overview', 'summary', 'introduction', 'welcome', 'general', 'location',
    'full-time', 'part-time', 'contract', 'job type', 'salary', 'benefits'
  ]);

  const sanitizeCandidate = (raw) => {
    if (!raw) return '';
    let cleaned = raw
      .replace(/^[#*–—\s:"]+/, '')
      .replace(/[#*–—\s:".]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 2 || cleaned.length > 50) return '';
    if (BLACKLIST_WORDS.has(cleaned.toLowerCase())) return '';
    return cleaned;
  };

  // 1. Explicit labeled lines
  // e.g., "Company: Acme Corp", "Company Name: Apollo Hospitals", "Hospital: Mayo Clinic"
  const labelMatch = text.match(/(?:^|[\n\r])\s*(?:Company(?:\s+Name)?|Employer|Organization|Hospital|School|Firm|Agency|Clinic|Institution)\s*[:\-–]\s*([^\n\r,;|]+)/i);
  if (labelMatch && labelMatch[1]) {
    const candidate = sanitizeCandidate(labelMatch[1]);
    if (candidate) return candidate;
  }

  // 2. Phrases like "About Acme Corp:", "About Acme Corp is a..."
  const aboutMatch = text.match(/(?:^|[\n\r])\s*About\s+([A-Z][A-Za-z0-9&.,'\s]{1,40}?)(?:\s*[:\n]|\s+is\s+(?:a|an|the|hiring|seeking|leading))/m);
  if (aboutMatch && aboutMatch[1]) {
    const candidate = sanitizeCandidate(aboutMatch[1]);
    if (candidate) return candidate;
  }

  // 3. Phrases like "join the team at Google", "our team at Stripe"
  const joinMatch = text.match(/(?:join|at)\s+(?:the\s+team\s+at|our\s+team\s+at)\s+([A-Z][A-Za-z0-9&.,'\s]{1,40})/i);
  if (joinMatch && joinMatch[1]) {
    const candidate = sanitizeCandidate(joinMatch[1]);
    if (candidate) return candidate;
  }

  return '';
}

/**
 * Extracts location if explicitly available in Job Description.
 * Otherwise returns an empty string.
 */
export function extractLocationFromJd(jobDescription = '') {
  if (!jobDescription || typeof jobDescription !== 'string') return '';
  const text = jobDescription.trim();
  if (!text) return '';

  const BLACKLIST_LOCATIONS = new Set([
    'full-time', 'part-time', 'contract', 'permanent', 'immediate',
    'not specified', 'n/a', 'tbd', 'anywhere', 'competitive', 'negotiable',
    'requirements', 'overview', 'description', 'role', 'responsibilities'
  ]);

  const sanitizeCandidate = (raw) => {
    if (!raw) return '';
    let cleaned = raw
      .replace(/^[#*–—\s:"]+/, '')
      .replace(/[#*–—\s:".]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 2 || cleaned.length > 60) return '';
    if (BLACKLIST_LOCATIONS.has(cleaned.toLowerCase())) return '';
    return cleaned;
  };

  // 1. Explicit labeled lines
  // e.g., "Location: New York, NY", "Job Location: Remote", "Work Location - Mumbai"
  const labelMatch = text.match(/(?:^|[\n\r])\s*(?:Job\s+Location|Work\s+Location|Office\s+Location|Base\s+Location|Location|City)\s*[:\-–]\s*([^\n\r;|]+)/i);
  if (labelMatch && labelMatch[1]) {
    const candidate = sanitizeCandidate(labelMatch[1]);
    if (candidate) return candidate;
  }

  // 2. Workplace type / arrangement lines
  const workplaceMatch = text.match(/(?:^|[\n\r])\s*(?:Workplace(?:\s+Type)?|Work\s+Arrangement)\s*[:\-–]\s*([^\n\r;|]+)/i);
  if (workplaceMatch && workplaceMatch[1]) {
    const candidate = sanitizeCandidate(workplaceMatch[1]);
    if (candidate) return candidate;
  }

  // 3. Explicit standalone Remote declarations
  const remoteMatch = text.match(/(?:^|[\n\r])\s*(100%\s+Remote|Fully\s+Remote|Remote\s+Only)\b/i);
  if (remoteMatch && remoteMatch[1]) {
    return sanitizeCandidate(remoteMatch[1]) || 'Remote';
  }

  return '';
}

/**
 * Duplicate check for job applications:
 * Matches on same company + same job title + same relevant job description.
 */
export function findDuplicateApplication(appCandidate, existingApps = []) {
  if (!appCandidate || !Array.isArray(existingApps) || existingApps.length === 0) {
    return null;
  }

  const norm = (str) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const targetCompany = norm(appCandidate.company || appCandidate.companyName);
  const targetTitle = norm(appCandidate.jobTitle);
  const targetJd = norm(appCandidate.jobDescription);

  if (!targetCompany || !targetTitle) {
    return null;
  }

  return (
    existingApps.find((existing) => {
      const exCompany = norm(existing.company || existing.companyName);
      const exTitle = norm(existing.jobTitle);
      const exJd = norm(existing.jobDescription);

      if (exCompany !== targetCompany) return false;
      if (exTitle !== targetTitle) return false;

      // Relevant Job Description match
      // If both have no JD: matches
      if (!targetJd && !exJd) return true;
      // If both have JD: check exact match or substantial prefix/substring match
      if (targetJd && exJd) {
        if (targetJd === exJd) return true;
        const prefixLen = Math.min(100, Math.min(targetJd.length, exJd.length));
        if (prefixLen >= 30 && targetJd.slice(0, prefixLen) === exJd.slice(0, prefixLen)) {
          return true;
        }
        if (targetJd.includes(exJd) || exJd.includes(targetJd)) {
          return true;
        }
      }
      return false;
    }) || null
  );
}

/**
 * Extracts prefill fields strictly from the CURRENT analysis only.
 * Guaranteed zero leakage of previous analyses, previous resumes, or stale caches.
 */
export function extractJobApplicationPrefill({
  jobMatch = null,
  jobDescription = '',
  resumeText = '',
  companyMode = 'general',
  agentResults = {},
} = {}) {
  const jd = typeof jobDescription === 'string' ? jobDescription : '';
  const resume = typeof resumeText === 'string' ? resumeText : '';

  // 1. Job Title from CURRENT analysis
  let jobTitle = (jobMatch?.targetRole || agentResults?.ats?.detectedRole || '').trim();
  if (!jobTitle) {
    const detected = detectJobDomain(jd, resume, agentResults?.ats);
    jobTitle = (detected?.role || '').trim();
  }

  // 2. Job Match Score from CURRENT deterministic match
  let matchScore = null;
  const rawScore = jobMatch?.overallMatch ?? jobMatch?.overallScore;
  if (typeof rawScore === 'number' && !isNaN(rawScore)) {
    matchScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  // 3. Job Description from CURRENT text
  const currentJd = jd.trim();

  // 4. Application Date (today)
  const applicationDate = new Date().toISOString().split('T')[0];

  // 5. Status (Saved)
  const status = 'Saved';

  // 6. Notes (blank by default)
  const notes = '';

  // 7. Company (CURRENT analysis / JD only, otherwise blank)
  let company = (jobMatch?.targetCompany || '').trim();
  if (!company && companyMode && companyMode !== 'general') {
    const companyModeMap = {
      google: 'Google',
      amazon: 'Amazon',
      microsoft: 'Microsoft',
      jpmorgan: 'JPMorgan Chase',
      barclays: 'Barclays',
      tcs: 'TCS',
      accenture: 'Accenture',
      infosys: 'Infosys',
      capgemini: 'Capgemini',
    };
    company = companyModeMap[companyMode.toLowerCase()] || (companyMode.charAt(0).toUpperCase() + companyMode.slice(1));
  }
  if (!company && jd) {
    company = extractCompanyFromJd(jd);
  }

  // 8. Location (explicitly available from JD, otherwise blank)
  let location = (jobMatch?.targetLocation || '').trim();
  if (!location && jd) {
    location = extractLocationFromJd(jd);
  }

  return {
    company: company || '',
    jobTitle: jobTitle || '',
    location: location || '',
    applicationDate,
    status,
    matchScore,
    jobDescription: currentJd,
    notes,
  };
}

/**
 * Format YYYY-MM-DD or timestamp to human readable date e.g. "Sep 26, 2026".
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = String(dateStr).split('-');
    if (y && m && d) {
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Returns a status-aware date label for applications:
 * Saved → "Saved: [date]"
 * Applied → "Applied: [date]"
 * Interview → "Interview: [date]"
 * Offer → "Offer: [date]"
 * Rejected → "Rejected: [date]"
 * Fallback → "Added: [date]"
 */
export function getStatusDateLabel(status, dateStr) {
  const formatted = formatDate(dateStr);
  switch (status) {
    case 'Saved':
      return `Saved: ${formatted}`;
    case 'Applied':
      return `Applied: ${formatted}`;
    case 'Interview':
      return `Interview: ${formatted}`;
    case 'Offer':
      return `Offer: ${formatted}`;
    case 'Rejected':
      return `Rejected: ${formatted}`;
    default:
      return `Added: ${formatted}`;
  }
}

export { findAnalysisForResume } from './userStorage.js';



