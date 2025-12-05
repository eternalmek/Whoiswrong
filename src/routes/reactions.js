const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { requireUser, optionalUser } = require('../middleware/auth');

// Helper to get reaction counts for a judgement
async function getReactionCounts(judgementId) {
  if (!supabaseServiceRole) return { likes: 0, dislikes: 0 };

  const { data, error } = await supabaseServiceRole
    .from('reactions')
    .select('reaction')
    .eq('judgement_id', judgementId);

  if (error || !data) return { likes: 0, dislikes: 0 };

  return data.reduce(
    (acc, row) => {
      if (row.reaction === 'like') acc.likes += 1;
      if (row.reaction === 'dislike') acc.dislikes += 1;
      return acc;
    },
    { likes: 0, dislikes: 0 }
  );
}

// Helper to get user's current reaction
async function getUserReaction(userId, judgementId) {
  if (!supabaseServiceRole || !userId) return null;

  const { data } = await supabaseServiceRole
    .from('reactions')
    .select('reaction')
    .eq('user_id', userId)
    .eq('judgement_id', judgementId)
    .maybeSingle();

  return data?.reaction || null;
}

// POST /api/reactions - Create or update a reaction
router.post('/', requireUser, async (req, res, next) => {
  try {
    if (!supabaseServiceRole) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { judgementId, reaction } = req.body || {};
    const user = req.auth?.user;

    // Validate inputs
    if (!judgementId) {
      return res.status(400).json({ error: 'judgementId is required' });
    }

    if (!reaction || !['like', 'dislike'].includes(reaction)) {
      return res.status(400).json({ error: 'reaction must be "like" or "dislike"' });
    }

    // Use the authenticated user's ID (secured by requireUser middleware)
    const actualUserId = user.id;

    // Check if judgement exists
    const { data: judgement, error: judgementError } = await supabaseServiceRole
      .from('judgements')
      .select('id')
      .eq('id', judgementId)
      .maybeSingle();

    if (judgementError || !judgement) {
      return res.status(404).json({ error: 'Judgement not found' });
    }

    // Check for existing reaction
    const { data: existing } = await supabaseServiceRole
      .from('reactions')
      .select('id, reaction')
      .eq('user_id', actualUserId)
      .eq('judgement_id', judgementId)
      .maybeSingle();

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction - remove it (toggle off)
        await supabaseServiceRole
          .from('reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Different reaction - update it
        await supabaseServiceRole
          .from('reactions')
          .update({ reaction, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } else {
      // No existing reaction - insert new one
      const { error: insertError } = await supabaseServiceRole
        .from('reactions')
        .insert({
          user_id: actualUserId,
          judgement_id: judgementId,
          reaction,
        });

      if (insertError) {
        console.error('Failed to insert reaction:', insertError);
        return res.status(500).json({ error: 'Failed to save reaction' });
      }
    }

    // Get updated counts
    const counts = await getReactionCounts(judgementId);
    const userReaction = await getUserReaction(actualUserId, judgementId);

    return res.json({
      ok: true,
      likes: counts.likes,
      dislikes: counts.dislikes,
      userReaction,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reactions/:judgementId - Get reaction counts and user's reaction
router.get('/:judgementId', optionalUser, async (req, res, next) => {
  try {
    if (!supabaseServiceRole) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { judgementId } = req.params;
    const userId = req.auth?.user?.id;

    const counts = await getReactionCounts(judgementId);
    const userReaction = userId ? await getUserReaction(userId, judgementId) : null;

    return res.json({
      ok: true,
      likes: counts.likes,
      dislikes: counts.dislikes,
      userReaction,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reactions/batch - Get reaction counts for multiple judgements
router.post('/batch', optionalUser, async (req, res, next) => {
  try {
    if (!supabaseServiceRole) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { judgementIds } = req.body || {};
    const userId = req.auth?.user?.id;

    if (!Array.isArray(judgementIds) || judgementIds.length === 0) {
      return res.status(400).json({ error: 'judgementIds array is required' });
    }

    // Limit batch size
    const limitedIds = judgementIds.slice(0, 50);

    // Get all reactions for these judgements
    const { data: reactions, error } = await supabaseServiceRole
      .from('reactions')
      .select('judgement_id, reaction, user_id')
      .in('judgement_id', limitedIds);

    if (error) {
      console.error('Failed to fetch batch reactions:', error);
      return res.status(500).json({ error: 'Failed to fetch reactions' });
    }

    // Process reactions into counts
    const result = {};
    limitedIds.forEach((id) => {
      result[id] = { likes: 0, dislikes: 0, userReaction: null };
    });

    (reactions || []).forEach((r) => {
      if (!result[r.judgement_id]) {
        result[r.judgement_id] = { likes: 0, dislikes: 0, userReaction: null };
      }
      if (r.reaction === 'like') result[r.judgement_id].likes += 1;
      if (r.reaction === 'dislike') result[r.judgement_id].dislikes += 1;
      if (userId && r.user_id === userId) {
        result[r.judgement_id].userReaction = r.reaction;
      }
    });

    return res.json({ ok: true, reactions: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
