/**
 * Notifications API route
 * 
 * Handles user notifications for friend requests, likes, comments, etc.
 */

const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { requireUser } = require('../middleware/auth');

/**
 * GET /api/notifications
 * 
 * Gets notifications for the current user.
 * 
 * Query params:
 *   - limit: number (default: 20, max: 100)
 *   - unread_only: boolean (default: false)
 * 
 * Response:
 *   - { ok: true, notifications: Array, unread_count: number }
 *   - { error: string } on failure
 */
router.get('/', requireUser, async (req, res) => {
  try {
    const userId = req.auth.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const unreadOnly = req.query.unread_only === 'true';

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    let query = supabaseServiceRole
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabaseServiceRole
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (countError) {
      console.warn('Error counting unread notifications:', countError);
    }

    return res.json({
      ok: true,
      notifications: notifications || [],
      unread_count: unreadCount || 0,
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/notifications/mark-read
 * 
 * Marks notifications as read.
 * 
 * Request body:
 *   - notification_ids: Array<string> (optional, if empty marks all as read)
 * 
 * Response:
 *   - { ok: true } on success
 *   - { error: string } on failure
 */
router.post('/mark-read', requireUser, async (req, res) => {
  try {
    const userId = req.auth.user.id;
    const { notification_ids } = req.body;

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    let query = supabaseServiceRole
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);

    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      query = query.in('id', notification_ids);
    }

    const { error } = await query;

    if (error) {
      console.error('Error marking notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * 
 * Deletes a notification.
 * 
 * Response:
 *   - { ok: true } on success
 *   - { error: string } on failure
 */
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const userId = req.auth.user.id;
    const notificationId = req.params.id;

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { error } = await supabaseServiceRole
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
