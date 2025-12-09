const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const judgeRouter = require('./routes/judge');
const historyRouter = require('./routes/history');
const authRouter = require('./routes/auth');
const receiptRouter = require('./routes/receipt');
const loadingMessagesRouter = require('./routes/loadingMessages');
const checkoutRouter = require('./routes/checkout');
const purchasesRouter = require('./routes/purchases');
const stripeWebhookRouter = require('./routes/stripeWebhook');
const pricesRouter = require('./routes/prices');
const paymentStatusRouter = require('./routes/paymentStatus');
const accountRouter = require('./routes/account');
const judgesRouter = require('./routes/judges');
const feedRouter = require('./routes/feed');
const likesRouter = require('./routes/likes');
const commentsRouter = require('./routes/comments');
const reportsRouter = require('./routes/reports');
const shareEventsRouter = require('./routes/shareEvents');
const referralsRouter = require('./routes/referrals');
const notificationsRouter = require('./routes/notifications');
const analyticsRouter = require('./routes/analytics');
const { supabaseServiceRole } = require('./supabaseClient');
const { fetchJudges } = require('./services/judges');

const PORT = process.env.PORT || 8080;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

const app = express();

// Trust proxy settings for running behind reverse proxies (Vercel, nginx, etc.)
// This is required for express-rate-limit to work correctly with X-Forwarded-For headers
app.set('trust proxy', 1);

// Middlewares - use helmet with relaxed CSP for CDN scripts and Vercel Analytics
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://va.vercel-scripts.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://va.vercel-scripts.com", "https://vitals.vercel-insights.com", "https://js.stripe.com"],
    },
  },
}));

// IMPORTANT: Webhook route must be registered BEFORE express.json() middleware
// because Stripe webhooks require the raw body for signature verification
app.use('/api/stripe-webhook', stripeWebhookRouter);
app.use('/api/webhook', stripeWebhookRouter); // legacy alias

app.use(express.json({ limit: '64kb' })); // keep payloads small
app.use(express.urlencoded({ extended: false }));

app.use(cors({
  origin: FRONTEND_ORIGIN,
}));

