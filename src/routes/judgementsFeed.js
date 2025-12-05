const express = require('express');
const { supabaseServiceRole, supabase } = require('../supabaseClient');

const router = express.Router();

router.get('/', async (_req, res) => {
  const client = supabaseServiceRole || supabase;
  try {
    const { data, error } = await client
      .from('judgements')
      .select(
        [
          'id',
          'question_text',
          'verdict_text',
          'context',
          'option_a',
          'option_b',
          'wrong',
          'reason',
          'roast',
          'judge_id',
          'created_at',
          'judges(name, slug, photo_url)',
        ].join(', ')
      )
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Unable to load feed' });
    }

    const judgements = (data || []).map((row) => ({ ...row, judge: row.judges || null }));

    return res.json({ judgements, items: judgements });
  } catch (err) {
    console.error('Feed error:', err);
    return res.status(500).json({ error: 'Unable to load feed' });
  }
});

module.exports = router;
