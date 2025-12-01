const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET /api/judgements?limit=10
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit || 20));
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Supabase not configured on server.' });
    }

    const { data, error } = await supabase
      .from('judgements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json({ ok: true, items: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;