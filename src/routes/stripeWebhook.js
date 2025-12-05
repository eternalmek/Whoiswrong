const express = require('express');
const Stripe = require('stripe');
const { supabaseServiceRole } = require('../supabaseClient');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed' && supabaseServiceRole) {
      const session = event.data.object;
      const { user_id, product_type, judge_id } = session.metadata || {};

      const payload = {
        user_id: user_id || null,
        product_type: product_type || 'single_judge',
        product_id: judge_id || null,
        amount_cents: session.amount_total || 0,
        currency: session.currency || 'usd',
        stripe_session_id: session.id,
      };

      const { error: purchaseError } = await supabaseServiceRole
        .from('purchases')
        .insert(payload);
      if (purchaseError) {
        console.error('Supabase error:', purchaseError);
      }

      // Unlock the purchased content immediately
      if (user_id) {
        if ((product_type || 'single_judge') === 'single_judge' && judge_id) {
          const { error: unlockError } = await supabaseServiceRole
            .from('unlocked_judges')
            .upsert({ user_id, celebrity_id: judge_id });
          if (unlockError) {
            console.error('Failed to unlock judge for user', user_id, unlockError);
          }
        }

        if ((product_type || 'single_judge') === 'all_judges') {
          const { error: subError } = await supabaseServiceRole
            .from('subscriptions')
            .upsert(
              { user_id, stripe_subscription_id: session.subscription || null, status: 'active' },
              { onConflict: 'user_id' }
            );
          if (subError) {
            console.error('Failed to update subscription for user', user_id, subError);
          }
        }
      }
    }
  } catch (err) {
    console.error('Stripe webhook handling failed:', err);
    return res.status(500).send('Webhook handling error');
  }

  res.json({ received: true });
});

module.exports = router;
