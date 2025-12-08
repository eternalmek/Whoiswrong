// src/routes/reports.js
// API routes for content reports

const express = require('express');
const router = express.Router();
const { createReport } = require('../services/reports');
const { optionalUser } = require('../middleware/auth');

const MAX_REPORT_REASON_LENGTH = 500;

// POST /api/reports - Create a report
router.post('/', optionalUser, async (req, res, next) => {
  try {
    const { debateId = null, commentId = null, reason } = req.body;
    const reporterId = req.auth?.user?.id || null;

    if (!debateId && !commentId) {
      return res.status(400).json({ error: 'Either debateId or commentId is required' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    if (reason.length > MAX_REPORT_REASON_LENGTH) {
      return res.status(400).json({ error: `Reason too long (max ${MAX_REPORT_REASON_LENGTH} characters)` });
    }

    const report = await createReport({ debateId, commentId, reporterId, reason });

    if (!report) {
      return res.status(500).json({ error: 'Failed to create report' });
    }

    res.status(201).json({ 
      message: 'Report submitted successfully. We will review it shortly.',
      reportId: report.id,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    next(error);
  }
});

module.exports = router;
