/**
 * Stripe Webhook handler for payment verification
 * 
 * This route handles Stripe webhook events to verify payments server-side.
 * IMPORTANT: Webhook signature verification ensures events are from Stripe.
 * 
 * Events handled:
 * - checkout.session.completed: Payment completed successfully
 * - invoice.payment_succeeded: Subscription payment succeeded
 */

const express = require('express');
const Stripe = require('stripe');

const router = express.Router();

// Initialize Stripe with secret key from environment
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Webhook secret for verifying Stripe signatures
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhook
 * 
 * Stripe sends webhook events here when payment-related events occur.
 * The raw body is required for signature verification.
 * 
 * IMPORTANT: This route must use express.raw() middleware, not express.json()
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    console.error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    if (webhookSecret) {
      // Verify the webhook signature using the raw body
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // In development without webhook secret, parse the event directly
      // WARNING: This is insecure for production - always use webhook secret
      console.warn('STRIPE_WEBHOOK_SECRET not configured. Skipping signature verification.');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionCancelled(subscription);
        break;
      }
      
      default:
        // Log unhandled event types for debugging
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Handle checkout.session.completed event
 * 
 * This is triggered when a customer successfully completes a checkout.
 * At this point, payment has been received.
 * 
 * @param {Object} session - Stripe checkout session object
 */
async function handleCheckoutCompleted(session) {
  const { metadata, customer_email, mode } = session;
  
  console.log('Checkout completed:', {
    sessionId: session.id,
    mode: mode,
    purchaseType: metadata?.purchaseType,
    judgeId: metadata?.judgeId,
    customerEmail: customer_email,
  });

  // Log successful payment for analytics/auditing
  // In a production app, you would:
  // 1. Store the purchase in your database
  // 2. Associate it with the user account if logged in
  // 3. Send confirmation email
  
  if (metadata?.purchaseType === 'single') {
    console.log(`Single judge unlock: ${metadata.judgeId}`);
    // Store purchase record if database integration is needed
  } else if (metadata?.purchaseType === 'subscription') {
    console.log('All judges subscription activated');
    // Store subscription record if database integration is needed
  }
}

/**
 * Handle invoice.payment_succeeded event
 * 
 * This is triggered for recurring subscription payments.
 * 
 * @param {Object} invoice - Stripe invoice object
 */
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    amountPaid: invoice.amount_paid,
  });

  // Handle successful subscription renewal
  // In a production app, you would extend the user's subscription period
}

/**
 * Handle customer.subscription.deleted event
 * 
 * This is triggered when a subscription is cancelled or expires.
 * 
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionCancelled(subscription) {
  console.log('Subscription cancelled:', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  // Handle subscription cancellation
  // In a production app, you would revoke the user's access
}

module.exports = router;
