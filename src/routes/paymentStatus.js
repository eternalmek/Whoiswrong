/**
 * Payment status API route
 *
 * Exposes a simple readiness endpoint the frontend can call before showing
 * paywalls or checkout buttons. It reports whether required environment
 * variables are present and which payment-related routes are mounted.
 */

const express = require('express');
const Stripe = require('stripe');

const router = express.Router();

// Initialize Stripe once for configuration checks
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

function hasStringEnv(name) {
  const value = process.env[name];

  return typeof value === 'string' && value.trim().length > 0;
}

router.get('/status', async (req, res) => {
  try {
    const baseUrl = (process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL || '').trim();

    const requiredChecks = {
      stripeSecretKey: hasStringEnv('STRIPE_SECRET_KEY'),
      singleJudgePriceId: hasStringEnv('STRIPE_PRICE_SINGLE_JUDGE'),
      allJudgesPriceId: hasStringEnv('STRIPE_PRICE_ALL_JUDGES'),
      webhookSecret: hasStringEnv('STRIPE_WEBHOOK_SECRET'),
    };

    const optionalChecks = {
      frontendOrigin: baseUrl,
    };

    const routeAvailability = {
      checkout: true, // /api/checkout
      prices: true, // /api/prices
      purchases: true, // /api/purchases
      webhook: true, // /api/webhook
    };

    const missingRequired = Object.entries(requiredChecks)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    const statusPayload = {
      ok: missingRequired.length === 0 && Boolean(stripe),
      paymentServiceConfigured: Boolean(stripe),
      checks: { ...requiredChecks, ...optionalChecks },
      routes: routeAvailability,
      missing: missingRequired,
      message: missingRequired.length === 0
        ? 'All payment dependencies are configured and routes are mounted'
        : 'Payment configuration is incomplete; see missing array for details',
    };

    return res.status(statusPayload.ok ? 200 : 503).json(statusPayload);
  } catch (error) {
    console.error('Payment status check failed:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to evaluate payment status',
    });
  }
});

module.exports = router;
