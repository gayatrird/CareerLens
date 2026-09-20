import { companyContexts } from '../config/agents';

const API_URL = '/api/groq';
// gpt-oss-120b is used because the account's Groq key no longer has access to
// llama-3.3-70b-versatile (returns 404). Same Groq client/provider, no change
// to API_URL, retries, or response_format handling.
const MODEL   = 'openai/gpt-oss-120b';


const cleanText = (text) => {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
};

const getCompanyContext = (companyMode) => {
  return companyContexts[companyMode] || companyContexts.general;
};

// ─── AGENT SYSTEM PROMPTS ──────────────────────────────────────────────────

// ─── STRUCTURED OUTPUT SCHEMAS ──────────────────────────────────────────────
// The current model (openai/gpt-oss-120b) drifts from the JSON described inside
// plain prompts when response_format is only `json_object`. Groq's strict
// `json_schema` output enforces the exact key structure declared in each prompt,
// so every caller passes its schema. Schemas mirror the JSON the prompts ask for.
const num0100 = { type: 'number', minimum: 0, maximum: 100 };
const strArray = { type: 'array', items: { type: 'string' } };

const AGENT_SCHEMAS = {
  ats: {
    name: 'ats_result',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        score: num0100,
        missingKeywords: strArray,
        presentKeywords: strArray,
        suggestions: strArray,
        formattingIssues: { type: 'string' },
        sectionQuality: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['score', 'missingKeywords', 'presentKeywords', 'suggestions', 'formattingIssues', 'sectionQuality', 'summary'],
      additionalProperties: false,
    },
  },
  recruiter: {
    name: 'recruiter_result',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        score: num0100,
        strongProjects: strArray,
        weakProjects: strArray,
        missingExperience: strArray,
        techStackAlignment: { type: 'string' },
        experienceRelevance: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['score', 'strongProjects', 'weakProjects', 'missingExperience', 'techStackAlignment', 'experienceRelevance', 'summary'],
      additionalProperties: false,
    },
  },
  engineer: {
    name: 'engineer_result',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        score: num0100,
        likelyInterviewQuestions: strArray,
        weakTechnicalAreas: strArray,
        strongTechnicalAreas: strArray,
        architectureObservation: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['score', 'likelyInterviewQuestions', 'weakTechnicalAreas', 'strongTechnicalAreas', 'architectureObservation', 'summary'],
      additionalProperties: false,
    },
  },
  manager: {
    name: 'manager_result',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        decision: { type: 'string', enum: ['HIRE', 'MAYBE', 'REJECT'] },
        score: num0100,
        reasons: strArray,
        communicationClarity: { type: 'string' },
        achievementStrength: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['decision', 'score', 'reasons', 'communicationClarity', 'achievementStrength', 'summary'],
      additionalProperties: false,
    },
  },
  optimizer: {
    name: 'optimizer_result',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        improvedBullets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              original: { type: 'string' },
              improved: { type: 'string' },
            },
            required: ['original', 'improved'],
            additionalProperties: false,
          },
        },
        writingTips: strArray,
        overallImpactScore: num0100,
        summary: { type: 'string' },
      },
      required: ['improvedBullets', 'writingTips', 'overallImpactScore', 'summary'],
      additionalProperties: false,
    },
  },
};

const RECOMMENDATION_SCHEMA = {
  name: 'final_recommendation',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      overallMatch: num0100,
      recommendation: { type: 'string', enum: ['SHORTLIST', 'MAYBE', 'NOT_ALIGNED'] },
      actionableTakeaway: { type: 'string' },
      keyStrengths: strArray,
      keyWeaknesses: strArray,
      hiringInsight: { type: 'string' },
      nextStep: { type: 'string' },
    },
    required: ['overallMatch', 'recommendation', 'actionableTakeaway', 'keyStrengths', 'keyWeaknesses', 'hiringInsight', 'nextStep'],
    additionalProperties: false,
  },
};

const INTERVIEW_SCHEMA = {
  name: 'interview_questions',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      behavioral: {
        type: 'array',
        items: {
          type: 'object',
          properties: { question: { type: 'string' }, context: { type: 'string' } },
          required: ['question', 'context'],
          additionalProperties: false,
        },
      },
      technical: {
        type: 'array',
        items: {
          type: 'object',
          properties: { question: { type: 'string' }, context: { type: 'string' } },
          required: ['question', 'context'],
          additionalProperties: false,
        },
      },
      projectSpecific: {
        type: 'array',
        items: {
          type: 'object',
          properties: { question: { type: 'string' }, context: { type: 'string' } },
          required: ['question', 'context'],
          additionalProperties: false,
        },
      },
    },
    required: ['behavioral', 'technical', 'projectSpecific'],
    additionalProperties: false,
  },
};

const DEEP_ATS_SCHEMA = {
  name: 'deep_ats_scan',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      match_score: {
        type: 'object',
        properties: { score: num0100, reason: { type: 'string' } },
        required: ['score', 'reason'],
        additionalProperties: false,
      },
      skills_comparison: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            skill: { type: 'string' },
            status: { type: 'string', enum: ['yes', 'partial', 'no'] },
            evidence: { type: 'string' },
          },
          required: ['skill', 'status', 'evidence'],
          additionalProperties: false,
        },
      },
      missing_keywords: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            importance_rank: { type: 'number', minimum: 1, maximum: 5 },
            why_it_matters: { type: 'string' },
          },
          required: ['keyword', 'importance_rank', 'why_it_matters'],
          additionalProperties: false,
        },
      },
      bullet_rewrites: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            original: { type: 'string' },
            rewritten: { type: 'string' },
            what_changed: { type: 'string' },
          },
          required: ['original', 'rewritten', 'what_changed'],
          additionalProperties: false,
        },
      },
      cover_letter: { type: 'string' },
    },
    required: ['match_score', 'skills_comparison', 'missing_keywords', 'bullet_rewrites', 'cover_letter'],
    additionalProperties: false,
  },
};

const SCORE_SCHEMA = {
  name: 'resume_section_score',
  strict: true,
  schema: {
    type: 'object',
    properties: { ats: num0100, technical: num0100, communication: num0100 },
    required: ['ats', 'technical', 'communication'],
    additionalProperties: false,
  },
};

