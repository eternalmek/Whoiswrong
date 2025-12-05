const express = require('express');
const Stripe = require('stripe');
const { requireUser } = require('../supabaseClient');

const router = express.Router();

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || '';
}

// Get the price ID for single judge purchase
// Supports both STRIPE_PRICE_JUDGE_ONCE (from requirements) and STRIPE_PRICE_SINGLE_JUDGE (legacy)
function getSingleJudgePriceId() {
  return process.env.STRIPE_PRICE_JUDGE_ONCE || process.env.STRIPE_PRICE_SINGLE_JUDGE;
}

// Get the price ID for all judges subscription
// Supports both STRIPE_PRICE_SUB_ALL_JUDGES (from requirements) and STRIPE_PRICE_ALL_JUDGES (legacy)
function getAllJudgesPriceId() {
  return process.env.STRIPE_PRICE_SUB_ALL_JUDGES || process.env.STRIPE_PRICE_ALL_JUDGES;
}

async function createCheckoutSession({ userId, productType, priceId, judgeId, mode }) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  if (!priceId) {
    throw new Error('Stripe price not configured');
  }

  // Determine the purchase type for metadata: 'single' or 'subscription'
  const purchaseMode = mode === 'subscription' ? 'subscription' : 'single';

  const sessionConfig = {
    mode: mode || 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getBaseUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getBaseUrl()}/cancel`,
    metadata: {
      user_id: userId,
      product_type: productType,
      judge_id: judgeId || '',
      mode: purchaseMode,
      celebrityId: judgeId || '',
    },
  };

  return stripe.checkout.sessions.create(sessionConfig);
}

async function handleCheckoutRequest(req, res, productType) {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    // Support multiple parameter formats from frontend
    const {
      judge_id,
      celebrityId,
      mode: requestMode,
      product_type: bodyProductType,
    } = req.body || {};

    const judgeId = judge_id || celebrityId;

    // Determine product type from request
    let finalProductType = productType;
    if (bodyProductType) {
      finalProductType = bodyProductType;
    } else if (requestMode === 'subscription') {
      finalProductType = 'all_judges';
    } else if (requestMode === 'single') {
      finalProductType = 'single_judge';
    }

    const { user, error } = await requireUser(req);
    if (error || !user) {
      return res.status(401).json({ error: 'Login required' });
    }

    const isSubscription = finalProductType === 'all_judges';
    const priceId = isSubscription ? getAllJudgesPriceId() : getSingleJudgePriceId();
    const sessionMode = isSubscription ? 'subscription' : 'payment';

    const session = await createCheckoutSession({
      userId: user.id,
      productType: finalProductType,
      priceId,
      judgeId,
      mode: sessionMode,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message || 'Unable to start checkout' });
  }
}

router.post('/', (req, res) => handleCheckoutRequest(req, res, req.body?.product_type || 'single_judge'));

// Endpoint: /api/checkout/single (for single judge purchase)
router.post('/single', (req, res) => handleCheckoutRequest(req, res, 'single_judge'));

// Legacy endpoint (for backward compatibility)
router.post('/single-judge', (req, res) => handleCheckoutRequest(req, res, 'single_judge'));

// Endpoint: /api/checkout/subscription (for all judges subscription)
router.post('/subscription', (req, res) => handleCheckoutRequest(req, res, 'all_judges'));

// Legacy endpoint (for backward compatibility)
router.post('/all-judges', (req, res) => handleCheckoutRequest(req, res, 'all_judges'));

module.exports = router;
