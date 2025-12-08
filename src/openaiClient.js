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
    ? `You are an AI assistant playing the role described here: ${judgePrompt}\nStay in that persona while remaining safe and non-harmful.`
    : 'You are an impartial AI judge. Be clear, logical, neutral and concise. Explain who is wrong and why in simple, fair language.';

  const systemInstruction = `
${personaInstruction}
You must decide who is wrong in the argument and explain why. Always follow platform safety rules, avoid hateful or abusive language, and stay concise.
Pick ONE side. NEVER say "both", "it depends", or anything neutral. If it's 50/50, still choose.
Return a JSON object only (no markdown) with exactly these keys:
{
  "wrong": "The EXACT text of Option A or Option B that is WRONG",
  "right": "The EXACT text of the other option that is RIGHT",
  "reason": "A short, clear explanation (1-2 sentences).",
  "roast": "A playful roast/burn for the loser that stays within safety guidelines"
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
      // Force the model to return strict JSON so downstream parsing does not fail.
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200,
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