const MOCK_INTERVIEW_START_SCHEMA = {
  name: 'mock_interview_start',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      question: { type: 'string' },
      category: {
        type: 'string',
        enum: [
          'TECHNICAL',
          'BEHAVIORAL',
          'PROBLEM_SOLVING',
          'ROLE_SPECIFIC',
          'PROJECT_DEEP_DIVE',
          'SYSTEM_DESIGN',
        ],
      },
      interviewerNote: { type: 'string' },
    },
    required: ['question', 'category', 'interviewerNote'],
    additionalProperties: false,
  },
};

const MOCK_INTERVIEW_TURN_SCHEMA = {
  name: 'mock_interview_turn',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      score: { type: 'number', minimum: 0, maximum: 100 },
      conciseFeedback: { type: 'string' },
      idealAnswerPoints: { type: 'array', items: { type: 'string' } },
      isFinished: { type: 'boolean' },
      nextQuestion: { type: 'string' },
      nextCategory: {
        type: 'string',
        enum: [
          'TECHNICAL',
          'BEHAVIORAL',
          'PROBLEM_SOLVING',
          'ROLE_SPECIFIC',
          'PROJECT_DEEP_DIVE',
          'SYSTEM_DESIGN',
          'NONE',
        ],
      },
      nextInterviewerNote: { type: 'string' },
    },
    required: [
      'score',
      'conciseFeedback',
      'idealAnswerPoints',
      'isFinished',
      'nextQuestion',
      'nextCategory',
      'nextInterviewerNote',
    ],
    additionalProperties: false,
  },
};

const MOCK_INTERVIEW_REPORT_SCHEMA = {
  name: 'mock_interview_report',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      overallScore: { type: 'number', minimum: 0, maximum: 100 },
      technicalKnowledge: { type: 'number', minimum: 0, maximum: 100 },
      problemSolving: { type: 'number', minimum: 0, maximum: 100 },
      communication: { type: 'number', minimum: 0, maximum: 100 },
      answerQuality: { type: 'number', minimum: 0, maximum: 100 },
      verdict: { type: 'string', enum: ['Strong Hire', 'Hire', 'Lean Hire', 'Lean No', 'No Hire'] },
      strengths: { type: 'array', items: { type: 'string' } },
      areasToImprove: { type: 'array', items: { type: 'string' } },
      interviewFeedback: { type: 'string' },
      suggestedNextPractice: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'overallScore',
      'technicalKnowledge',
      'problemSolving',
      'communication',
      'answerQuality',
      'verdict',
      'strengths',
      'areasToImprove',
      'interviewFeedback',
      'suggestedNextPractice',
    ],
    additionalProperties: false,
  },
};

const getAgentSystemPrompt = (agentId, companyMode) => {
  const companyCtx = getCompanyContext(companyMode);
  const companyNote = companyCtx ? `\n\nCOMPANY-SPECIFIC CONTEXT: ${companyCtx}` : '';

  const prompts = {
    ats: `You are an ATS (Applicant Tracking System) engine. Analyze the resume against the job description for keyword matches, section completeness, formatting quality, and ATS compatibility.${companyNote}

Respond ONLY in this exact JSON format with no extra text:
{
  "score": <0-100>,
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "presentKeywords": ["keyword1", "keyword2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "formattingIssues": "one sentence about formatting",
  "sectionQuality": "one sentence about section completeness",
  "summary": "2-3 sentences on overall ATS compatibility"
}`,

    recruiter: `You are a senior technical recruiter. Evaluate the resume against the job description by reviewing projects, skills, tech stack alignment, and overall experience relevance.${companyNote}

Respond ONLY in this exact JSON format with no extra text:
{
  "score": <0-100>,
  "strongProjects": ["project or achievement 1", "project or achievement 2"],
  "weakProjects": ["area 1", "area 2"],
  "missingExperience": ["missing exp 1", "missing exp 2"],
  "techStackAlignment": "one sentence on tech stack match",
  "experienceRelevance": "one sentence on experience relevance",
  "summary": "2-3 sentences on overall candidacy from a recruiter perspective"
}`,

    engineer: `You are a Staff Software Engineer conducting a technical resume review. Analyze the technical depth, architecture thinking, project complexity, and identify likely interview topics and weak areas.${companyNote}

Respond ONLY in this exact JSON format with no extra text:
{
  "score": <0-100>,
  "likelyInterviewQuestions": ["question 1?", "question 2?", "question 3?", "question 4?", "question 5?"],
  "weakTechnicalAreas": ["area 1", "area 2", "area 3"],
  "strongTechnicalAreas": ["area 1", "area 2"],
  "architectureObservation": "one sentence about system design or architecture signals",
  "summary": "2-3 sentences on overall technical depth"
}`,

    manager: `You are a Hiring Manager making the final shortlist decision. Evaluate the resume holistically for communication clarity, achievement quantification, leadership signals, and overall fit.${companyNote}

Respond ONLY in this exact JSON format with no extra text:
{
  "decision": "HIRE" or "MAYBE" or "REJECT",
  "score": <0-100>,
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "communicationClarity": "one sentence assessment",
  "achievementStrength": "one sentence on how well achievements are quantified",
  "summary": "2-3 sentences on overall shortlist decision reasoning"
}`,

    optimizer: `You are an expert resume writer. Rewrite bullets using the STAR method to maximize clarity and impact.\${companyNote}

CRITICAL RULE — READ CAREFULLY:
You may ONLY rephrase, reorder, or clarify wording that already exists in the original bullet. You must NEVER add a number, percentage, metric, timeframe, or outcome that is not already explicitly stated in the original bullet.
- If the original bullet has NO quantified result, your rewrite must also have NO quantified result. Improve it using stronger verbs, clearer scope, and better structure instead — do not invent one to "sound more impressive."
- If the original bullet already has a number (e.g. "50+ users"), you may keep or rephrase that exact number, but do not add additional invented metrics alongside it (e.g. do not add uptime %, latency, or performance gains that were never mentioned).
- Before writing each "improved" bullet, check: is every number in my rewrite present in the original? If not, remove it.

Respond ONLY in this exact JSON:
{"improvedBullets":[{"original":"text","improved":"rewritten"}],"writingTips":["t1","t2","t3"],"overallImpactScore":<0-100>,"summary":"2 sentences"}`
  };

  return prompts[agentId] || prompts.ats;
};

