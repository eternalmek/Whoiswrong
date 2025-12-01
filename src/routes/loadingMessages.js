const express = require('express');
const router = express.Router();

// Funny loading messages to keep users entertained while waiting for the AI
const loadingMessages = [
  "Reading the evidence...",
  "Consulting the petty council...",
  "Judging you both...",
  "Preparing the roast...",
  "Warming up the gavel...",
  "Calculating who took the L...",
  "Analyzing the audacity...",
  "Reviewing receipts...",
  "The drama is loading...",
  "Picking sides aggressively...",
  "This is gonna be good...",
  "Summoning chaos...",
  "Choosing violence today...",
  "Loading the sass...",
  "Preparing your ego check...",
  "Generating premium shade...",
  "Spilling imminent...",
  "Reading between the lines...",
  "Your fate is being decided...",
  "No pressure but someone's about to lose..."
];

// GET /api/loading-messages
// Returns array of funny loading messages for frontend to display
router.get('/', (req, res) => {
  const count = Math.min(20, Math.max(1, parseInt(req.query.count, 10) || 5));
  
  // Shuffle and pick random messages
  const shuffled = [...loadingMessages].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  res.json({
    ok: true,
    messages: selected,
    allMessages: loadingMessages
  });
});

// GET /api/loading-messages/random
// Returns a single random loading message
router.get('/random', (req, res) => {
  const randomIndex = Math.floor(Math.random() * loadingMessages.length);
  res.json({
    ok: true,
    message: loadingMessages[randomIndex]
  });
});

module.exports = router;
