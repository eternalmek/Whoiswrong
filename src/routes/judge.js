const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { optionalUser } = require('../middleware/auth');
const { callOpenAI } = require('../openaiClient');
const { getJudgeById, getLocalJudges } = require('../services/judges');
const { createPublicDebate } = require('../services/debates');

// POST /api/judge
// body: { context, optionA, optionB, judgeId }
router.post('/', optionalUser, async (req, res, next) => {
  try {
    const {
      context = '',
      optionA,
      optionB,
      judgeId = 'normal',
      makePublic = true,
      allowIndexing = true,
    } = req.body || {};

    if (!optionA || !optionB) {
      return res.status(400).json({ error: 'optionA and optionB are required.' });
    }

    const judge = (await getJudgeById(judgeId)) || getLocalJudges()[0];

    // Call OpenAI
    const ai = await callOpenAI({
      context,
      optionA,
      optionB,
      judgePrompt: judge.personality_prompt || judge.systemPrompt || judge.system_prompt,
      judgeName: judge.name,
    });

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
      roast: ai.roast || null,
      user_id: req.auth?.user?.id || null,
      raw_model_response: ai.raw,
      judge_id: judge.id,
    };

    let saved = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseServiceRole) {
      const { data, error } = await supabaseServiceRole.from('judgements').insert([insertPayload]).select().limit(1);
      if (error) {
        console.warn('Supabase insert warning:', error);
      } else {
        saved = data?.[0] || null;
      }
    }

    // Create public debate entry for SEO-friendly sharing when enabled
    if (makePublic && saved) {
      const derivedTitle = context?.trim()
        ? context.trim()
        : `${optionA} vs ${optionB} — Who is wrong?`;

      const verdictSummary = [ai.reason, ai.roast].filter(Boolean).join('\n\n');

      createPublicDebate({
        title: derivedTitle,
        content: context || `Option A: ${optionA}\nOption B: ${optionB}`,
        judgeId: judge.id,
        verdict: verdictSummary,
        userId: req.auth?.user?.id || null,
        isPublic: true,
        isIndexable: !!allowIndexing,
        judgementId: saved?.id,
      }).catch((err) => {
        console.warn('Failed to create public debate entry', err);
      });
    }

    res.json({
      ok: true,
      judgement: {
        wrong: ai.wrong,
        right: ai.right,
        reason: ai.reason,
        roast: ai.roast || ''
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
