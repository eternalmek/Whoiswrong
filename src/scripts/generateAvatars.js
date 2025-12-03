#!/usr/bin/env node
require('dotenv').config();
const { ensureJudgeAvatars } = require('../services/judgeAvatars');
const { seedJudgesIfMissing } = require('../services/judges');

(async () => {
  await seedJudgesIfMissing();
  await ensureJudgeAvatars();
  console.log('Avatar generation complete.');
})().catch((err) => {
  console.error('Avatar generation failed', err);
  process.exit(1);
});
