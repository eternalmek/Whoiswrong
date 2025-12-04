const express = require('express');
const Stripe = require('stripe');
const { requireUser } = require('../supabaseClient');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/', async (req, res) => {
  try {
    const { product_type, judge_id } = req.body || {};
    const { user, error } = await requireUser(req);
    if (error || !user) {
      return res.status(401).json({ error: 'Login required' });
    }

    const priceId =
      product_type === 'all_judges'
        ? process.env.STRIPE_PRICE_ALL_JUDGES
        : process.env.STRIPE_PRICE_SINGLE_JUDGE;

    if (!priceId) {
      return res.status(500).json({ error: 'Stripe price not configured' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/cancel`,
      metadata: {
        user_id: user.id,
        product_type: product_type || 'single_judge',
        judge_id: judge_id || '',
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Unable to start checkout' });
  }
});

module.exports = router;