const getFinalRecommendationPrompt = () => {
  return `You are the Chief Talent Officer synthesizing all hiring expert reviews into one final recommendation.

CRITICAL CONSISTENCY RULE:
Your "recommendation" label MUST match the actual sentiment of the reviews and your own "hiringInsight" text. Do not output a more positive label than the evidence supports.
- Use "SHORTLIST" only if the overall signal is genuinely strong — high scores across most agents AND the Hiring Manager's decision is HIRE (not MAYBE or REJECT).
- Use "MAYBE" if the Hiring Manager's decision is MAYBE, or if your own hiringInsight text hedges with phrases like "requires further evaluation," "needs additional experience," or "may not fully align."
- Use "NOT_ALIGNED" if the Hiring Manager's decision is REJECT or the core requirements are largely missing.
- Before finalizing, check: does my recommendation label match the tone of the hiringInsight I'm about to write? If hiringInsight says "further evaluation needed," the label cannot be SHORTLIST.

Respond ONLY in this exact JSON:
{"overallMatch":<0-100>,"recommendation":"SHORTLIST"|"MAYBE"|"NOT_ALIGNED","actionableTakeaway":"One powerful sentence under 12 words","keyStrengths":["s1","s2","s3"],"keyWeaknesses":["w1","w2","w3"],"hiringInsight":"2-3 sentences","nextStep":"One concrete next step"}`;
};

const getInterviewQuestionsPrompt = () => {
  return `You are a senior technical interviewer at a top tech company. Generate targeted interview questions based on the candidate's resume and the specific job description. Questions must reference specific projects, technologies, and experiences from the resume.

Respond ONLY in this exact JSON format with no extra text:
{
  "behavioral": [
    {"question": "full question text?", "context": "why this question is asked"},
    {"question": "full question text?", "context": "why this question is asked"},
    {"question": "full question text?", "context": "why this question is asked"}
  ],
  "technical": [
    {"question": "full question text?", "context": "why this question is asked"},
    {"question": "full question text?", "context": "why this question is asked"},
    {"question": "full question text?", "context": "why this question is asked"},
    {"question": "full question text?", "context": "why this question is asked"}
  ],
  "projectSpecific": [
    {"question": "full question text?", "context": "why this question is asked"},
    {"question": "full question text?", "context": "why this question is asked"},
    {"question": "full question text?", "context": "why this question is asked"}
  ]
}`;
};

// ─── CORE API CALL ──────────────────────────────────────────────────────────

const delay = ms => new Promise(res => setTimeout(res, ms));

// ─── GROQ RATE-LIMIT (HTTP 429) HANDLING ────────────────────────────────────
// Groq throttles with HTTP 429 when a per-minute quota is exhausted. We detect
// 429 specifically, wait out the reported window (Retry-After header, or the
// "Please try again in Xs" text Groq puts in the error body), then retry a
// bounded number of times — never an uncontrolled retry loop. A module-level
// cooldown makes later calls in the same run (the next agent, the final
// recommendation) wait for that window to reopen before their FIRST request,
// instead of each call piling 429s onto the same exhausted quota.

const MAX_ATTEMPTS = 6;        // small, bounded number of attempts per call
const MAX_BACKOFF_MS = 30000;  // cap for the exponential fallback wait
const DAILY_LIMIT_MARKERS = ['TPD', 'RPD', 'per day', 'daily'];

let rateLimitCooldownUntil = 0;

// Lightweight pub/sub so the UI can show "AI service is rate limited.
// Retrying..." while a call backs off instead of looking frozen.
const rateLimitListeners = new Set();
export const subscribeRateLimitRetry = (listener) => {
  rateLimitListeners.add(listener);
  return () => rateLimitListeners.delete(listener);
};

const notifyRateLimitRetry = (message) => {
  rateLimitListeners.forEach(fn => {
    try { fn(message); } catch { /* listener errors never break the pipeline */ }
  });
};

// A daily/billing limit will NOT clear by waiting a few seconds — fail fast so
// we never burn retries (and never silently swallow the real cause).
const isDailyLimitError = detail => DAILY_LIMIT_MARKERS.some(m => detail.includes(m));

// How long to wait before the next attempt after a 429. Priority:
//   1. Retry-After response header (seconds or HTTP-date), per RFC 7231.
//   2. The retry time Groq reports in the error body ("Please try again in Xs").
//   3. Bounded exponential backoff (2s, 4s, 8s, ... capped at MAX_BACKOFF_MS).
const getRateLimitWaitMs = (response, errorDetail, attempt) => {
  const retryAfter = response?.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
    const asDate = Date.parse(retryAfter);
    if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  }
  const match = errorDetail.match(/try again in ([0-9.]+)\s*s/i);
  if (match && match[1]) return Math.ceil(parseFloat(match[1]) * 1000);
  return Math.min(MAX_BACKOFF_MS, 2000 * Math.pow(2, attempt - 1));
};

