const express = require('express');
const router = express.Router();

// POST /api/receipt
// Generate a "receipt" representation of a judgement for sharing
// body: { wrong, right, reason, roast }
router.post('/', (req, res) => {
  const { wrong, right, reason, roast } = req.body || {};

  if (!wrong || !right) {
    return res.status(400).json({ error: 'wrong and right are required.' });
  }

  const timestamp = new Date().toISOString();
  const orderNumber = Math.floor(Math.random() * 900000) + 100000;

  const receipt = {
    store: 'WHO IS WRONG?',
    tagline: 'THE KING OF PETTY',
    orderNumber: `#${orderNumber}`,
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    time: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    items: [
      {
        name: wrong,
        description: 'WRONG OPINION',
        cost: 'Your Dignity',
        verdict: 'RETURNED'
      }
    ],
    winner: right,
    reason: reason || '',
    roast: roast || '',
    total: 'L + Ratio',
    footer: 'NO REFUNDS • NO APPEALS • FINAL VERDICT',
    timestamp
  };

  res.json({ ok: true, receipt });
});

module.exports = router;
