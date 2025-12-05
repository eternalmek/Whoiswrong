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

    const [unlockedRes, subsRes] = await Promise.all([
      supabaseServiceRole
        .from('unlocked_judges')
        .select('celebrity_id')
        .eq('user_id', userId),
      supabaseServiceRole
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId),
    ]);

    if (unlockedRes.error) {
      console.error('Error fetching unlocked judges:', unlockedRes.error);
      return res.status(500).json({ error: 'Failed to fetch purchases' });
    }

    if (subsRes.error) {
      console.error('Error fetching subscriptions:', subsRes.error);
      return res.status(500).json({ error: 'Failed to fetch purchases' });
    }

    const unlockedJudges = Array.from(
      new Set((unlockedRes.data || []).map((row) => row.celebrity_id))
    );

    const hasAllAccess = (subsRes.data || []).some(
      (row) => (row.status || '').toLowerCase() === 'active'
    );

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
 *   - mode | purchaseType: 'single' | 'subscription'
 *   - celebrityId | judgeId: string (required for 'single' type)
 *   - stripeSessionId: string (required; used to verify payment with Stripe)
 *
 * Requires: Authorization header with valid access token
 */
router.post('/save', requireUser, async (req, res, next) => {
  try {
    const userId = req.auth.user.id;
    const {
      purchaseType,
      mode,
      judgeId,
      celebrityId,
      stripeSessionId,
    } = req.body || {};

    const normalizedMode = (mode || purchaseType || '').toLowerCase();
    const normalizedCelebrityId = celebrityId || judgeId;

    // Validate input
    if (!normalizedMode || (normalizedMode !== 'single' && normalizedMode !== 'subscription')) {
      return res.status(400).json({
        error: 'Invalid mode. Must be "single" or "subscription"',
      });
    }

    if (normalizedMode === 'single' && !normalizedCelebrityId) {
      return res.status(400).json({
        error: 'celebrityId is required for single purchases',
      });
    }

    if (!stripeSessionId || typeof stripeSessionId !== 'string' || stripeSessionId.trim().length === 0) {
      return res.status(400).json({
        error: 'stripeSessionId is required to verify the payment',
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
      console.error('Failed to retrieve Stripe session:', err);
      return res.status(400).json({ error: 'Invalid or expired Stripe session' });
    }

    // Ensure the session metadata matches the request
    const sessionMode = session.metadata?.mode || session.mode;
    const sessionCelebrityId = session.metadata?.celebrityId || session.metadata?.judgeId;

    if (sessionMode !== normalizedMode) {
      return res.status(400).json({ error: 'Purchase mode does not match payment session' });
    }

    if (normalizedMode === 'single' && sessionCelebrityId !== normalizedCelebrityId) {
      return res.status(400).json({ error: 'Celebrity does not match payment session' });
    }

    // Validate that the checkout mode aligns with the requested purchase type
    if (normalizedMode === 'single' && session.mode !== 'payment') {
      return res.status(400).json({ error: 'Checkout session mode does not match single purchase' });
    }

    if (normalizedMode === 'subscription' && session.mode !== 'subscription') {
      return res.status(400).json({ error: 'Checkout session mode does not match subscription purchase' });
    }

    // Confirm the price used in the checkout session matches expected env vars
    const lineItems = session.line_items?.data || [];
    const purchasedPriceIds = lineItems.map((item) => item.price?.id || item.price);

    if (normalizedMode === 'single') {
      const expectedPrice = process.env.STRIPE_PRICE_JUDGE_ONCE || process.env.STRIPE_PRICE_SINGLE_JUDGE;
      if (!expectedPrice || !purchasedPriceIds.includes(expectedPrice)) {
        return res.status(400).json({ error: 'Price ID mismatch for single purchase' });
      }
    } else if (normalizedMode === 'subscription') {
      const expectedPrice = process.env.STRIPE_PRICE_SUB_ALL_JUDGES || process.env.STRIPE_PRICE_ALL_JUDGES;
      if (!expectedPrice || !purchasedPriceIds.includes(expectedPrice)) {
        return res.status(400).json({ error: 'Price ID mismatch for subscription purchase' });
      }
    }

    // Prevent re-using the same Stripe session across different accounts
    const { data: existingSession } = await supabaseServiceRole
      .from('subscriptions')
      .select('user_id, stripe_subscription_id')
      .eq('stripe_subscription_id', session.subscription || null)
      .maybeSingle();

    if (existingSession && existingSession.user_id !== userId) {
      return res.status(409).json({
        ok: false,
        alreadyExists: true,
        message: 'This payment session has already been used by another account',
      });
    }

    if (normalizedMode === 'single') {
      // Avoid duplicate unlocks
      const { data: existingUnlock } = await supabaseServiceRole
        .from('unlocked_judges')
        .select('id')
        .eq('user_id', userId)
        .eq('celebrity_id', normalizedCelebrityId)
        .maybeSingle();

      if (existingUnlock) {
        return res.json({ ok: true, message: 'Judge already unlocked', alreadyExists: true });
      }

      const { error } = await supabaseServiceRole
        .from('unlocked_judges')
        .upsert(
          { user_id: userId, celebrity_id: normalizedCelebrityId },
          { onConflict: 'user_id,celebrity_id' }
        );

      if (error) {
        console.error('Error saving unlock:', error);
        return res.status(500).json({ error: 'Failed to save purchase' });
      }
    } else {
      const { error } = await supabaseServiceRole
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
          },
          { onConflict: 'stripe_subscription_id' }
        );

      if (error) {
        console.error('Error saving subscription:', error);
        return res.status(500).json({ error: 'Failed to save subscription' });
      }
    }

    return res.status(201).json({
      ok: true,
      message: 'Purchase saved successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
