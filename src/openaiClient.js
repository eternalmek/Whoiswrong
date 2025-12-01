const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set — OpenAI calls will fail.');
}

async function callOpenAI({ context = '', optionA, optionB }) {
  if (!optionA || !optionB) {
    throw new Error('optionA and optionB are required');
  }

  const systemInstruction = `
You are the AI judge of the game "Who Is Wrong?".
Your job is simple: Always choose ONE side.
Never answer with "both", "it depends", or anything neutral.

You MUST return a JSON object only (no surrounding markdown) with exactly these keys:
{
  "wrong": "Name of the option that is WRONG (must be exactly the Option A or Option B string)",
  "right": "Name of the option that is RIGHT (the other option)",
  "reason": "A short, punchy, TikTok-friendly explanation (max 2 sentences). Be sassy, confident, and decisive."
}

Make sure "wrong" is exactly either the Option A or Option B text that was provided.
`;

  const prompt = `
Context: ${context || 'No specific context provided.'}
Option A: ${optionA}
Option B: ${optionB}

Return the JSON object described in the system instruction.
`;

  const model = 'gpt-4'; // change to a different model if you prefer

  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
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
  const { wrong, right, reason } = parsed;
  if (!wrong || !right || !reason) {
    const e = new Error('Parsed JSON missing required keys');
    e.raw = parsed;
    throw e;
  }

  return { wrong, right, reason, raw: content };
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