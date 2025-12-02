/**
 * User Purchases API route
 * 
 * This route handles:
 * - GET /api/purchases - Get the current user's purchases (requires auth)
 * - POST /api/purchases/save - Save a pending purchase after account creation (requires auth)
 */

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { supabaseServiceRole } = require('../supabaseClient');
const { requireUser } = require('../middleware/auth');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

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
 *   - stripeSessionId: string (required; used to verify payment with Stripe)
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

    if (!stripeSessionId || typeof stripeSessionId !== 'string' || stripeSessionId.trim().length === 0) {
      return res.status(400).json({
        error: 'stripeSessionId is required to verify the payment'
      });
    }

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!stripe) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    // -------------------------------------------------------------------
    // Verify the Stripe checkout session to ensure the payment is valid
    // -------------------------------------------------------------------
    let session;

    try {
      session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
        expand: ['line_items.data.price'],
      });
    } catch (err) {
      console.error('Unable to retrieve Stripe session:', err);
      return res.status(400).json({ error: 'Invalid Stripe session ID' });
    }

    // Ensure the payment was completed
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment is not completed for this session' });
    }

    // Ensure the session metadata matches the request
    const sessionPurchaseType = session.metadata?.purchaseType;
    const sessionJudgeId = session.metadata?.judgeId;

    if (sessionPurchaseType !== purchaseType) {
      return res.status(400).json({ error: 'Purchase type does not match payment session' });
    }

    if (purchaseType === 'single' && sessionJudgeId !== judgeId) {
      return res.status(400).json({ error: 'Judge does not match payment session' });
    }

    // Validate that the checkout mode aligns with the requested purchase type
    if (purchaseType === 'single' && session.mode !== 'payment') {
      return res.status(400).json({ error: 'Checkout session mode does not match single purchase' });
    }

    if (purchaseType === 'subscription' && session.mode !== 'subscription') {
      return res.status(400).json({ error: 'Checkout session mode does not match subscription purchase' });
    }

    // Confirm the price used in the checkout session matches expected env vars
    const lineItems = session.line_items?.data || [];
    const purchasedPriceIds = lineItems.map((item) => item.price?.id || item.price);

    if (purchaseType === 'single') {
      const expectedPrice = process.env.STRIPE_PRICE_SINGLE_JUDGE;
      if (!expectedPrice || !purchasedPriceIds.includes(expectedPrice)) {
        return res.status(400).json({ error: 'Price ID mismatch for single purchase' });
      }
    } else if (purchaseType === 'subscription') {
      const expectedPrice = process.env.STRIPE_PRICE_ALL_JUDGES;
      if (!expectedPrice || !purchasedPriceIds.includes(expectedPrice)) {
        return res.status(400).json({ error: 'Price ID mismatch for subscription purchase' });
      }
    }

    // Prevent re-using the same Stripe session across different accounts
    const { data: existingSession } = await supabaseServiceRole
      .from('user_purchases')
      .select('id, user_id, purchase_type, judge_id')
      .eq('stripe_session_id', stripeSessionId)
      .maybeSingle();

    if (existingSession) {
      const sameUser = existingSession.user_id === userId;
      return res.status(sameUser ? 200 : 409).json({
        ok: sameUser,
        alreadyExists: true,
        message: sameUser
          ? 'Purchase already recorded for this account'
          : 'This payment session has already been used by another account',
      });
    }

    // Check if this purchase already exists to avoid duplicates
    if (purchaseType === 'single') {
      const { data: existing } = await supabaseServiceRole
        .from('user_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('judge_id', judgeId)
        .eq('purchase_type', 'single')
        .maybeSingle();

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
        .maybeSingle();

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
      stripe_session_id: stripeSessionId,
      stripe_subscription_id: purchaseType === 'subscription' ? session.subscription || null : null,
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
