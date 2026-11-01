/**
 * Stripe webhook endpoint for handling checkout and subscription events.
 *
 * This route must receive the raw request body for signature verification.
 */

const express = require('express');
const Stripe = require('stripe');
const { supabaseServiceRole } = require('../supabaseClient');
const { verifyPurchaseSession } = require('../services/paymentVerification');

const router = express.Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

async function upsertSubscription({ userId, customerId, subscriptionId, status }) {
  if (!supabaseServiceRole) throw new Error('Payment database unavailable');

  let resolvedUserId = userId;

  if (!resolvedUserId && subscriptionId) {
    const { data, error } = await supabaseServiceRole
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    resolvedUserId = data?.user_id || null;
  }

  if (!resolvedUserId) throw new Error('Unable to link subscription to an account');

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
    throw error;
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
  if (!supabaseServiceRole || !userId || !celebrityId) throw new Error('Missing purchase fulfillment data');

  // Resolve the judge_id from slug
  let judgeId = celebrityId;
  
  // If celebrityId is a slug (not a UUID), resolve it to judge_id
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(celebrityId)) {
    const { data: judge, error: judgeError } = await supabaseServiceRole
      .from('judges')
      .select('id')
      .eq('slug', celebrityId)
      .maybeSingle();
    
    if (judgeError || !judge) {
      throw judgeError || new Error('Purchased judge could not be resolved');
    }
    
    judgeId = judge.id;
  }

  // Insert into judge_unlocks table
  const { error } = await supabaseServiceRole
    .from('judge_unlocks')
    .upsert(
      { user_id: userId, judge_id: judgeId },
      { onConflict: 'user_id,judge_id' }
    );

  if (error) {
    throw error;
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
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
        await upsertSubscription({ userId: subscription.metadata?.userId,
          customerId: subscription.customer, subscriptionId: subscription.id, status: subscription.status });
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

  // Delayed payment methods send async_payment_succeeded when money clears.
  if (session.payment_status !== 'paid') return;
  const verificationError = verifyPurchaseSession(session, userId);
  if (verificationError) throw new Error(verificationError.error);

  if (mode === 'single') {
    const celebrityId = metadata.celebrityId || metadata.judgeId;
    await addUnlockedJudge({ userId, celebrityId });
  } else if (mode === 'subscription') {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await upsertSubscription({
      userId,
      customerId: session.customer,
      subscriptionId: session.subscription,
      status: subscription.status,
    });
  }
}

async function handleInvoicePaid(invoice) {
  const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await upsertSubscription({
    userId: subscription.metadata?.userId,
    customerId: invoice.customer,
    subscriptionId,
    status: subscription.status,
  });
}

async function handleSubscriptionDeleted(subscription) {
  const subscriptionId = subscription.id;
  if (!subscriptionId || !supabaseServiceRole) throw new Error('Payment database unavailable');

  const { data: record, error } = await supabaseServiceRole
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  await upsertSubscription({
    userId: record?.user_id || subscription.metadata?.userId || null,
    customerId: subscription.customer,
    subscriptionId,
    status: 'canceled',
  });
}

module.exports = router;