const callGroq = async (systemPrompt, userContent, options = {}) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // If an earlier call in this session was rate limited, wait out the shared
    // cooldown before firing — keeps sequential agents from each re-triggering
    // 429s on the same exhausted window.
    const cooldownLeft = rateLimitCooldownUntil - Date.now();
    if (cooldownLeft > 0) await delay(cooldownLeft);

    let response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userContent  }
          ],
          temperature:     options.temperature ?? 0.3,
          max_completion_tokens: options.maxCompletionTokens || options.maxTokens || 1200,
          // Strict structured output when a schema is provided — required for
          // gpt-oss models to respect the exact JSON shape of each agent.
          response_format: options.schema
            ? { type: 'json_schema', json_schema: options.schema }
            : { type: 'json_object' }
        })
      });
    } catch (err) {
      // Transient network-level failure (e.g. dropped connection)
      if (attempt === MAX_ATTEMPTS) throw new Error(`Groq network error: ${err.message}`);
      await delay(1500 * attempt);
      continue;
    }

    if (!response.ok) {
      let errorDetail = response.statusText;
      const is429 = response.status === 429;
      let failedGeneration = '';
      try {
        const err = await response.json();
        errorDetail = err.error?.message || errorDetail;
        failedGeneration = err.error?.failed_generation || '';
      } catch (_) {}

      // Do NOT retry HTTP 400 errors repeatedly (schema validation failure, truncation, bad request).
      // These are deterministic for the given payload/tokens; fail fast without burning retries.
      if (response.status === 400) {
        throw new Error(`Groq API Error 400: ${errorDetail}${failedGeneration ? ` (${failedGeneration.slice(0, 150)})` : ''}`);
      }

      if (is429) {
        // Daily/billing limits never clear by waiting — surface immediately.
        if (isDailyLimitError(errorDetail)) {
          throw new Error(`RATE_LIMIT_EXCEEDED: Groq quota reached (daily limit). ${errorDetail}`);
        }
        // Temporary per-minute limit: wait out the window the server reported
        // (Retry-After / message body) or fall back to exponential backoff.
        // A small buffer + jitter avoids hammering the exact boundary.
        const waitMs = getRateLimitWaitMs(response, errorDetail, attempt);
        const scheduledWait = waitMs + 300 + Math.random() * 1000;
        if (attempt === MAX_ATTEMPTS) {
          // Out of attempts: throw for THIS call, but keep the shared cooldown
          // armed so the next call in the pipeline waits out the window before
          // its first request instead of immediately 429-ing again.
          rateLimitCooldownUntil = Math.max(rateLimitCooldownUntil, Date.now() + scheduledWait);
          throw new Error(`RATE_LIMIT_EXCEEDED: Groq kept rate limiting after ${MAX_ATTEMPTS} attempts. ${errorDetail}`);
        }
        rateLimitCooldownUntil = Math.max(rateLimitCooldownUntil, Date.now() + scheduledWait);
        notifyRateLimitRetry(`AI service is rate limited. Retrying in ${Math.max(1, Math.round(scheduledWait / 1000))}s…`);
        await delay(scheduledWait);
        continue;
      }

      if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
        await delay(2000 * attempt);
        continue;
      }

      throw new Error(`Groq API Error ${response.status}: ${errorDetail}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
};

// ─── EXPORTED FUNCTIONS ─────────────────────────────────────────────────────

/**
 * Run a single hiring agent analysis
 */
export const analyzeWithAgent = async (agentId, resumeText, jobDescription, companyMode = 'general') => {
  const systemPrompt = getAgentSystemPrompt(agentId, companyMode);

  const safeResume = resumeText?.substring(0, 2000) || '';
  const safeJD = jobDescription?.substring(0, 2000) || '';

  const userContent = `RESUME:
${safeResume}

JOB DESCRIPTION:
${safeJD}

Analyze this resume against the job description and return your findings in the required JSON format.`;

  const rawResponse = await callGroq(systemPrompt, userContent, {
    temperature: agentId === 'optimizer' ? 0.5 : 0.25,
    maxTokens: 1000,
    schema: AGENT_SCHEMAS[agentId]
  });

  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    console.error(`Failed to parse ${agentId} response:`, e, rawResponse);
    throw new Error(`Failed to parse ${agentId} analysis`);
  }
};

/**
 * Generate final hiring recommendation from all agent results.
 *
 * When a computed `jobMatch` report is supplied (produced by computeJobMatch
 * after the five agents finish), its overallMatch is authoritative: the model
 * is told to use it and the parsed value is overridden below so the stored
 * `recommendation.overallMatch` always equals the deterministic jobMatch
 * overall score.
 */
export const generateHiringRecommendation = async (resumeText, jobDescription, agentResults, companyMode = 'general', jobMatch = null) => {
  const companyCtx = getCompanyContext(companyMode);
  const systemPrompt = getFinalRecommendationPrompt();

  const safeResume = resumeText?.substring(0, 1500) || '';
  const safeJD = jobDescription?.substring(0, 1500) || '';

  const userContent = `RESUME SUMMARY:
${safeResume.substring(0, 500)}...

JOB DESCRIPTION:
${safeJD}

${companyCtx ? `COMPANY CONTEXT: ${companyCtx}\n\n` : ''}ATS ANALYSIS:
Score: ${agentResults.ats?.score ?? 'N/A'}
Missing Keywords: ${(agentResults.ats?.missingKeywords || []).join(', ')}
Summary: ${agentResults.ats?.summary ?? ''}

RECRUITER REVIEW:
Score: ${agentResults.recruiter?.score ?? 'N/A'}
Missing Experience: ${(agentResults.recruiter?.missingExperience || []).join(', ')}
Summary: ${agentResults.recruiter?.summary ?? ''}

TECHNICAL DEPTH:
Score: ${agentResults.engineer?.score ?? 'N/A'}
Weak Areas: ${(agentResults.engineer?.weakTechnicalAreas || []).join(', ')}
Summary: ${agentResults.engineer?.summary ?? ''}

HIRING MANAGER DECISION:
Decision: ${agentResults.manager?.decision ?? 'N/A'}
Score: ${agentResults.manager?.score ?? 'N/A'}
Summary: ${agentResults.manager?.summary ?? ''}

RESUME OPTIMIZATION:
Impact Score: ${agentResults.optimizer?.overallImpactScore ?? 'N/A'}
Summary: ${agentResults.optimizer?.summary ?? ''}

${jobMatch ? `COMPUTED JOB MATCH (authoritative — derived from the expert scores and the resume/job description):
Overall Match: ${jobMatch.overallMatch} (ATS ${jobMatch.atsCompatibility} | Skills ${jobMatch.skillsMatch} | Experience ${jobMatch.experienceMatch} | Technical ${jobMatch.technicalMatch})
Matched Skills: ${(jobMatch.matchedSkills || []).join(', ')}
Missing Skills: ${(jobMatch.missingSkills || []).join(', ')}
Weak Skills: ${(jobMatch.weakSkills || []).join(', ')}
Top Gaps: ${(jobMatch.topGaps || []).map(g => `${g.skill} (${g.importance})`).join(', ')}

RULE: Your "overallMatch" field MUST equal the Computed Overall Match value above (${jobMatch.overallMatch}). Do not invent another number.

` : ''}Synthesize all expert reviews and deliver your final hiring recommendation in the required JSON format.`;

  const rawResponse = await callGroq(systemPrompt, userContent, {
    temperature: 0.2,
    maxTokens: 800,
    schema: RECOMMENDATION_SCHEMA
  });

  try {
    const parsed = JSON.parse(rawResponse);
    // The deterministic jobMatch overall score is authoritative when present.
    const computedOverall = jobMatch && Number.isFinite(Number(jobMatch.overallMatch))
      ? Math.max(0, Math.min(100, Math.round(Number(jobMatch.overallMatch))))
      : null;
    return {
      overallMatch: computedOverall ?? Number(parsed.overallMatch || 50),
      recommendation: parsed.recommendation || 'MAYBE',
      actionableTakeaway: cleanText(parsed.actionableTakeaway || ''),
      keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths.map(cleanText) : [],
      keyWeaknesses: Array.isArray(parsed.keyWeaknesses) ? parsed.keyWeaknesses.map(cleanText) : [],
      hiringInsight: cleanText(parsed.hiringInsight || ''),
      nextStep: cleanText(parsed.nextStep || '')
    };
  } catch (e) {
    console.error("Failed to parse final recommendation:", e, rawResponse);
    throw new Error("Failed to parse hiring recommendation");
  }
};

/**
 * Generate targeted interview questions
 */
export const generateInterviewQuestions = async (resumeText, jobDescription, companyMode = 'general') => {
  const companyCtx = getCompanyContext(companyMode);
  const systemPrompt = getInterviewQuestionsPrompt();

  const safeResume = resumeText?.substring(0, 1500) || '';
  const safeJD = jobDescription?.substring(0, 1500) || '';

  const userContent = `RESUME:
${safeResume}

JOB DESCRIPTION:
${safeJD}

${companyCtx ? `COMPANY CONTEXT: ${companyCtx}\n\n` : ''}Generate targeted interview questions that specifically reference this candidate's projects, technologies, and experiences as listed in their resume. Make questions highly specific, not generic.`;

  const rawResponse = await callGroq(systemPrompt, userContent, {
    temperature: 0.4,
    maxTokens: 700,
    schema: INTERVIEW_SCHEMA
  });

  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    console.error("Failed to parse interview questions:", e, rawResponse);
    throw new Error("Failed to parse interview questions");
  }
};

