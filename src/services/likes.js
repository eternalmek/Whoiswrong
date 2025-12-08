// src/services/likes.js
// Service for managing debate likes

const { supabaseServiceRole } = require('../supabaseClient');

/**
 * Add a like to a debate
 * @param {string} debateId - Debate UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Created like or null
 */
async function addLike(debateId, userId) {
  if (!supabaseServiceRole || !debateId || !userId) return null;

  const { data, error } = await supabaseServiceRole
    .from('likes')
    .insert([{ debate_id: debateId, user_id: userId }])
    .select()
    .limit(1);

  if (error) {
    // Unique constraint violation means already liked
    if (error.code === '23505') {
      return { alreadyLiked: true };
    }
    console.warn('Error adding like:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Remove a like from a debate
 * @param {string} debateId - Debate UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} Success status
 */
async function removeLike(debateId, userId) {
  if (!supabaseServiceRole || !debateId || !userId) return false;

  const { error } = await supabaseServiceRole
    .from('likes')
    .delete()
    .eq('debate_id', debateId)
    .eq('user_id', userId);

  if (error) {
    console.warn('Error removing like:', error);
    return false;
  }

  return true;
}

/**
 * Check if user has liked a debate
 * @param {string} debateId - Debate UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} True if liked
 */
async function hasUserLiked(debateId, userId) {
  if (!supabaseServiceRole || !debateId || !userId) return false;

  const { data, error } = await supabaseServiceRole
    .from('likes')
    .select('id')
    .eq('debate_id', debateId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Error checking like status:', error);
    return false;
  }

  return !!data;
}

/**
 * Get likes for a debate
 * @param {string} debateId - Debate UUID
 * @returns {Promise<Array>} List of likes
 */
async function getDebateLikes(debateId) {
  if (!supabaseServiceRole || !debateId) return [];

  const { data, error } = await supabaseServiceRole
    .from('likes')
    .select('*')
    .eq('debate_id', debateId);

  if (error) {
    console.warn('Error fetching likes:', error);
    return [];
  }

  return data || [];
}

module.exports = {
  addLike,
  removeLike,
  hasUserLiked,
  getDebateLikes,
};
