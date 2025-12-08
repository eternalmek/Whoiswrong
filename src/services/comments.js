// src/services/comments.js
// Service for managing debate comments

const { supabaseServiceRole } = require('../supabaseClient');

/**
 * Create a comment on a debate
 * @param {Object} params - Comment parameters
 * @returns {Promise<Object|null>} Created comment or null
 */
async function createComment({ debateId, userId, body, parentId = null }) {
  if (!supabaseServiceRole || !debateId || !body) return null;

  const payload = {
    debate_id: debateId,
    user_id: userId || null,
    body: body.trim(),
    parent_id: parentId || null,
  };

  const { data, error } = await supabaseServiceRole
    .from('comments')
    .insert([payload])
    .select()
    .limit(1);

  if (error) {
    console.warn('Error creating comment:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get comments for a debate
 * @param {string} debateId - Debate UUID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of comments
 */
async function getDebateComments(debateId, { limit = 50, offset = 0 } = {}) {
  if (!supabaseServiceRole || !debateId) return [];

  const { data, error } = await supabaseServiceRole
    .from('comments')
    .select('*')
    .eq('debate_id', debateId)
    .is('parent_id', null) // Top-level comments only
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.warn('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

/**
 * Get replies to a comment
 * @param {string} parentId - Parent comment UUID
 * @returns {Promise<Array>} List of replies
 */
async function getCommentReplies(parentId) {
  if (!supabaseServiceRole || !parentId) return [];

  const { data, error } = await supabaseServiceRole
    .from('comments')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Error fetching replies:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete a comment
 * @param {string} commentId - Comment UUID
 * @param {string} userId - User UUID (must match comment owner)
 * @returns {Promise<boolean>} Success status
 */
async function deleteComment(commentId, userId) {
  if (!supabaseServiceRole || !commentId || !userId) return false;

  const { error } = await supabaseServiceRole
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) {
    console.warn('Error deleting comment:', error);
    return false;
  }

  return true;
}

module.exports = {
  createComment,
  getDebateComments,
  getCommentReplies,
  deleteComment,
};
