const express = require('express');
const Stripe = require('stripe');
const { requireUser } = require('../supabaseClient');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || '';
}

async function createCheckoutSession({ userId, productType, priceId, judgeId }) {
  if (!priceId) {
    throw new Error('Stripe price not configured');
  }

  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getBaseUrl()}/success`,
    cancel_url: `${getBaseUrl()}/cancel`,
    metadata: {
      user_id: userId,
      product_type: productType,
      judge_id: judgeId || '',
    },
  });
}

async function handleCheckoutRequest(req, res, productType) {
  try {
    const { judge_id } = req.body || {};
    const { user, error } = await requireUser(req);
    if (error || !user) {
      return res.status(401).json({ error: 'Login required' });
    }

    const priceId =
      productType === 'all_judges'
        ? process.env.STRIPE_PRICE_ALL_JUDGES
        : process.env.STRIPE_PRICE_SINGLE_JUDGE;

    const session = await createCheckoutSession({
      userId: user.id,
      productType,
      priceId,
      judgeId: judge_id,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    const status = err.message?.includes('Stripe price not configured') ? 500 : 500;
    return res.status(status).json({ error: err.message || 'Unable to start checkout' });
  }
}

router.post('/', (req, res) => handleCheckoutRequest(req, res, req.body?.product_type || 'single_judge'));

router.post('/single-judge', (req, res) => handleCheckoutRequest(req, res, 'single_judge'));

router.post('/all-judges', (req, res) => handleCheckoutRequest(req, res, 'all_judges'));

module.exports = router;
