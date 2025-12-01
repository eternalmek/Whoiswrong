const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const judgeRouter = require('./routes/judge');
const historyRouter = require('./routes/history');

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

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start
app.listen(PORT, () => {
  console.log(`WhoIsWrong backend listening on port ${PORT}`);
});