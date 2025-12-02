/**
 * User Purchases API route
 * 
 * This route handles:
 * - GET /api/purchases - Get the current user's purchases (requires auth)
 * - POST /api/purchases/save - Save a pending purchase after account creation (requires auth)
 */

const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { requireUser } = require('../middleware/auth');

/**
 * GET /api/purchases
 * 
 * Returns the current user's purchases including:
 * - unlockedJudges: Array of judge IDs the user has unlocked
 * - hasAllAccess: Boolean indicating if user has all-access subscription
 * 
 * Requires: Authorization header with valid access token
 */
router.get('/', requireUser, async (req, res, next) => {
  try {
    const userId = req.auth.user.id;

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Fetch all active purchases for this user
    const { data: purchases, error } = await supabaseServiceRole
      .from('user_purchases')
      .select('purchase_type, judge_id, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching purchases:', error);
      return res.status(500).json({ error: 'Failed to fetch purchases' });
    }

    // Process purchases to determine access
    const unlockedJudges = [];
    let hasAllAccess = false;

    for (const purchase of purchases || []) {
      if (purchase.purchase_type === 'subscription') {
        hasAllAccess = true;
      } else if (purchase.purchase_type === 'single' && purchase.judge_id) {
        if (!unlockedJudges.includes(purchase.judge_id)) {
          unlockedJudges.push(purchase.judge_id);
        }
      }
    }

    return res.json({
      ok: true,
      unlockedJudges,
      hasAllAccess,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/purchases/save
 * 
 * Saves a pending purchase to the user's account.
 * This is called after a user creates an account following a Stripe payment.
 * 
 * Body:
 *   - purchaseType: 'single' | 'subscription'
 *   - judgeId: string (required for 'single' type)
 *   - stripeSessionId: string (optional, for reference)
 * 
 * Requires: Authorization header with valid access token
 */
router.post('/save', requireUser, async (req, res, next) => {
  try {
    const userId = req.auth.user.id;
    const { purchaseType, judgeId, stripeSessionId } = req.body || {};

    // Validate input
    if (!purchaseType || (purchaseType !== 'single' && purchaseType !== 'subscription')) {
      return res.status(400).json({ 
        error: 'Invalid purchaseType. Must be "single" or "subscription"' 
      });
    }

    if (purchaseType === 'single' && !judgeId) {
      return res.status(400).json({ 
        error: 'judgeId is required for single purchases' 
      });
    }

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check if this purchase already exists to avoid duplicates
    if (purchaseType === 'single') {
      const { data: existing } = await supabaseServiceRole
        .from('user_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('judge_id', judgeId)
        .eq('purchase_type', 'single')
        .single();

      if (existing) {
        return res.json({ 
          ok: true, 
          message: 'Purchase already recorded',
          alreadyExists: true 
        });
      }
    } else if (purchaseType === 'subscription') {
      const { data: existing } = await supabaseServiceRole
        .from('user_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('purchase_type', 'subscription')
        .eq('status', 'active')
        .single();

      if (existing) {
        return res.json({ 
          ok: true, 
          message: 'Subscription already active',
          alreadyExists: true 
        });
      }
    }

    // Insert the purchase
    const insertPayload = {
      user_id: userId,
      purchase_type: purchaseType,
      judge_id: purchaseType === 'single' ? judgeId : null,
      stripe_session_id: stripeSessionId || null,
      status: 'active',
    };

    const { data, error } = await supabaseServiceRole
      .from('user_purchases')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Error saving purchase:', error);
      return res.status(500).json({ error: 'Failed to save purchase' });
    }

    return res.status(201).json({
      ok: true,
      message: 'Purchase saved successfully',
      purchase: data,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
