const express = require('express');
const router = express.Router();
const { fetchJudges } = require('../services/judges');

router.get('/', async (req, res, next) => {
  try {
    const judges = await fetchJudges();
    res.json({ ok: true, judges });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
