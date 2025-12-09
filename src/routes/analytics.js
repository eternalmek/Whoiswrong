/**
 * Analytics API route
 * 
 * Handles generic event tracking for user interactions.
 * This is best-effort logging - errors should not break the UX.
 */

const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { optionalUser } = require('../middleware/auth');

/**
 * POST /api/analytics/event
 * 
 * Logs a generic analytics event.
 * 
 * Request body:
 *   - event_type: string (required, e.g., 'judge_selected', 'verdict_shared', 'page_view')
 *   - event_name: string (required, e.g., 'debate_viewed', 'share_clicked')
 *   - properties: object (optional, additional event metadata)
 * 
 * Response:
 *   - { ok: true } on success
 *   - { error: string } on failure (but this should not break UX)
 */
router.post('/event', optionalUser, async (req, res) => {
  try {
    const { event_type, event_name, properties } = req.body;

    // Validate event_type
    if (!event_type || typeof event_type !== 'string') {
      return res.status(400).json({ error: 'event_type is required and must be a string' });
    }

    // Validate event_name
    if (!event_name || typeof event_name !== 'string') {
      return res.status(400).json({ error: 'event_name is required and must be a string' });
    }

    // Don't fail if database is not configured - this is best-effort only
    if (!supabaseServiceRole) {
      console.warn('Analytics event not logged: Supabase not configured');
      return res.json({ ok: true, logged: false });
    }

    const userId = req.auth?.user?.id || null;
    const propertiesPayload =
      properties && typeof properties === 'object' && !Array.isArray(properties)
        ? properties
        : null;

    const { error } = await supabaseServiceRole
      .from('analytics_events')
      .insert({
        user_id: userId,
        event_type,
        event_name,
        properties: propertiesPayload,
      });

    if (error) {
      console.warn('Failed to log analytics event:', error.message);
      // Don't return error to client - this should not break UX
      return res.json({ ok: true, logged: false });
    }

    return res.json({ ok: true, logged: true });
  } catch (error) {
    console.error('Analytics event error:', error);
    // Don't return error to client - this should not break UX
    return res.json({ ok: true, logged: false });
  }
});

module.exports = router;
