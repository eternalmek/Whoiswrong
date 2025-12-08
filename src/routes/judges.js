const express = require('express');
const router = express.Router();
const { fetchJudges, getLocalJudges } = require('../services/judges');

router.get('/', async (req, res, next) => {
  try {
    const judges = await fetchJudges();
    res.json({ ok: true, judges });
  } catch (err) {
    // If Supabase is not configured, fall back to local judges
    if (err.message && err.message.includes('Supabase')) {
      console.warn('Supabase not configured, using local judges as fallback');
      const localJudges = getLocalJudges();
      return res.json({ ok: true, judges: localJudges });
    }
    next(err);
  }
});

module.exports = router;
