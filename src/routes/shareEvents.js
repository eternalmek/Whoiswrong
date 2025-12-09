/**
 * Share Events API route
 * 
 * Best-effort logging of share events to social platforms.
 * Errors in this route should not break the UX.
 */

const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { optionalUser } = require('../middleware/auth');

/**
 * POST /api/share-events
 * 
 * Request body:
 *   - debate_id: string (optional)
 *   - platform: string (required: 'tiktok', 'x', 'instagram', 'whatsapp', 'copy_link', 'native')
 * 
 * Response:
 *   - { ok: true } on success
 *   - { error: string } on failure (but this should not break UX)
 */
router.post('/', optionalUser, async (req, res) => {
  try {
    const { debate_id, platform } = req.body;

    // Validate platform
    const validPlatforms = ['tiktok', 'x', 'instagram', 'whatsapp', 'copy_link', 'native'];
    if (!platform || !validPlatforms.includes(platform)) {
      return res.status(400).json({ 
        error: 'Invalid platform. Must be one of: ' + validPlatforms.join(', ') 
      });
    }

    // Don't fail if database is not configured - this is best-effort only
    if (!supabaseServiceRole) {
      console.warn('Share event not logged: Supabase not configured');
      return res.json({ ok: true, logged: false });
    }

    const userId = req.auth?.user?.id || null;

    const { error } = await supabaseServiceRole
      .from('share_events')
      .insert([{
        user_id: userId,
        debate_id: debate_id || null,
        platform,
      }]);

    if (error) {
      console.warn('Failed to log share event:', error.message);
      // Don't return error to client - this should not break UX
      return res.json({ ok: true, logged: false });
    }

    return res.json({ ok: true, logged: true });
  } catch (error) {
    console.error('Share event error:', error);
    // Don't return error to client - this should not break UX
    return res.json({ ok: true, logged: false });
  }
});

module.exports = router;