/**
 * Score a resume section (used for live scoring during analysis)
 */
export const scoreResumeSection = async (text, dimension = 'overall') => {
  const systemPrompt = `You are a resume evaluator. Score this resume text on three dimensions.
Respond ONLY in this exact JSON:
{"ats": <0-100>, "technical": <0-100>, "communication": <0-100>}
No other text.`;

  try {
    const rawResponse = await callGroq(systemPrompt, `Score this resume section: "${text.substring(0, 300)}"`, {
      temperature: 0.1,
      maxTokens: 60,
      schema: SCORE_SCHEMA
    });
    return JSON.parse(rawResponse);
  } catch {
    return { ats: 50, technical: 50, communication: 50 };
  }
};

// ─── DEEP ATS SCAN ───────────────────────────────────────────────────────────

const DEEP_ATS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst and senior technical recruiter with 15+ years of experience screening resumes against job descriptions across tech, product, and business roles.

You will be given:
[RESUME]: the candidate's full resume text
[JOB_DESCRIPTION]: the target job posting text

Analyze the resume strictly against the job description and return ONLY a valid JSON object with this exact structure — no markdown, no preamble, no commentary outside the JSON:

{
  "match_score": {
    "score": <integer 0-100>,
    "reason": "<one sentence explaining the score>"
  },
  "skills_comparison": [
    {
      "skill": "<skill or requirement from JD>",
      "status": "yes" | "partial" | "no",
      "evidence": "<short quote or reference from resume, or 'Not mentioned' if absent>"
    }
  ],
  "missing_keywords": [
    {
      "keyword": "<keyword or phrase>",
      "importance_rank": <integer 1-5>,
      "why_it_matters": "<one short phrase, e.g. 'appears 4x in JD, core requirement'>"
    }
  ],
  "bullet_rewrites": [
    {
      "original": "<verbatim weakest bullet from resume>",
      "rewritten": "<rephrased version targeting this JD>",
      "what_changed": "<one short phrase on what was emphasized or reframed>"
    }
  ],
  "cover_letter": "<~120 word tailored cover letter draft>"
}

RULES YOU MUST FOLLOW:
1. Match score must be justified by actual keyword/skill overlap and experience relevance — do not inflate it to be encouraging.
2. skills_comparison must cover every explicit requirement/skill mentioned in the JD, not a cherry-picked subset.
3. missing_keywords: rank by how frequently/prominently the term appears in the JD and how core it is to the role (e.g. a required tool ranks higher than a "nice to have").
4. bullet_rewrites: select exactly the 3 weakest or least JD-relevant bullets from the resume. You may ONLY rephrase, reframe, reorder, or use different wording to surface existing experience. You must NEVER invent metrics, technologies, responsibilities, or outcomes that are not already present or reasonably implied in the original bullet. If a bullet has no quantifiable result in the original, do not add a fabricated number.
5. cover_letter: must be grounded only in experience actually present in the resume. No invented projects, companies, or claims. Keep it to approximately 120 words, professional tone, specific to this JD (reference the role/company context if present in the JD).
6. If the job description is vague or missing key details, note this in match_score.reason rather than guessing.
7. Output valid JSON only. No trailing commentary.`;

/**
 * Run a single deep ATS scan combining match scoring, skills comparison,
 * keyword gap analysis, bullet rewrites, and cover letter generation.
 */
export const runDeepAtsScan = async (resumeText, jobDescription) => {
  const safeResume = resumeText?.substring(0, 3000) || '';
  const safeJD = jobDescription?.substring(0, 3000) || '';

  const userContent = `[RESUME]:
${safeResume}

[JOB_DESCRIPTION]:
${safeJD}`;

  const rawResponse = await callGroq(DEEP_ATS_SYSTEM_PROMPT, userContent, {
    temperature: 0.2,
    maxTokens: 2400,
    schema: DEEP_ATS_SCHEMA,
  });

  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    console.error('Failed to parse Deep ATS Scan response:', e, rawResponse);
    throw new Error('Failed to parse Deep ATS Scan results. Please try again.');
  }
};

// ─── CAREER NAVIGATOR ────────────────────────────────────────────────────────

const CAREER_NAVIGATOR_SCHEMA = {
  name: 'career_navigator',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      careerSummary: { type: 'string' },
      topCareerPaths: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            fitScore: { type: 'number', minimum: 0, maximum: 100 },
            whyFit: { type: 'string' },
            currentStrengths: { type: 'array', items: { type: 'string' } },
            skillGaps: { type: 'array', items: { type: 'string' } },
            entryLevelReality: { type: 'string' },
          },
          required: ['title', 'fitScore', 'whyFit', 'currentStrengths', 'skillGaps', 'entryLevelReality'],
          additionalProperties: false,
        },
      },
      transferableSkills: { type: 'array', items: { type: 'string' } },
      prioritySkillGaps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            skill: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            reason: { type: 'string' },
          },
          required: ['skill', 'priority', 'reason'],
          additionalProperties: false,
        },
      },
      roadmap: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            phase: { type: 'string' },
            timeframe: { type: 'string' },
            actions: { type: 'array', items: { type: 'string' } },
            outcome: { type: 'string' },
          },
          required: ['phase', 'timeframe', 'actions', 'outcome'],
          additionalProperties: false,
        },
      },
      nextBestAction: { type: 'string' },
    },
    required: ['careerSummary', 'topCareerPaths', 'transferableSkills', 'prioritySkillGaps', 'roadmap', 'nextBestAction'],
    additionalProperties: false,
  },
};

const CAREER_NAVIGATOR_SYSTEM_PROMPT = `You are an expert career strategist and professional coach. Analyze the candidate's resume and prior analysis data to generate a realistic, high-impact, concise career navigation plan.

