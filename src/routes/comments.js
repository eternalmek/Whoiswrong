// src/routes/comments.js
// API routes for debate comments

const express = require('express');
const router = express.Router();
const { 
  createComment, 
  getDebateComments, 
  getCommentReplies, 
  deleteComment 
} = require('../services/comments');
const { requireUser, optionalUser } = require('../middleware/auth');

// POST /api/comments - Create a comment
router.post('/', requireUser, async (req, res, next) => {
  try {
    const { debateId, body, parentId = null } = req.body;
    const userId = req.auth.user.id;

    if (!debateId || !body || !body.trim()) {
      return res.status(400).json({ error: 'debateId and body are required' });
    }

    if (body.length > 1000) {
      return res.status(400).json({ error: 'Comment too long (max 1000 characters)' });
    }

    const comment = await createComment({ debateId, userId, body, parentId });

    if (!comment) {
      return res.status(500).json({ error: 'Failed to create comment' });
    }

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    next(error);
  }
});

// GET /api/comments/:debateId - Get comments for a debate
router.get('/:debateId', optionalUser, async (req, res, next) => {
  try {
    const { debateId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const comments = await getDebateComments(debateId, { limit, offset });

    res.json({ comments, count: comments.length });
  } catch (error) {
    console.error('Error fetching comments:', error);
    next(error);
  }
});

// GET /api/comments/:commentId/replies - Get replies to a comment
router.get('/:commentId/replies', optionalUser, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const replies = await getCommentReplies(commentId);

    res.json({ replies, count: replies.length });
  } catch (error) {
    console.error('Error fetching replies:', error);
    next(error);
  }
});

// DELETE /api/comments/:commentId - Delete a comment
router.delete('/:commentId', requireUser, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.auth.user.id;

    const success = await deleteComment(commentId, userId);

    if (!success) {
      return res.status(403).json({ error: 'Cannot delete this comment' });
    }

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    next(error);
  }
});

module.exports = router;
