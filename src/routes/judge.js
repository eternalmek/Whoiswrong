const express = require('express');
const { OpenAI } = require('openai');
const { supabaseServiceRole, supabase, requireUser } = require('../supabaseClient');

const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  try {
    const { question_text, side_a, side_b, judge_id, is_public } = req.body || {};
    if (!question_text || typeof question_text !== 'string') {
      return res.status(400).json({ error: 'question_text is required' });
    }

    const judgeIdentifier = judge_id || 'classic';
    const { data: judgeRow, error: judgeError } = await supabase
      .from('judges')
      .select('*')
      .or(`id.eq.${judgeIdentifier},slug.eq.${judgeIdentifier}`)
      .maybeSingle();

    if (judgeError) {
      console.error('Supabase error:', judgeError);
      return res.status(500).json({ error: 'Unable to load judge' });
    }

    const judgePrompt = judgeRow?.base_prompt ||
      'You are a decisive judge. Provide a clear verdict and short reasoning. Never stay neutral.';

    const messages = [
      { role: 'system', content: judgePrompt },
      {
        role: 'user',
        content: JSON.stringify({ question: question_text, side_a, side_b }),
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.6,
      max_tokens: 300,
    });

    const verdict = completion.choices[0]?.message?.content?.trim() || 'No verdict available.';

    let saved = false;
    const { user } = await requireUser(req);
    if (user && supabaseServiceRole) {
      const payload = {
        user_id: user.id,
        judge_id: judgeRow?.id || judgeIdentifier,
        question_text,
        verdict_text: verdict,
        is_public: is_public !== false,
      };

      const { error: insertError } = await supabaseServiceRole.from('judgements').insert(payload);
      if (insertError) {
        console.error('Supabase error:', insertError);
      } else {
        saved = true;
      }
    }

    return res.json({ verdict, saved });
  } catch (error) {
    console.error('Judge route error:', error);
    return res.status(500).json({ error: 'Unable to create verdict' });
  }
});

module.exports = router;
