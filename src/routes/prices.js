/**
 * Prices API route for fetching Stripe price information
 * 
 * This route returns the actual prices from Stripe so the frontend
 * can display accurate, synced pricing information.
 */

const express = require('express');
const Stripe = require('stripe');

const router = express.Router();

// Initialize Stripe with secret key from environment
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Cache prices for 5 minutes to reduce Stripe API calls
let priceCache = null;
let priceCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * GET /api/prices
 * 
 * Returns the current prices for judge unlocks from Stripe.
 * Prices are cached to minimize API calls.
 * 
 * Response:
 *   - { singleJudge: { amount, currency, formatted }, allJudges: { amount, currency, formatted, interval } }
 *   - { error: string } on failure
 */
router.get('/', async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
      return res.status(500).json({ error: 'Payment service not configured' });
    }

    // Check cache
    const now = Date.now();
    if (priceCache && (now - priceCacheTime) < CACHE_DURATION) {
      return res.status(200).json(priceCache);
    }

    const singleJudgePriceId = process.env.STRIPE_PRICE_SINGLE_JUDGE;
    const allJudgesPriceId = process.env.STRIPE_PRICE_ALL_JUDGES;

    if (!singleJudgePriceId || !allJudgesPriceId) {
      console.error('Stripe price IDs not configured');
      return res.status(500).json({ error: 'Prices not configured' });
    }

    // Fetch prices from Stripe
    const [singleJudgePrice, allJudgesPrice] = await Promise.all([
      stripe.prices.retrieve(singleJudgePriceId),
      stripe.prices.retrieve(allJudgesPriceId),
    ]);

    // Format prices for frontend
    const formatPrice = (price) => {
      const amount = price.unit_amount / 100; // Convert cents to dollars
      const currency = price.currency.toUpperCase();
      
      // Format with currency symbol
      const formatted = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: price.currency,
        minimumFractionDigits: 2,
      }).format(amount);

      return {
        amount,
        currency,
        formatted,
        interval: price.recurring?.interval || null,
        intervalCount: price.recurring?.interval_count || null,
      };
    };

    const response = {
      singleJudge: formatPrice(singleJudgePrice),
      allJudges: formatPrice(allJudgesPrice),
    };

    // Cache the response
    priceCache = response;
    priceCacheTime = now;

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching prices:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch prices' 
    });
  }
});

module.exports = router;
