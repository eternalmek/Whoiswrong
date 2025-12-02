/**
 * Checkout API route for Stripe payments
 * 
 * This route handles two payment modes:
 * - "single": One-time payment for unlocking a single judge ($0.99 AUD)
 * - "subscription": Monthly subscription for unlocking all judges ($3.99 AUD/month)
 * 
 * IMPORTANT: Price IDs are read from environment variables only.
 * DO NOT hardcode price strings - they must match Stripe Dashboard configuration.
 */

const express = require('express');
const Stripe = require('stripe');

const router = express.Router();

// Initialize Stripe with secret key from environment
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * POST /api/checkout
 * 
 * Request body:
 *   - mode: "single" | "subscription"
 *   - judgeId: string (required for "single" mode)
 * 
 * Response:
 *   - { url: string } on success (Stripe checkout session URL)
 *   - { error: string } on failure
 */
router.post('/', async (req, res) => {
  try {
    const { mode, judgeId } = req.body;

    // Validate mode first (client input validation)
    if (!mode || (mode !== 'single' && mode !== 'subscription')) {
      return res.status(400).json({ 
        error: 'Invalid mode. Must be "single" or "subscription"' 
      });
    }

    // For single mode, judgeId is required and must not be "normal"
    if (mode === 'single') {
      if (!judgeId) {
        return res.status(400).json({ 
          error: 'judgeId is required for single mode' 
        });
      }
      if (judgeId === 'normal') {
        return res.status(400).json({ 
          error: 'The normal judge is free and does not require purchase' 
        });
      }
    }

    // Validate Stripe is configured (server configuration check)
    if (!stripe) {
      console.error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
      return res.status(500).json({ error: 'Payment service not configured' });
    }

    // Get base URL from environment (defaults to frontend origin)
    const baseUrl =
      process.env.FRONTEND_ORIGIN ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:8080';

    let sessionConfig;

    if (mode === 'single') {
      // =====================================================================
      // SINGLE JUDGE UNLOCK: One-time payment
      // Uses STRIPE_PRICE_SINGLE_JUDGE from environment ($0.99 AUD one-time)
      // =====================================================================
      const priceId = process.env.STRIPE_PRICE_SINGLE_JUDGE;
      
      if (!priceId) {
        console.error('STRIPE_PRICE_SINGLE_JUDGE environment variable is not set');
        return res.status(500).json({ 
          error: 'Single judge price not configured' 
        });
      }

      sessionConfig = {
        mode: 'payment', // One-time payment
        line_items: [
          {
            price: priceId, // Use env var ONLY, never hardcode
            quantity: 1,
          },
        ],
        metadata: {
          purchaseType: 'single',
          judgeId: judgeId, // Store judgeId in metadata for reference
        },
        // Allow promotion codes for better UX
        allow_promotion_codes: true,
        success_url: `${baseUrl}/checkout/success?mode=single&judgeId=${encodeURIComponent(judgeId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout/cancel`,
      };
    } else {
      // =====================================================================
      // ALL JUDGES SUBSCRIPTION: Monthly recurring payment
      // Uses STRIPE_PRICE_ALL_JUDGES from environment ($3.99 AUD/month)
      // =====================================================================
      const priceId = process.env.STRIPE_PRICE_ALL_JUDGES;
      
      if (!priceId) {
        console.error('STRIPE_PRICE_ALL_JUDGES environment variable is not set');
        return res.status(500).json({ 
          error: 'All judges subscription price not configured' 
        });
      }

      sessionConfig = {
        mode: 'subscription', // Recurring subscription
        line_items: [
          {
            price: priceId, // Use env var ONLY, never hardcode
            quantity: 1,
          },
        ],
        metadata: {
          purchaseType: 'subscription',
        },
        // Allow promotion codes for better UX
        allow_promotion_codes: true,
        success_url: `${baseUrl}/checkout/success?mode=subscription&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout/cancel`,
      };
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Return the checkout URL
    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create checkout session' 
    });
  }
});

module.exports = router;
