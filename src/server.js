const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const judgeRouter = require('./routes/judge');
const historyRouter = require('./routes/history');
const authRouter = require('./routes/auth');
const receiptRouter = require('./routes/receipt');
const loadingMessagesRouter = require('./routes/loadingMessages');

const PORT = process.env.PORT || 8080;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

const app = express();

// Middlewares
app.use(helmet());
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

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Root endpoint - Landing page
app.get('/', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Who Is Wrong?</title>
      </head>
      <body>
        <h1>Who Is Wrong?</h1>
        <p>Welcome! Frontend coming soon.</p>
      </body>
    </html>
  `);
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
      'GET /health': 'Health check endpoint'
    },
    features: {
      savageMode: 'AI roasts the loser with brutal, funny responses',
      noNeutrality: 'AI NEVER says "it depends" — always picks a side',
      receipts: 'Generate shareable receipt images of verdicts',
      loadingMessages: 'Funny messages to show while waiting for verdict'
    },
    status: 'ok'
  });
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