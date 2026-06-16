const API_URL = '/api/groq/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const cleanText = (text) => {
  if (!text) return '';
  let cleaned = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
};

const getSystemPrompt = (role, persona) => {
  return `You are ${persona.name} debating a real decision. Embody their exact philosophy and speaking style: ${persona.style}

You are arguing ${role === 'advocate' ? 'FOR' : 'AGAINST'} this decision as ${persona.name} would. 
Stay completely in character. Use their known catchphrases, thinking patterns and worldview.
STRICT RULE: Write maximum 2 sharp, punchy sentences. No more. Make every word count. Be bold and confident.
Directly attack your opponent by name if responding to them.`;
};

const getVerdictSystemPrompt = () => {
  return `You are a wise, neutral judge who has presided over a 3-round debate. Analyze all arguments fairly. Respond ONLY in this exact JSON format with no extra text:
{
  "verdict": "Write maximum 3 sentences for the verdict. Be decisive and concise.",
  "actionableTakeaway": "one short sentence under 10 words",
  "clarityScore": 85,
  "keyPointsFor": ["sentence 1", "sentence 2", "sentence 3"],
  "keyPointsAgainst": ["sentence 1", "sentence 2", "sentence 3"]
}
STRICT RULE: keyPointsFor and keyPointsAgainst must each be exactly 3 items.
Each item must be a complete sentence of 8-12 words minimum.
Not single words or phrases. Full meaningful sentences only.
Example good: "Higher education increases lifetime earnings by 65% on average"
Example bad: "Knowledge acceleration"

The clarity score must reflect the actual debate outcome. If both sides were equally strong give 45-55. If one side clearly dominated give 65-80. Only give 85+ if the winning side was overwhelmingly more convincing. Never default to 90.`;
};

export const generateArgument = async (role, leftPersona, rightPersona, topic, round, rounds, lastOpposingArgument) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key is missing");

  const persona = role === 'advocate' ? leftPersona : rightPersona;
  const opponent = role === 'advocate' ? rightPersona : leftPersona;

  let content = "";
  if (round === 1) {
    content = `The decision being debated is: "${topic}". This is Round 1. Make your opening argument ${role === 'advocate' ? 'FOR' : 'AGAINST'} this decision.`;
  } else {
    let historyText = `The decision being debated is: "${topic}".\n\nPrevious debate history:\n`;
    historyText += `Round 1 - ${leftPersona.name} said: "${rounds[0].advocate}"\n`;
    historyText += `Round 1 - ${rightPersona.name} said: "${rounds[0].opposer}"\n`;
    if (round > 2) {
      historyText += `Round 2 - ${leftPersona.name} said: "${rounds[1].advocate}"\n`;
      historyText += `Round 2 - ${rightPersona.name} said: "${rounds[1].opposer}"\n`;
    }
    
    historyText += `\nThis is Round ${round}. ${opponent.name}'s last argument was: "${lastOpposingArgument}". Now counter it and strengthen your position ${role === 'advocate' ? 'FOR' : 'AGAINST'} the decision.`;
    
    historyText += `\n\nPrevious arguments you already made:\n`;
    historyText += `Round 1: "${role === 'advocate' ? rounds[0].advocate : rounds[0].opposer}"\n`;
    if (round > 2) {
      historyText += `Round 2: "${role === 'advocate' ? rounds[1].advocate : rounds[1].opposer}"\n`;
    }
    historyText += `DO NOT repeat these ideas. Make a completely new point.`;
    
    content = historyText;
  }

  content += `\n\nCRITICAL INSTRUCTIONS:\n- Write exactly 3 sentences. No more, no less.\n- Sentence 1: Make a SPECIFIC bold claim about this exact topic\n- Sentence 2: Give ONE real statistic, study, or named example as evidence\n- Sentence 3: Directly attack the opponent's last specific point\n- Never repeat the same idea from your previous rounds\n- Stay completely in character as this persona\n- Total words: 40-60 words maximum`;

  const systemPrompt = getSystemPrompt(role, persona);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
      temperature: 0.7,
      max_tokens: 160
    })
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const err = await response.json();
      errorDetail = err.error?.message || errorDetail;
    } catch (e) { /* ignore parse error */ }
    throw new Error(`Groq API Error: ${response.status} - ${errorDetail}`);
  }

  const data = await response.json();
  return cleanText(data.choices[0].message.content);
};

