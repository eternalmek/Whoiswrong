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
      return res.status(503).json({
        error: 'Payment service not configured',
        paymentServiceConfigured: false,
      });
    }

    // Check cache
    const now = Date.now();
    if (priceCache && (now - priceCacheTime) < CACHE_DURATION) {
      return res.status(200).json(priceCache);
    }

    const singleJudgePriceId = getSingleJudgePriceId();
    const allJudgesPriceId = getAllJudgesPriceId();

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
      
      // Determine locale based on currency
      const localeMap = {
        'aud': 'en-AU',
        'usd': 'en-US',
        'eur': 'de-DE',
        'gbp': 'en-GB',
      };
      const locale = localeMap[price.currency.toLowerCase()] || 'en-US';
      
      // Format with currency symbol
      const formatted = new Intl.NumberFormat(locale, {
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
      paymentServiceConfigured: true,
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
