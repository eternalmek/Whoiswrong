// src/services/reports.js
// Service for managing content reports

const { supabaseServiceRole } = require('../supabaseClient');

/**
 * Create a report for a debate or comment
 * @param {Object} params - Report parameters
 * @returns {Promise<Object|null>} Created report or null
 */
async function createReport({ debateId = null, commentId = null, reporterId = null, reason }) {
  if (!supabaseServiceRole) return null;
  if (!debateId && !commentId) return null;
  if (!reason || !reason.trim()) return null;

  const payload = {
    debate_id: debateId || null,
    comment_id: commentId || null,
    reporter_id: reporterId || null,
    reason: reason.trim(),
    status: 'pending',
  };

  const { data, error } = await supabaseServiceRole
    .from('reports')
    .insert([payload])
    .select()
    .limit(1);

  if (error) {
    console.warn('Error creating report:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get reports (admin function)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of reports
 */
async function getReports({ status = 'pending', limit = 50, offset = 0 } = {}) {
  if (!supabaseServiceRole) return [];

  let query = supabaseServiceRole
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('Error fetching reports:', error);
    return [];
  }

  return data || [];
}

/**
 * Update report status (admin function)
 * @param {string} reportId - Report UUID
 * @param {string} status - New status
 * @returns {Promise<boolean>} Success status
 */
async function updateReportStatus(reportId, status) {
  if (!supabaseServiceRole || !reportId || !status) return false;

  const { error } = await supabaseServiceRole
    .from('reports')
    .update({ status })
    .eq('id', reportId);

  if (error) {
    console.warn('Error updating report status:', error);
    return false;
  }

  return true;
}

module.exports = {
  createReport,
  getReports,
  updateReportStatus,
};
