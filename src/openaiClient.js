const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set — OpenAI calls will fail.');
}

async function callOpenAI({ context = '', optionA, optionB, judgePrompt = '', judgeName = 'Celebrity Judge' }) {
  if (!optionA || !optionB) {
    throw new Error('optionA and optionB are required');
  }

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const personaInstruction = judgePrompt
    ? `\nCELEBRITY JUDGE MODE: ${judgeName}\n${judgePrompt}\n`
    : '';

  const systemInstruction = `
You are the SAVAGE AI judge of "Who Is Wrong?" — the King of Petty.
Your job is BRUTAL: Pick ONE side. NEVER say "both", "it depends", or anything neutral.
Even if it's 50/50, flip a mental coin and pretend your choice is absolute FACT.

PERSONALITY RULES:
- You are mean, savage, and WILL roast the loser
- Be entertaining and decisive — this is for TikTok, not a courtroom
- Your goal is to make people laugh or gasp
- Keep it SHORT: 1-2 sentences MAX for each field
${personaInstruction}
You MUST return a JSON object only (no surrounding markdown) with exactly these keys:
{
  "wrong": "The EXACT text of Option A or Option B that is WRONG",
  "right": "The EXACT text of the other option that is RIGHT",
  "reason": "A short, punchy, TikTok-friendly explanation (1-2 sentences MAX). Be sassy, confident, decisive.",
  "roast": "A SAVAGE roast/burn for the loser. Be slightly mean, funny, and memorable. Example: 'You have the palate of a toddler.' or 'Tell me you have no taste without telling me.'"
}

CRITICAL: "wrong" MUST be exactly the Option A or Option B text provided, word for word.
`;

  const prompt = `
Context: ${context || 'No specific context provided.'}
Option A: ${optionA}
Option B: ${optionB}

Return the JSON object described in the system instruction.
`;

  const resp = await axios.post(
    `${OPENAI_BASE_URL}/chat/completions`,
    {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 200
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  if (!resp.data || !resp.data.choices || resp.data.choices.length === 0) {
    throw new Error('Empty response from OpenAI');
  }

  const content = resp.data.choices[0].message?.content || '';

  // Try to parse. Sometimes model adds a sentence before/after JSON. Extract first JSON-looking block.
  const parsed = parseJSONSafe(content);
  if (!parsed) {
    // helpful debug information if parsing fails
    const debugError = new Error('Could not parse JSON from model response');
    debugError.raw = content;
    throw debugError;
  }

  // canonicalize keys
  const { wrong, right, reason, roast } = parsed;
  if (!wrong || !right || !reason) {
    const e = new Error('Parsed JSON missing required keys');
    e.raw = parsed;
    throw e;
  }

  return { wrong, right, reason, roast: roast || '', raw: content };
}

function parseJSONSafe(text) {
  // First try direct parse
  try {
    const parsed = JSON.parse(text.trim());
    return parsed;
  } catch (e) {
    // try to extract the first {...} block
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.slice(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(candidate);
        return parsed;
      } catch (e2) {
        // try to fix common issues: single quotes -> double quotes
        const fixed = candidate.replace(/(\r\n|\n|\r)/g, ' ').replace(/'/g, '"');
        try {
          return JSON.parse(fixed);
        } catch (e3) {
          return null;
        }
      }
    }
    return null;
  }
}

module.exports = { callOpenAI };