export const generateVerdict = async (mode, topic, rounds) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key is missing");

  let content = `Topic: "${topic}"\nDebate Mode: "${mode}"\n\nFull debate:\n`;
  content += `Round 1 Advocate: "${rounds[0].advocate}"\n`;
  content += `Round 1 Opposer: "${rounds[0].opposer}"\n`;
  content += `Round 2 Advocate: "${rounds[1].advocate}"\n`;
  content += `Round 2 Opposer: "${rounds[1].opposer}"\n`;
  content += `Round 3 Advocate: "${rounds[2].advocate}"\n`;
  content += `Round 3 Opposer: "${rounds[2].opposer}"\n\n`;
  content += `Deliver your final verdict as judge in the required JSON format.`;

  const systemPrompt = getVerdictSystemPrompt();

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const err = await response.json();
      errorDetail = err.error?.message || errorDetail;
    } catch (e) { /* ignore parse error */ }
    throw new Error(`Groq API Error: ${response.status} - ${errorDetail}`);
  }

  const data = await response.json();
  const textResponse = data.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(textResponse);
    return {
      verdict: cleanText(parsed.verdict),
      actionableTakeaway: cleanText(parsed.actionableTakeaway),
      clarityScore: Number(parsed.clarityScore || 85),
      keyPointsFor: Array.isArray(parsed.keyPointsFor) ? parsed.keyPointsFor.map(cleanText) : [],
      keyPointsAgainst: Array.isArray(parsed.keyPointsAgainst) ? parsed.keyPointsAgainst.map(cleanText) : []
    };
  } catch (e) {
    console.error("Failed to parse judge verdict JSON:", e, textResponse);
    throw new Error("Failed to parse verdict JSON");
  }
};

export const scoreArgument = async (text) => {
  console.log("Scoring argument text:", text);
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return { logic: 50, evidence: 50, impact: 50 };

  const systemPrompt = `You are an objective debate scorer. Score this argument on three dimensions.
Evidence score minimum is 25. If any real-world reference, name, or concept is mentioned give at least 40.
Respond ONLY in this exact JSON:
{"logic": <0-100>, "evidence": <0-100>, "impact": <0-100>}
No other text.`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Score this argument: "${text}" in the requested JSON format.` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) return { logic: 50, evidence: 50, impact: 50 };
  
  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return { logic: 50, evidence: 50, impact: 50 };
  }
};

export const generateAppealRuling = async (topic, rounds, originalVerdict, score, userAppealText, leftPersonaName, rightPersonaName) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key is missing");

  const systemPrompt = `You are the Chief Appeals Judge — the highest authority. 
A lower court has already ruled on a decision after a full debate.
The appellant is challenging that ruling.
Review everything fairly and deliver your final ruling.
Respond ONLY in this JSON format:
{
  "ruling": "APPEAL GRANTED" or "APPEAL DENIED",
  "reasoning": "3-4 sentences explaining your ruling",
  "finalVerdict": "Your ultimate recommendation in 1 bold sentence"
}`;

  let content = `Original topic: "${topic}"\n\nFull debate summary:\n`;
  content += `Round 1: ${leftPersonaName} said "${rounds[0].advocate}" | ${rightPersonaName} said "${rounds[0].opposer}"\n`;
  if (rounds[1]) content += `Round 2: ${leftPersonaName} said "${rounds[1].advocate}" | ${rightPersonaName} said "${rounds[1].opposer}"\n`;
  if (rounds[2]) content += `Round 3: ${leftPersonaName} said "${rounds[2].advocate}" | ${rightPersonaName} said "${rounds[2].opposer}"\n\n`;
  content += `Original verdict: "${originalVerdict}" (Clarity Score: ${score})\n\n`;
  content += `Appellant's grounds for appeal: "${userAppealText}"\n\nDeliver your final ruling in the required JSON format.`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API Error: ${response.statusText}`);
  }

  const data = await response.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      ruling: cleanText(parsed.ruling),
      reasoning: cleanText(parsed.reasoning),
      finalVerdict: cleanText(parsed.finalVerdict)
    };
  } catch (e) {
    throw new Error("Failed to parse appeal JSON");
  }
};