CONCISENESS RULES & OUTPUT CONSTRAINTS:
1. Base all recommendations strictly on evidence in the resume and analysis data provided. Do not invent skills or credentials.
2. Keep ALL descriptions concise and punchy (1-2 sentences maximum per field). Avoid filler words, preamble, or essay-length text.
3. careerSummary: Exactly 2 concise sentences summarizing the candidate's current professional identity, core strengths, and immediate growth trajectory.
4. topCareerPaths: Exactly 3 best-fit career paths (no more, no less). For each path:
   - title: Clear, recognized role title
   - fitScore: Realistic 0-100 alignment score (above 80 means strong existing alignment)
   - whyFit: 1 concise sentence explaining the alignment
   - currentStrengths: Exactly 2-3 concise skill/experience bullet strings
   - skillGaps: Exactly 2-3 concise missing requirement strings
   - entryLevelReality: 1 concise sentence on entry requirements or transition path
5. transferableSkills: Exactly 4-6 concise skill strings from their background.
6. prioritySkillGaps: Exactly 3-4 items. For each item:
   - skill: Specific skill or knowledge area
   - priority: 'high', 'medium', or 'low'
   - reason: 1 concise sentence explaining why this gap matters
7. roadmap: Exactly 4 sequential phases (Phase 1 through Phase 4). For each phase:
   - phase: Phase name (e.g. "Phase 1: Foundation & Skill Audit")
   - timeframe: Realistic timeframe (e.g. "Weeks 1-4" or "Months 1-2")
   - actions: Exactly 2 concrete, actionable steps
   - outcome: 1 concise sentence describing the milestone achieved
8. nextBestAction: Exactly 1 single, immediate, punchy actionable sentence (not a generic platitude).

Respond ONLY in the required JSON format with no extra text.`;

/**
 * Generate a Career Navigator report from resume text and optional analysis context.
 * Single AI call, strictly structured JSON. Does NOT re-run the 5-agent pipeline.
 *
 * @param {string} resumeText - Extracted text of the candidate's resume
 * @param {Object} [context] - Optional enrichment from existing analysis
 * @param {Object} [context.agentResults] - { ats, recruiter, engineer, manager, optimizer }
 * @param {Object} [context.recommendation] - Final recommendation object
 * @param {Object} [context.jobMatch] - Deterministic job match scores
 * @param {string} [context.jobDescription] - Job description used in the latest analysis
 * @returns {Promise<Object>} Parsed CareerNavigator result matching CAREER_NAVIGATOR_SCHEMA
 */
export const generateCareerNavigator = async (resumeText, context = {}) => {
  const safeResume = (resumeText || '').substring(0, 1600);
  if (!safeResume || safeResume.trim().length < 20) {
    throw new Error('Resume text is too short to generate a career navigation report.');
  }

  const { agentResults = {}, recommendation = null, jobMatch = null, jobDescription = '' } = context;

  // Build a compact, token-efficient context block from existing analysis data.
  // We only include concise indicators to leave maximal token budget for generation.
  const contextLines = [];

  if (agentResults.ats) {
    contextLines.push(`ATS Score: ${agentResults.ats.score ?? 'N/A'}`);
    if ((agentResults.ats.missingKeywords || []).length > 0)
      contextLines.push(`Missing Keywords: ${agentResults.ats.missingKeywords.slice(0, 4).join(', ')}`);
  }

  if (agentResults.recruiter) {
    contextLines.push(`Recruiter Score: ${agentResults.recruiter.score ?? 'N/A'}`);
    if ((agentResults.recruiter.strongProjects || []).length > 0)
      contextLines.push(`Strong Projects: ${agentResults.recruiter.strongProjects.slice(0, 2).join(', ')}`);
    if ((agentResults.recruiter.missingExperience || []).length > 0)
      contextLines.push(`Missing Exp: ${agentResults.recruiter.missingExperience.slice(0, 2).join(', ')}`);
  }

  if (agentResults.engineer) {
    contextLines.push(`Tech Score: ${agentResults.engineer.score ?? 'N/A'}`);
    if ((agentResults.engineer.strongTechnicalAreas || []).length > 0)
      contextLines.push(`Strong Tech: ${agentResults.engineer.strongTechnicalAreas.slice(0, 2).join(', ')}`);
    if ((agentResults.engineer.weakTechnicalAreas || []).length > 0)
      contextLines.push(`Weak Tech: ${agentResults.engineer.weakTechnicalAreas.slice(0, 2).join(', ')}`);
  }

  if (agentResults.manager) {
    contextLines.push(`Manager Decision: ${agentResults.manager.decision ?? 'N/A'}`);
  }

  if (recommendation) {
    contextLines.push(`Overall Match: ${recommendation.overallMatch ?? 'N/A'}%`);
  }

  if (jobMatch) {
    contextLines.push(`Skills Match: ${jobMatch.skillsMatch ?? 'N/A'}% | Tech Match: ${jobMatch.technicalMatch ?? 'N/A'}%`);
  }

  if (jobDescription) {
    contextLines.push(`Target Role Context: ${jobDescription.substring(0, 150)}`);
  }

  const contextBlock = contextLines.length > 0
    ? `\nANALYSIS CONTEXT:\n${contextLines.join('\n')}\n`
    : '';

  const userContent = `RESUME:\n${safeResume}${contextBlock}\n\nGenerate a concise, personalized career navigation report grounded in the candidate's profile.`;

  const rawResponse = await callGroq(CAREER_NAVIGATOR_SYSTEM_PROMPT, userContent, {
    temperature: 0.3,
    maxCompletionTokens: 2800,
    schema: CAREER_NAVIGATOR_SCHEMA,
  });

  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    console.error('Failed to parse Career Navigator response:', e, rawResponse);
    throw new Error('Failed to parse Career Navigator results. Please try again.');
  }
};

