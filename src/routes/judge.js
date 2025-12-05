const express = require('express');
const { OpenAI } = require('openai');
const { supabaseServiceRole, supabase, requireUser } = require('../supabaseClient');

// Import celebrity judges from the data directory (shared location)
const { celebrityJudges } = require('../data/judges');

const router = express.Router();

const openaiKey = process.env.OPENAI_API_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

function getJudgePrompt(judgeId) {
  // Try to find judge in local celebrity judges first
  const localJudge = celebrityJudges.find(
    (j) => j.id === judgeId || j.slug === judgeId
  );
  if (localJudge?.personality_prompt) {
    return localJudge.personality_prompt;
  }
  // Default prompt
  return 'You are a decisive judge on a viral debate show. Always pick a clear winner - never stay neutral. Deliver your verdict with confidence, humor, and a bit of savage roast for the loser.';
}

function buildSystemPrompt(judgeId, judgeRow) {
  // Use database prompt if available, otherwise local
  const basePrompt = judgeRow?.base_prompt || judgeRow?.personality_prompt || getJudgePrompt(judgeId);
  
  return `${basePrompt}

IMPORTANT: You must respond in valid JSON format with these exact fields:
{
  "wrong": "the side/person who is wrong",
  "right": "the side/person who is right",
  "reason": "a short, decisive explanation (2-3 sentences)",
  "roast": "a funny/savage one-liner roasting the loser"
}

Do NOT include any other text, only the JSON object.`;
}

router.post('/', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    // Support multiple parameter formats
    const {
      question_text,
      context,
      side_a,
      side_b,
      optionA,
      optionB,
      judge_id,
      judgeId,
      is_public,
    } = req.body || {};

    // Normalize parameters
    const questionText = question_text || context || '';
    const sideA = side_a || optionA;
    const sideB = side_b || optionB;
    const judgeIdentifier = judge_id || judgeId || 'normal';

    if (!sideA || !sideB) {
      return res.status(400).json({ error: 'Both sides (optionA and optionB) are required' });
    }

    // Try to load judge from database
    let judgeRow = null;
    if (supabase) {
      try {
        const { data, error: judgeError } = await supabase
          .from('judges')
          .select('*')
          .or(`id.eq.${judgeIdentifier},slug.eq.${judgeIdentifier}`)
          .maybeSingle();
        
        if (!judgeError) {
          judgeRow = data;
        }
      } catch (dbError) {
        console.warn('Could not load judge from database:', dbError.message);
      }
    }

    const systemPrompt = buildSystemPrompt(judgeIdentifier, judgeRow);

    const userMessage = questionText
      ? `The debate/context: ${questionText}\n\nSide A says: ${sideA}\nSide B says: ${sideB}\n\nWho is wrong?`
      : `Side A says: ${sideA}\nSide B says: ${sideB}\n\nWho is wrong?`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseContent = completion.choices[0]?.message?.content?.trim() || '';

    // Parse the JSON response
    let judgement;
    try {
      // First, try to parse the entire response as JSON
      judgement = JSON.parse(responseContent);
    } catch (directParseError) {
      // If that fails, try to find JSON between first { and last }
      try {
        const firstBrace = responseContent.indexOf('{');
        const lastBrace = responseContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          const jsonSubstring = responseContent.substring(firstBrace, lastBrace + 1);
          judgement = JSON.parse(jsonSubstring);
        } else {
          throw new Error('No JSON braces found in response');
        }
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON:', parseError.message);
        // Fallback: construct a response from raw text
        judgement = {
          wrong: sideA,
          right: sideB,
          reason: responseContent || 'The judge has spoken.',
          roast: 'Better luck next time!',
        };
      }
    }

    // Ensure all required fields exist
    judgement = {
      wrong: judgement.wrong || sideA,
      right: judgement.right || sideB,
      reason: judgement.reason || 'The judge has rendered a verdict.',
      roast: judgement.roast || '',
    };

    // Save to database if user is logged in
    let saved = null;
    const { user } = await requireUser(req);
    if (user && supabaseServiceRole) {
      const payload = {
        user_id: user.id,
        judge_id: judgeIdentifier,
        context: questionText || null,
        option_a: sideA,
        option_b: sideB,
        question_text: questionText || `${sideA} vs ${sideB}`,
        verdict_text: judgement.reason,
        wrong: judgement.wrong,
        right: judgement.right,
        reason: judgement.reason,
        roast: judgement.roast || null,
        is_public: is_public !== false,
      };

      const { data: insertedData, error: insertError } = await supabaseServiceRole
        .from('judgements')
        .insert(payload)
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to save judgement:', insertError);
      } else if (insertedData) {
        saved = { id: insertedData.id };
      }
    }

    return res.json({
      ok: true,
      judgement,
      saved,
    });
  } catch (error) {
    console.error('Judge route error:', error);
    return res.status(500).json({ error: 'Unable to create verdict' });
  }
});

module.exports = router;
