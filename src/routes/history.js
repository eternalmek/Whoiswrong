const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { optionalUser } = require('../middleware/auth');
const { fetchJudges } = require('../services/judges');

async function getVoteCounts(judgementIds = []) {
  if (!supabaseServiceRole || !judgementIds.length) return {};

  const { data, error } = await supabaseServiceRole
    .from('judgement_votes')
    .select('judgement_id, vote')
    .in('judgement_id', judgementIds);

  if (error || !data) return {};

  return data.reduce((acc, row) => {
    const key = row.judgement_id;
    if (!acc[key]) acc[key] = { agree: 0, disagree: 0 };
    if (row.vote === 'agree') acc[key].agree += 1;
    if (row.vote === 'disagree') acc[key].disagree += 1;
    return acc;
  }, {});
}

async function hydrateJudgements(rows = []) {
  const judges = await fetchJudges();
  const judgeMap = judges.reduce((acc, j) => {
    acc[j.id] = j;
    acc[j.slug] = j;
    return acc;
  }, {});

  const votes = await getVoteCounts(rows.map((r) => r.id));

  return rows.map((row) => ({
    ...row,
    votes: votes[row.id] || { agree: 0, disagree: 0 },
    judge: judgeMap[row.judge_id] || judgeMap.normal || judges[0] || null,
  }));
}

// GET /api/judgements?limit=10
router.get('/', optionalUser, async (req, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit || 20));
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseServiceRole) {
      return res.status(500).json({ error: 'Supabase not configured on server.' });
    }

    const query = supabaseServiceRole
      .from('judgements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (req.query.mine === 'true' && req.auth?.user?.id) {
      query.eq('user_id', req.auth.user.id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const enriched = await hydrateJudgements(data || []);

    res.json({ ok: true, items: enriched });
  } catch (err) {
    next(err);
  }
});

router.get('/feed', optionalUser, async (req, res, next) => {
  try {
    if (!supabaseServiceRole) {
      return res.status(503).json({ error: 'Supabase not configured on server.' });
    }

    const { data, error } = await supabaseServiceRole
      .from('judgements')
      .select('id, question_text, verdict_text, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error loading public judgements feed', error);
      return res.status(500).json({ error: error.message || 'Unable to load feed' });
    }

    return res.json({ judgements: data || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalUser, async (req, res, next) => {
  try {
    if (!supabaseServiceRole) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { data, error } = await supabaseServiceRole
      .from('judgements')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: 'Judgement not found' });
    }

    const [hydrated] = await hydrateJudgements([data]);

    res.json({ ok: true, item: hydrated });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/vote', optionalUser, async (req, res, next) => {
  try {
    const { vote, fingerprint } = req.body || {};
    const normalizedVote = (vote || '').toLowerCase();
    const allowed = ['agree', 'disagree'];

    if (!allowed.includes(normalizedVote)) {
      return res.status(400).json({ error: 'Vote must be agree or disagree' });
    }

    if (!supabaseServiceRole) {
      return res.status(503).json({ error: 'Voting unavailable' });
    }

    const userId = req.auth?.user?.id || null;
    if (!userId && (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 6)) {
      return res.status(400).json({ error: 'Fingerprint required for anonymous votes' });
    }

    const voteRow = {
      judgement_id: req.params.id,
      vote: normalizedVote,
      user_id: userId,
      voter_fingerprint: userId ? null : fingerprint,
      created_at: new Date().toISOString(),
    };

    let existing = null;

    const existingQuery = supabaseServiceRole
      .from('judgement_votes')
      .select('id')
      .eq('judgement_id', req.params.id)
      .limit(1);

    if (userId) {
      existingQuery.eq('user_id', userId);
    } else {
      existingQuery.eq('voter_fingerprint', fingerprint);
    }

    const { data: existingData, error: existingError } = await existingQuery.maybeSingle();
    if (!existingError && existingData) {
      existing = existingData;
    }

    if (existing?.id) {
      await supabaseServiceRole
        .from('judgement_votes')
        .update({ vote: normalizedVote, created_at: voteRow.created_at })
        .eq('id', existing.id);
    } else {
      await supabaseServiceRole.from('judgement_votes').insert([voteRow]);
    }

    const votes = await getVoteCounts([req.params.id]);

    return res.json({
      ok: true,
      votes: votes[req.params.id] || { agree: 0, disagree: 0 },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;