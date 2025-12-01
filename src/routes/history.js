const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { optionalUser } = require('../middleware/auth');

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

    res.json({ ok: true, items: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;