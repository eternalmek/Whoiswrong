// src/routes/feed.js
// API routes for public debate feed

const express = require('express');
const router = express.Router();
const { getPublicDebates, getDebateById } = require('../services/debates');
const { optionalUser } = require('../middleware/auth');

// GET /api/feed - Get public debates feed
router.get('/', optionalUser, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const category = req.query.category || null;

    const debates = await getPublicDebates({ limit, offset, category });

    res.json({
      debates,
      limit,
      offset,
      hasMore: debates.length === limit,
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    next(error);
  }
});

// GET /api/feed/:id - Get single debate
router.get('/:id', optionalUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    const debate = await getDebateById(id);

    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    // Check if public or user owns it
    if (!debate.is_public && debate.user_id !== req.auth?.user?.id) {
      return res.status(403).json({ error: 'This debate is private' });
    }

    res.json({ debate });
  } catch (error) {
    console.error('Error fetching debate:', error);
    next(error);
  }
});

module.exports = router;