/**
 * Start an interactive AI Mock Interview session.
 * Generates Question 1 tailored to the candidate's resume, target role, and focus mode.
 */
export const startMockInterview = async (
  resumeText,
  roleTitle,
  companyName = 'General',
  mode = 'mixed',
  totalQuestions = 5,
  jobContext = ''
) => {
  const safeResume = (resumeText || '').substring(0, 1600);
  const targetRole = (roleTitle || 'Software Engineer').trim();
  const targetCompany = (companyName || 'General').trim();
  const interviewMode = (mode || 'mixed').toLowerCase();

  const systemPrompt = `You are a Principal Technical Interviewer and Hiring Committee Member conducting an elite, realistic mock interview for "${targetRole}" at "${targetCompany}".
Interview Mode: ${interviewMode.toUpperCase()}. Total Questions: ${totalQuestions}.
Your goal is to evaluate the candidate thoroughly across key competencies with realistic, grounded questions.

Respond ONLY with valid JSON matching the schema.`;

  const userContent = `CANDIDATE RESUME:
${safeResume || 'General software development background.'}

ROLE: ${targetRole}
COMPANY: ${targetCompany}
INTERVIEW FOCUS: ${interviewMode.toUpperCase()}
TOTAL QUESTIONS IN SESSION: ${totalQuestions}
${jobContext ? `ADDITIONAL JOB CONTEXT / SKILLS:\n${jobContext}\n` : ''}
TASK:
Generate Question 1 (1 of ${totalQuestions}) to start this mock interview:
- If TECHNICAL: Pose an architectural or technical knowledge question tailored to "${targetRole}" (need not be restricted only to technologies explicitly mentioned in the resume). Set category to TECHNICAL.
- If BEHAVIORAL: Pose a STAR-method behavioral question about communication, teamwork, deadline management, leadership, or handling conflict. Set category to BEHAVIORAL.
- If MIXED:
  The overall interview will cover multiple distinct competency areas across the session:
  1. Technical Knowledge (TECHNICAL)
  2. Role-Specific / Job Scenarios (ROLE_SPECIFIC)
  3. Problem Solving / Systems (PROBLEM_SOLVING)
  4. Behavioral / STAR (BEHAVIORAL)
  5. Resume / Project Deep Dive (PROJECT_DEEP_DIVE)
  * IMPORTANT: Project questions must NOT dominate the interview.
  * For Question 1, generate a strong, engaging opening question from ONE of:
    - TECHNICAL (core technical principles or architecture for ${targetRole})
    - ROLE_SPECIFIC (practical domain practices, workflows, or role expectations for ${targetRole})
    - PROBLEM_SOLVING (analytical scenario, system design, or debugging challenge)
    - PROJECT_DEEP_DIVE (probing a specific key project or achievement grounded in the candidate's resume)
  * Set the "category" accurately to match the question generated.

Provide a concise "interviewerNote" outlining the key competency being tested.`;

  const rawResponse = await callGroq(systemPrompt, userContent, {
    temperature: 0.35,
    maxCompletionTokens: 800,
    schema: MOCK_INTERVIEW_START_SCHEMA,
  });

  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    console.error('Failed to parse mock interview start response:', e, rawResponse);
    throw new Error('Failed to start mock interview. Please try again.');
  }
};

/**
 * Evaluates the candidate's answer for the current question AND generates the next question
 * in a SINGLE token-efficient API call with balanced multi-competency coverage.
 */