// Basic rate limiting to avoid abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 80, // limit each IP to 80 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Routes
app.use('/api/judge', judgeRouter);
app.use('/api/judgements', historyRouter);
app.use('/api/auth', authRouter);
app.use('/api/receipt', receiptRouter);
app.use('/api/loading-messages', loadingMessagesRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/payments', paymentStatusRouter);
app.use('/api/account', accountRouter);
app.use('/api/judges', judgesRouter);
app.use('/api/feed', feedRouter);
app.use('/api/likes', likesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/share-events', shareEventsRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/analytics', analyticsRouter);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.get('/debate/:slug', async (req, res) => {
  const shareUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const slugOrId = req.params.slug;
  let debate = null;
  let judgement = null;
  let judgeLabel = 'AI Judge';
  let shouldIndex = true;

  const renderNotFound = () => {
    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Debate not found</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 48px; text-align: center; color: #0f172a; background: #f8fafc;">
        <h1 style="font-size: 32px; margin-bottom: 16px;">This debate is private or missing.</h1>
        <p style="margin-bottom: 24px; color: #475569;">Start your own debate or check the latest verdicts on the homepage.</p>
        <a href="/" style="display: inline-block; padding: 12px 18px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 999px;">Go to WhoIsWrong.io</a>
      </body>
    </html>`;

    res.status(404).setHeader('Content-Type', 'text/html');
    res.send(html);
  };

  if (supabaseServiceRole) {
    const { data: debateRow, error: debateError } = await supabaseServiceRole
      .from('public_debates')
      .select('*')
      .eq('slug', slugOrId)
      .maybeSingle();

    if (debateError) {
      console.warn('Failed to fetch public debate', debateError);
    }

    if (debateRow) {
      if (debateRow.is_public === false) return renderNotFound();
      debate = debateRow;
      shouldIndex = debateRow.is_indexable !== false;

      if (debateRow.judgement_id) {
        const { data: judgementRow } = await supabaseServiceRole
          .from('judgements')
          .select('*')
          .eq('id', debateRow.judgement_id)
          .maybeSingle();
        if (judgementRow) judgement = judgementRow;
      }
    } else {
      const { data } = await supabaseServiceRole
        .from('judgements')
        .select('*')
        .eq('id', slugOrId)
        .maybeSingle();

      if (data) {
        judgement = data;
        shouldIndex = false; // legacy IDs should not be indexed
      }
    }

    const judges = await fetchJudges();
    const judgeMap = judges.reduce((acc, j) => {
      acc[j.id] = j;
      acc[j.slug] = j;
      return acc;
    }, {});
    const judge = judgeMap[debate?.judge_id || judgement?.judge_id];
    if (judge) judgeLabel = judge.name;
  }

  if (!debate && !judgement) return renderNotFound();

  const title = debate?.title
    ? debate.title
    : `Verdict: ${judgement.wrong_side === 'A' ? judgement.option_a : judgement.option_b || 'Someone'} was wrong`;

  const verdictText = debate?.verdict || judgement?.reasoning || 'See the full verdict on Whoiswrong.io';
  const description = judgement
    ? `${judgeLabel} decided between ${judgement.option_a} and ${judgement.option_b}. ${verdictText}`
    : verdictText;
  const robotsMeta = shouldIndex ? 'index, follow' : 'noindex, nofollow';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    datePublished: debate?.created_at || judgement?.created_at || new Date().toISOString(),
    author: judgeLabel,
    description,
    mainEntityOfPage: shareUrl,
  };

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <meta name="description" content="${escapeHtml(description)}" />
      <meta name="robots" content="${robotsMeta}" />
      <link rel="canonical" href="${escapeHtml(shareUrl)}" />
      <meta property="og:title" content="${escapeHtml(title)}" />
      <meta property="og:description" content="${escapeHtml(description)}" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="${escapeHtml(shareUrl)}" />
      <meta property="og:image" content="/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${escapeHtml(title)}" />
      <meta name="twitter:description" content="${escapeHtml(description)}" />
      <meta name="twitter:image" content="/og-image.png" />
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0b1224; color: #e2e8f0; margin: 0; }
        .wrap { max-width: 800px; margin: 0 auto; padding: 48px 24px 64px; }
        .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; box-shadow: 0 20px 70px rgba(15,23,42,0.45); }
        .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; font-size: 12px; margin-bottom: 12px; display: block; }
        h1 { margin: 0 0 12px; font-size: 32px; line-height: 1.2; color: #f8fafc; }
        .meta { color: #cbd5e1; margin: 0 0 24px; }
        .section { margin-top: 24px; }
        .section h2 { margin: 0 0 10px; font-size: 18px; color: #e2e8f0; }
        .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #1f2937; color: #e2e8f0; font-size: 12px; margin-right: 8px; }
        .cta { display: inline-block; margin-top: 24px; padding: 12px 18px; background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; border-radius: 999px; text-decoration: none; font-weight: 600; }
        .muted { color: #94a3b8; }
        pre { white-space: pre-wrap; background: rgba(255,255,255,0.04); padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
      </style>
      <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <span class="eyebrow">Public Debate</span>
          <h1>${escapeHtml(title)}</h1>
          <p class="meta">Judged by <strong>${escapeHtml(judgeLabel)}</strong>${judgement?.created_at || debate?.created_at ? ` • ${escapeHtml(new Date(judgement?.created_at || debate?.created_at).toLocaleString())}` : ''}</p>
          ${judgement ? `<div class="section"><span class="pill">Wrong: ${escapeHtml(judgement.wrong_side === 'A' ? judgement.option_a : judgement.option_b)}</span><span class="pill">Right: ${escapeHtml(judgement.right_side === 'A' ? judgement.option_a : judgement.option_b)}</span></div>` : ''}
          <div class="section">
            <h2>Verdict</h2>
            <pre>${escapeHtml(verdictText)}</pre>
          </div>
          ${(debate?.content || judgement?.context) ? `<div class="section"><h2>Context</h2><pre>${escapeHtml(debate?.content || judgement?.context)}</pre></div>` : ''}
          ${(judgement?.option_a || judgement?.option_b) ? `<div class="section muted">Debated: ${escapeHtml(judgement?.option_a || '')}${judgement?.option_a && judgement?.option_b ? ' vs ' : ''}${escapeHtml(judgement?.option_b || '')}</div>` : ''}
          <a class="cta" href="/">Start your own debate</a>
        </div>
      </div>
    </body>
  </html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Direct routes to static pages (so /account works without the .html suffix)
app.get(['/account', '/account/'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'account.html'));
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Who Is Wrong? API',
    version: '1.0.0',
    description: 'Backend API for Who Is Wrong? — The King of Petty. OpenAI + Supabase integration.',
    endpoints: {
      'POST /api/judge': 'Submit a battle for judgement (body: { context, optionA, optionB }). Returns savage verdict with roast.',
      'GET /api/judgements': 'Get judgement history (query: limit, mine)',
      'POST /api/receipt': 'Generate shareable receipt data (body: { wrong, right, reason, roast })',
      'GET /api/loading-messages': 'Get funny loading messages (query: count). Returns messages array.',
      'GET /api/loading-messages/random': 'Get a single random loading message',
      'POST /api/auth/signup': 'Create a new account (body: { email, password })',
      'POST /api/auth/login': 'Log in to existing account (body: { email, password })',
      'GET /api/auth/me': 'Get current user info (requires Authorization header)',
      'DELETE /api/auth/me': 'Delete current user account (requires Authorization header)',
      'POST /api/checkout': 'Create Stripe checkout session (body: { mode: "single"|"subscription", judgeId? })',
      'GET /api/prices': 'Get current prices from Stripe for judge unlocks',
      'GET /api/payments/status': 'Check payment-related configuration and route availability',
      'POST /api/stripe-webhook': 'Stripe webhook endpoint (called by Stripe, not for direct use)',
      'GET /health': 'Health check endpoint'
    },
    features: {
      savageMode: 'AI roasts the loser with brutal, funny responses',
      noNeutrality: 'AI NEVER says "it depends" — always picks a side',
      receipts: 'Generate shareable receipt images of verdicts',
      loadingMessages: 'Funny messages to show while waiting for verdict',
      payments: 'Stripe payment integration for unlocking premium judges'
    },
    status: 'ok'
  });
});

// Fallback to index.html for SPA routing (non-API routes)
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server only when running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`WhoIsWrong backend listening on port ${PORT}`);
  });
}

// Export for Vercel serverless function
module.exports = app;
