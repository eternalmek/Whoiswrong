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
 *   - event_data: object (optional, additional event data)
 * 
 * Response:
 *   - { ok: true } on success
 *   - { error: string } on failure (but this should not break UX)
 */
router.post('/event', optionalUser, async (req, res) => {
  try {
    const { event_type, event_data } = req.body;

    // Validate event_type
    if (!event_type || typeof event_type !== 'string') {
      return res.status(400).json({ error: 'event_type is required and must be a string' });
    }

    // Don't fail if database is not configured - this is best-effort only
    if (!supabaseServiceRole) {
      console.warn('Analytics event not logged: Supabase not configured');
      return res.json({ ok: true, logged: false });
    }

    const userId = req.auth?.user?.id || null;

    const { error } = await supabaseServiceRole
      .from('analytics_events')
      .insert({
        user_id: userId,
        event_type,
        event_data: event_data || null,
        ip_address: req.ip || null,
        user_agent: req.get('user-agent') || null,
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
