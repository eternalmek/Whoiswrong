const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  const config = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  };

  res.type('application/javascript').send(
    `window.__PUBLIC_CONFIG__ = ${JSON.stringify(config)};`
  );
});

module.exports = router;
