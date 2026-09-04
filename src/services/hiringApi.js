import { companyContexts } from '../config/agents';

const API_URL = '/api/groq/openai/v1/chat/completions';
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

const callGroq = async (systemPrompt, userContent, options = {}, retries = 8) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key is missing. Add VITE_GROQ_API_KEY to your .env file.');

  for (let attempt = 1; attempt <= retries; attempt++) {
    let response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userContent  }
          ],
          temperature:     options.temperature ?? 0.3,
          max_tokens:      options.maxTokens   ?? 1200,
          // Strict structured output when a schema is provided — required for
          // gpt-oss models to respect the exact JSON shape of each agent.
          response_format: options.schema
            ? { type: 'json_schema', json_schema: options.schema }
            : { type: 'json_object' }
        })
      });
    } catch (err) {
      // Transient network-level failure (e.g. dropped connection)
      if (attempt === retries) throw new Error(`Groq network error: ${err.message}`);
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
      
      // The model occasionally emits non-JSON despite response_format; this is
      // transient, so retry a bounded number of times instead of failing.
      const isJsonValidationError = response.status === 400 &&
        (errorDetail.includes('Failed to validate JSON') || errorDetail.includes('Failed to generate JSON'));
      if (isJsonValidationError) {
        if (attempt === retries) {
          throw new Error(`Groq API Error ${response.status}: ${errorDetail} ${failedGeneration}`);
        }
        await delay(1200 * attempt);
        continue;
      }

      if (is429) {
        // If it's a daily limit or billing limit, do not retry
        const isDailyLimit = errorDetail.includes('TPD') || errorDetail.includes('RPD') || errorDetail.includes('per day') || errorDetail.includes('daily');
        if (isDailyLimit || attempt === retries) {
          throw new Error(`RATE_LIMIT_EXCEEDED: Groq rate limit hit. ${errorDetail}`);
        }
        // It's a temporary minute limit, so wait and retry
        let waitTime = 2000 * attempt; 
        const match = errorDetail.match(/Please try again in ([\d.]+)s/);
        if (match && match[1]) {
          waitTime = (parseFloat(match[1]) * 1000) + 1000; // Parse seconds from Groq response + 1s buffer
        }
        // Add random jitter between 500ms and 2500ms to avoid collisions
        waitTime += 500 + Math.random() * 2000;
        await delay(waitTime);
        continue;
      }
      
      if (response.status >= 500 && attempt < retries) {
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
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return { ats: 50, technical: 50, communication: 50 };

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
