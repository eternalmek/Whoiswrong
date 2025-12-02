/**
 * Stripe webhook endpoint for handling checkout and subscription events.
 *
 * This route must receive the raw request body for signature verification.
 */

const express = require('express');
const Stripe = require('stripe');
const { supabaseServiceRole } = require('../supabaseClient');

const router = express.Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

async function upsertSubscription({ userId, customerId, subscriptionId, status }) {
  if (!supabaseServiceRole) return;

  let resolvedUserId = userId;

  if (!resolvedUserId && subscriptionId) {
    const { data, error } = await supabaseServiceRole
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (error) {
      console.error('Failed to resolve user for subscription', error);
    }

    resolvedUserId = data?.user_id || null;
  }

  if (!resolvedUserId) return;

  const payload = {
    user_id: resolvedUserId,
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    status: status || 'active',
  };

  const { error } = await supabaseServiceRole
    .from('subscriptions')
    .upsert(payload, { onConflict: 'stripe_subscription_id' });

  if (error) {
    console.error('Failed to upsert subscription', error);
  }

  try {
    // Mark user as subscribed in a profile/users table if it exists.
    await supabaseServiceRole
      .from('profiles')
      .update({ subscription_status: status || 'active', updated_at: new Date().toISOString() })
      .eq('id', resolvedUserId);
  } catch (profileError) {
    // Ignore if table does not exist
    console.warn('Optional profile update failed:', profileError.message);
  }
}

async function addUnlockedJudge({ userId, celebrityId }) {
  if (!supabaseServiceRole || !userId || !celebrityId) return;

  const { error } = await supabaseServiceRole
    .from('unlocked_judges')
    .upsert(
      { user_id: userId, celebrity_id: celebrityId },
      { onConflict: 'user_id,celebrity_id' }
    );

  if (error) {
    console.error('Failed to upsert unlocked judge', error);
  }
}

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    console.error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
    return jsonError(res, 500, 'Payment service not configured');
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured.');
      return jsonError(res, 500, 'Webhook secret not configured');
    }

    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return jsonError(res, 400, `Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error handling Stripe event', err);
    return jsonError(res, 500, 'Webhook handler failed');
  }
});

async function handleCheckoutCompleted(session) {
  const metadata = session.metadata || {};
  const mode = metadata.mode || session.mode;
  const userId = metadata.userId;

  if (!userId) {
    console.warn('Checkout session missing userId metadata');
  }

  if (mode === 'single') {
    const celebrityId = metadata.celebrityId || metadata.judgeId;
    await addUnlockedJudge({ userId, celebrityId });
  } else if (mode === 'subscription') {
    await upsertSubscription({
      userId,
      customerId: session.customer,
      subscriptionId: session.subscription,
      status: 'active',
    });
  }
}

async function handleInvoicePaid(invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || !supabaseServiceRole) return;

  await upsertSubscription({
    userId: null,
    customerId: invoice.customer,
    subscriptionId,
    status: 'active',
  });
}

async function handleSubscriptionDeleted(subscription) {
  const subscriptionId = subscription.id;
  if (!subscriptionId || !supabaseServiceRole) return;

  const { data: record, error } = await supabaseServiceRole
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch subscription', error);
  }

  await upsertSubscription({
    userId: record?.user_id || null,
    customerId: subscription.customer,
    subscriptionId,
    status: 'canceled',
  });
}

module.exports = router;
