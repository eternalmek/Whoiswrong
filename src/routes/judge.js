const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { callOpenAI } = require('../openaiClient');

// POST /api/judge
// body: { context, optionA, optionB, user_id? }
router.post('/', async (req, res, next) => {
  try {
    const { context = '', optionA, optionB, user_id = null } = req.body || {};

    if (!optionA || !optionB) {
      return res.status(400).json({ error: 'optionA and optionB are required.' });
    }

    // Call OpenAI
    const ai = await callOpenAI({ context, optionA, optionB });

    // Ensure "wrong" matches one of the options exactly.
    const wrongIsA = ai.wrong.trim() === optionA.trim();
    const wrongIsB = ai.wrong.trim() === optionB.trim();
    if (!wrongIsA && !wrongIsB) {
      // If model returned a different text, coerce by comparing lower-cased tokens
      const lowerA = optionA.trim().toLowerCase();
      const lowerB = optionB.trim().toLowerCase();
      const lowerWrong = ai.wrong.trim().toLowerCase();
      if (lowerWrong === lowerA) ai.wrong = optionA;
      if (lowerWrong === lowerB) ai.wrong = optionB;
      // if still doesn't match, set wrong to one of the options (fallback: choose optionB)
      if (ai.wrong !== optionA && ai.wrong !== optionB) {
        ai.wrong = optionB;
        ai.right = optionA;
      }
    }

    // Persist into Supabase (table: judgements)
    const insertPayload = {
      context,
      option_a: optionA,
      option_b: optionB,
      wrong: ai.wrong,
      right: ai.right,
      reason: ai.reason,
      user_id: user_id || null,
      raw_model_response: ai.raw
    };

    let saved = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error } = await supabase.from('judgements').insert([insertPayload]).select().limit(1);
      if (error) {
        console.warn('Supabase insert warning:', error);
      } else {
        saved = data?.[0] || null;
      }
    }

    res.json({
      ok: true,
      judgement: {
        wrong: ai.wrong,
        right: ai.right,
        reason: ai.reason
      },
      saved
    });
  } catch (err) {
    // expose parse debug when relevant
    if (err && err.raw) {
      console.error('OpenAI raw response that failed to parse:', err.raw);
    }
    next(err);
  }
});

module.exports = router;