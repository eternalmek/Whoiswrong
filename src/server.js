const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const judgeRouter = require('./routes/judge');
const feedRouter = require('./routes/judgementsFeed');
const historyRouter = require('./routes/history');
const judgesRouter = require('./routes/judges');
const authRouter = require('./routes/auth');
const accountRouter = require('./routes/account');
const loadingMessagesRouter = require('./routes/loadingMessages');
const pricesRouter = require('./routes/prices');
const purchasesRouter = require('./routes/purchases');
const checkoutRouter = require('./routes/checkout');
const paymentStatusRouter = require('./routes/paymentStatus');
const receiptRouter = require('./routes/receipt');
const stripeWebhookRouter = require('./routes/stripeWebhook');
const webhookRouter = require('./routes/webhook');
const configRouter = require('./routes/publicConfig');

const PORT = process.env.PORT || 8080;
const FRONTEND_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || process.env.FRONTEND_ORIGIN || '*';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use('/api/stripe/webhook', stripeWebhookRouter);
app.use('/api/webhook', webhookRouter);
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: FRONTEND_ORIGIN }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use('/api/judge', judgeRouter);
app.use('/api/judgements/feed', feedRouter);
app.use('/api/judgements', historyRouter);
app.use('/api/judges', judgesRouter);
app.use('/api/auth', authRouter);
app.use('/api/account', accountRouter);
app.use('/api/loading-messages', loadingMessagesRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/payment', paymentStatusRouter);
app.use('/api/receipt', receiptRouter);
app.use('/api/public-config.js', configRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

if (process.env.NODE_ENV !== 'production') {
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
