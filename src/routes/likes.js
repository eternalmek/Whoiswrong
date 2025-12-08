// src/routes/likes.js
// API routes for debate likes

const express = require('express');
const router = express.Router();
const { addLike, removeLike, hasUserLiked, getDebateLikes } = require('../services/likes');
const { requireUser } = require('../middleware/auth');

// POST /api/likes - Add a like
router.post('/', requireUser, async (req, res, next) => {
  try {
    const { debateId } = req.body;
    const userId = req.auth.user.id;

    if (!debateId) {
      return res.status(400).json({ error: 'debateId is required' });
    }

    const result = await addLike(debateId, userId);

    if (!result) {
      return res.status(500).json({ error: 'Failed to add like' });
    }

    if (result.alreadyLiked) {
      return res.status(409).json({ error: 'Already liked this debate', liked: true });
    }

    res.status(201).json({ message: 'Like added', liked: true });
  } catch (error) {
    console.error('Error adding like:', error);
    next(error);
  }
});

// DELETE /api/likes - Remove a like
router.delete('/', requireUser, async (req, res, next) => {
  try {
    const { debateId } = req.body;
    const userId = req.auth.user.id;

    if (!debateId) {
      return res.status(400).json({ error: 'debateId is required' });
    }

    const success = await removeLike(debateId, userId);

    if (!success) {
      return res.status(500).json({ error: 'Failed to remove like' });
    }

    res.json({ message: 'Like removed', liked: false });
  } catch (error) {
    console.error('Error removing like:', error);
    next(error);
  }
});

// GET /api/likes/:debateId - Get likes for a debate
router.get('/:debateId', async (req, res, next) => {
  try {
    const { debateId } = req.params;
    const likes = await getDebateLikes(debateId);

    res.json({ likes, count: likes.length });
  } catch (error) {
    console.error('Error fetching likes:', error);
    next(error);
  }
});

// GET /api/likes/:debateId/status - Check if user has liked
router.get('/:debateId/status', requireUser, async (req, res, next) => {
  try {
    const { debateId } = req.params;
    const userId = req.auth.user.id;

    const liked = await hasUserLiked(debateId, userId);

    res.json({ liked });
  } catch (error) {
    console.error('Error checking like status:', error);
    next(error);
  }
});

module.exports = router;
