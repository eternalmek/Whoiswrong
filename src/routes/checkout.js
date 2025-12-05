const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { requireUser } = require('../middleware/auth');

// Stripe is optional - only load if key is available
let stripe = null;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (stripeKey) {
  try {
    stripe = require('stripe')(stripeKey);
  } catch (err) {
    console.warn('Stripe SDK not available:', err.message);
  }
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'https://www.whoiswrong.io';

// POST /api/checkout/single - Create checkout for single judge ($0.99 AUD)
router.post('/single', requireUser, async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment system not configured' });
    }

    const { judgeId } = req.body || {};
    const user = req.auth?.user;

    if (!judgeId) {
      return res.status(400).json({ error: 'judgeId is required' });
    }

    // Check if already purchased
    if (supabaseServiceRole) {
      // Check if user has all judges
      const { data: profile } = await supabaseServiceRole
        .from('profiles')
        .select('has_all_judges')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.has_all_judges) {
        return res.status(400).json({ error: 'You already have access to all judges' });
      }

      // Check if specific judge already purchased
      const { data: existing } = await supabaseServiceRole
        .from('user_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('judge_id', judgeId)
        .eq('purchase_type', 'single')
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: 'You already own this judge' });
      }
    }

    const priceId = process.env.STRIPE_PRICE_SINGLE_JUDGE;
    if (!priceId) {
      return res.status(503).json({ error: 'Single judge price not configured' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/account.html?purchase=success&type=single&judge=${judgeId}`,
      cancel_url: `${FRONTEND_URL}/account.html?purchase=cancelled`,
      client_reference_id: user.id,
      metadata: {
        type: 'single',
        judgeId,
        userId: user.id,
      },
    });

    return res.json({
      ok: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error('Checkout single error:', err);
    next(err);
  }
});

// POST /api/checkout/all - Create checkout for all judges ($3.99 AUD)
router.post('/all', requireUser, async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment system not configured' });
    }

    const user = req.auth?.user;

    // Check if already has all judges
    if (supabaseServiceRole) {
      const { data: profile } = await supabaseServiceRole
        .from('profiles')
        .select('has_all_judges')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.has_all_judges) {
        return res.status(400).json({ error: 'You already have access to all judges' });
      }
    }

    const priceId = process.env.STRIPE_PRICE_ALL_JUDGES;
    if (!priceId) {
      return res.status(503).json({ error: 'All judges price not configured' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/account.html?purchase=success&type=all`,
      cancel_url: `${FRONTEND_URL}/account.html?purchase=cancelled`,
      client_reference_id: user.id,
      metadata: {
        type: 'all',
        userId: user.id,
      },
    });

    return res.json({
      ok: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error('Checkout all error:', err);
    next(err);
  }
});

// POST /api/checkout/webhook - Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(503).send('Payment system not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // For testing without webhook signing
      event = req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { type, judgeId, userId } = session.metadata || {};

    if (!userId || !supabaseServiceRole) {
      console.warn('Missing userId or Supabase for webhook processing');
      return res.json({ received: true });
    }

    try {
      if (type === 'single' && judgeId) {
        // Insert single judge purchase
        await supabaseServiceRole.from('user_purchases').insert({
          user_id: userId,
          purchase_type: 'single',
          judge_id: judgeId,
          stripe_session_id: session.id,
          status: 'active',
        });
        console.log(`Single judge ${judgeId} purchased by user ${userId}`);
      } else if (type === 'all') {
        // Update profile to have all judges
        await supabaseServiceRole
          .from('profiles')
          .update({ has_all_judges: true })
          .eq('id', userId);

        // Also record the purchase
        await supabaseServiceRole.from('user_purchases').insert({
          user_id: userId,
          purchase_type: 'subscription',
          stripe_session_id: session.id,
          status: 'active',
        });
        console.log(`All judges unlocked for user ${userId}`);
      }
    } catch (dbError) {
      console.error('Failed to process purchase in database:', dbError);
    }
  }

  return res.json({ received: true });
});

// GET /api/checkout/status - Check user's purchase status
router.get('/status', requireUser, async (req, res, next) => {
  try {
    const user = req.auth?.user;

    if (!supabaseServiceRole) {
      return res.json({
        ok: true,
        hasAllJudges: false,
        purchasedJudges: [],
      });
    }

    // Get profile
    const { data: profile } = await supabaseServiceRole
      .from('profiles')
      .select('has_all_judges')
      .eq('id', user.id)
      .maybeSingle();

    // Get individual purchases
    const { data: purchases } = await supabaseServiceRole
      .from('user_purchases')
      .select('judge_id')
      .eq('user_id', user.id)
      .eq('purchase_type', 'single')
      .eq('status', 'active');

    const purchasedJudges = (purchases || [])
      .map((p) => p.judge_id)
      .filter(Boolean);

    return res.json({
      ok: true,
      hasAllJudges: profile?.has_all_judges || false,
      purchasedJudges,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