export const submitMockInterviewTurn = async ({
  resumeText = '',
  roleTitle = 'Software Engineer',
  companyName = 'General',
  mode = 'mixed',
  currentQuestionIndex = 1,
  totalQuestions = 3,
  currentQuestion = '',
  currentCategory = 'TECHNICAL',
  userAnswer = '',
  previousTurns = [],
  jobContext = '',
}) => {
  const safeResume = (resumeText || '').substring(0, 1200);
  const safeAnswer = (userAnswer || '').trim().substring(0, 2500);
  const isFinalTurn = currentQuestionIndex >= totalQuestions;

  // Track all questions asked in this interview so far
  const completedPriorList = (previousTurns || []).map((t, idx) => ({
    num: t.questionNumber || (idx + 1),
    category: t.category || 'TECHNICAL',
    question: t.question,
    score: t.score ?? 'N/A',
    feedback: t.conciseFeedback || '',
  }));

  const allQuestionsSoFar = [
    ...completedPriorList.map((t) => `Q${t.num} [${t.category}]: "${t.question}" (Score: ${t.score}/100)`),
    `Q${currentQuestionIndex} [${currentCategory}]: "${currentQuestion}" (Current question being evaluated)`,
  ].join('\n');

  const categoriesCovered = [
    ...completedPriorList.map((t) => t.category),
    currentCategory,
  ];
  const projectCount = categoriesCovered.filter((c) => c === 'PROJECT_DEEP_DIVE').length;

  const systemPrompt = `You are a Principal Technical Interviewer evaluating a live mock interview for "${roleTitle}" at "${companyName}".
Interview Mode: ${mode.toUpperCase()}. Question ${currentQuestionIndex} of ${totalQuestions}.
You must simultaneously evaluate the candidate's answer AND determine the next question in the interview.

Respond ONLY with valid JSON matching the schema.`;

  const userContent = `CANDIDATE RESUME SUMMARY:
${safeResume.substring(0, 700)}

ROLE: ${roleTitle} | COMPANY: ${companyName} | MODE: ${mode}
${jobContext ? `JOB CONTEXT / SKILLS: ${jobContext}\n` : ''}
QUESTIONS ASKED IN THIS SESSION SO FAR:
${allQuestionsSoFar}

CATEGORIES COVERED SO FAR: [${categoriesCovered.join(', ')}]

CURRENT QUESTION (${currentQuestionIndex} of ${totalQuestions}):
Category: ${currentCategory}
Question: "${currentQuestion}"

CANDIDATE'S SUBMITTED ANSWER:
"${safeAnswer || '[No answer provided]'}"

INSTRUCTIONS:
1. EVALUATION:
   - score: A fair score (0-100) based on accuracy, structure, engineering depth, and clarity. Be realistic (shallow answers: 40-60, solid structured answers: 75-90).
   - conciseFeedback: 2-3 sentences of direct, actionable feedback. Point out specifically what was strong and what critical points were omitted.
   - idealAnswerPoints: 2-3 bullet points of what a top-tier candidate would touch upon.
2. NEXT QUESTION:
   ${isFinalTurn ? `
   - Since this was question ${currentQuestionIndex} of ${totalQuestions}, the interview is now complete.
   - Set isFinished = true
   - Set nextQuestion = "Interview complete."
   - Set nextCategory = "NONE"
   - Set nextInterviewerNote = "All questions completed."` : `
   - Set isFinished = false
   - Formulate Question ${currentQuestionIndex + 1} of ${totalQuestions}.
   - CATEGORY BALANCE RULES:
     ${mode === 'mixed' ? `
     * MIXED MODE MUST BE BALANCED across competencies:
       1. PROJECT_DEEP_DIVE: Resume/project deep-dive (must be grounded in candidate's actual resume projects).
       2. TECHNICAL: Technical knowledge & engineering concepts for "${roleTitle}" (need not be limited to technologies explicitly on their resume).
       3. PROBLEM_SOLVING: Problem-solving, scenario-based challenge, debugging, or system design.
       4. BEHAVIORAL: Behavioral / STAR question (teamwork, conflict, leadership, adaptability, learning).
       5. ROLE_SPECIFIC: Role-specific / job-related real-world situations, domain practices, and trade-offs.
     * CRITICAL RULES FOR MIXED MODE:
       - PROJECT_DEEP_DIVE MUST NOT DOMINATE. Limit project deep-dive questions to at most 1 across the interview (max 2 for 8+ questions).
       ${projectCount >= 1 ? '- A project deep dive question has ALREADY been asked in this session. You MUST select a different category (TECHNICAL, PROBLEM_SOLVING, BEHAVIORAL, or ROLE_SPECIFIC) for Question ' + (currentQuestionIndex + 1) + '.' : ''}
       - For 3-question interviews: prefer 3 distinct categories.
       - For 5-question interviews: aim for 1 Technical, 1 Behavioral, 1 Problem-Solving, 1 Role-Specific, 1 Project Deep-Dive.
       - For 8-question interviews: ensure broad coverage across all 5 competency areas.
       - Choose a category from the 5 areas that has NOT yet been covered: [${categoriesCovered.join(', ')}].
     * DYNAMIC ADAPTATION:
       - Adapt dynamically to the candidate's answer above. If they struggled or excelled, adjust difficulty or probe logically, but ensure overall category diversity across the session.
     * Set "nextCategory" to the exact category of Question ${currentQuestionIndex + 1} (one of: TECHNICAL, BEHAVIORAL, PROBLEM_SOLVING, ROLE_SPECIFIC, PROJECT_DEEP_DIVE, SYSTEM_DESIGN).` :
     mode === 'technical' ? `
     * TECHNICAL MODE: Focus on technical/engineering knowledge, architectural concepts, or problem-solving relevant to "${roleTitle}". Questions should test technical depth appropriate for the role and do not have to be limited to technologies listed on the resume. Categories: TECHNICAL, PROBLEM_SOLVING, or SYSTEM_DESIGN.` : `
     * BEHAVIORAL MODE: Focus on workplace behavior, communication, teamwork, adaptability, leadership, conflict resolution, and learning (STAR-style scenarios). Category: BEHAVIORAL.`}
   - Ensure "nextCategory" accurately matches the category of Question ${currentQuestionIndex + 1}.
   - Provide a concise nextInterviewerNote outlining the key competency being tested.`}`;

  const rawResponse = await callGroq(systemPrompt, userContent, {
    temperature: 0.35,
    maxCompletionTokens: 1200,
    schema: MOCK_INTERVIEW_TURN_SCHEMA,
  });

  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    console.error('Failed to parse mock interview turn response:', e, rawResponse);
    throw new Error('Failed to evaluate answer. Please try again.');
  }
};

/**
 * Generate a comprehensive final report and scorecard from completed mock interview turns.
 * Single API call summarizing the whole session.
 */
export const generateMockInterviewFinalReport = async (sessionData) => {
  const {
    resumeText = '',
    roleTitle = 'Software Engineer',
    companyName = 'General',
    mode = 'mixed',
    turns = [],
  } = sessionData;

  const safeResume = (resumeText || '').substring(0, 1000);

  const transcript = turns.map((t, i) => `
ROUND ${i + 1} [${t.category}]:
Question: ${t.question}
Candidate Answer: ${t.userAnswer || 'N/A'}
Score: ${t.score}/100
Turn Feedback: ${t.conciseFeedback}
Ideal Key Points: ${(t.idealAnswerPoints || []).join('; ')}
`).join('\n---\n');

  const systemPrompt = `You are the Lead Hiring Committee Director reviewing an end-of-round Mock Interview report for "${roleTitle}" at "${companyName}".
Synthesize the overall performance into a detailed, rigorous final evaluation.

Respond ONLY with valid JSON matching the schema.`;

  const userContent = `CANDIDATE RESUME:
${safeResume}

ROLE: ${roleTitle}
COMPANY: ${companyName}
INTERVIEW MODE: ${mode}

COMPLETE INTERVIEW SESSION TRANSCRIPT:
${transcript}

TASK:
Produce the comprehensive final scorecard:
- overallScore: Weighted average composite score (0-100).
- technicalKnowledge: Score (0-100) reflecting technical depth, precision, and tool proficiency.
- problemSolving: Score (0-100) reflecting analytical structure, edge cases, and reasoning.
- communication: Score (0-100) reflecting articulation, structure, and brevity.
- answerQuality: Score (0-100) reflecting completeness and relevance to the question.
- verdict: One of ['Strong Hire', 'Hire', 'Lean Hire', 'Lean No', 'No Hire'].
- strengths: 3-4 specific strengths demonstrated across the answers.
- areasToImprove: 3-4 concrete weaknesses or omissions to correct.
- interviewFeedback: A thorough, constructive 2-3 paragraph summary of candidate readiness.
- suggestedNextPractice: 3-4 concrete topics or concepts to drill next.`;

  const rawResponse = await callGroq(systemPrompt, userContent, {
    temperature: 0.25,
    maxCompletionTokens: 1800,
    schema: MOCK_INTERVIEW_REPORT_SCHEMA,
  });

  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    console.error('Failed to parse final interview report:', e, rawResponse);
    throw new Error('Failed to generate interview final report. Please try again.');
  }
};

