// src/routes/reports.js
// API routes for content reports

const express = require('express');
const router = express.Router();
const { createReport } = require('../services/reports');
const { optionalUser } = require('../middleware/auth');

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

    if (reason.length > 500) {
      return res.status(400).json({ error: 'Reason too long (max 500 characters)' });
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
