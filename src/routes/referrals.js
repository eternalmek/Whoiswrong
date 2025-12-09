/**
 * Referrals API route
 * 
 * Handles referral code creation and usage tracking.
 */

const express = require('express');
const router = express.Router();
const { supabaseServiceRole } = require('../supabaseClient');
const { requireUser, optionalUser } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * Generate a unique referral code
 */
function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * POST /api/referrals/create
 * 
 * Creates or returns the referral code for the current user.
 * 
 * Response:
 *   - { ok: true, code: string, uses_count: number }
 *   - { error: string } on failure
 */
router.post('/create', requireUser, async (req, res) => {
  try {
    const userId = req.auth.user.id;

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check if user already has a referral code
    const { data: existing, error: fetchError } = await supabaseServiceRole
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching referral code:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch referral code' });
    }

    if (existing) {
      return res.json({
        ok: true,
        code: existing.code,
        uses_count: existing.uses_count || 0,
      });
    }

    // Generate a new unique code with retry logic
    let code = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data, error } = await supabaseServiceRole
        .from('referral_codes')
        .insert({
          user_id: userId,
          code,
          uses_count: 0,
        })
        .select()
        .single();

      // Success - no collision
      if (!error) {
        return res.json({
          ok: true,
          code: data.code,
          uses_count: 0,
        });
      }

      // If it's a unique constraint violation, try again with new code
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        code = generateReferralCode();
        attempts++;
        continue;
      }

      // Other error - return failure
      console.error('Error creating referral code:', error);
      return res.status(500).json({ error: 'Failed to create referral code' });
    }

    // Max attempts reached
    return res.status(500).json({ error: 'Failed to generate unique referral code' });
  } catch (error) {
    console.error('Referral code creation error:', error);
    return res.status(500).json({ error: 'Failed to create referral code' });
  }
});

/**
 * POST /api/referrals/use
 * 
 * Records usage of a referral code.
 * 
 * Request body:
 *   - code: string (required)
 * 
 * Response:
 *   - { ok: true } on success
 *   - { error: string } on failure
 */
router.post('/use', optionalUser, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Look up referral code
    const { data: referralCode, error: fetchError } = await supabaseServiceRole
      .from('referral_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching referral code:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch referral code' });
    }

    if (!referralCode) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const userId = req.auth?.user?.id || null;

    // Don't allow users to use their own referral code
    if (userId && userId === referralCode.user_id) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    // Check if this user has already used this code
    if (userId) {
      const { data: existingUse } = await supabaseServiceRole
        .from('referral_uses')
        .select('id')
        .eq('referral_code_id', referralCode.id)
        .eq('referred_user_id', userId)
        .maybeSingle();

      if (existingUse) {
        return res.json({ ok: true, message: 'Referral already recorded' });
      }
    }

    // Record the referral use
    const { error: insertError } = await supabaseServiceRole
      .from('referral_uses')
      .insert([{
        referral_code_id: referralCode.id,
        referred_user_id: userId,
        ip_address: req.ip || null,
        user_agent: req.get('user-agent') || null,
      }]);

    if (insertError) {
      console.error('Error recording referral use:', insertError);
      return res.status(500).json({ error: 'Failed to record referral use' });
    }

    // Increment uses count
    const { error: updateError } = await supabaseServiceRole
      .from('referral_codes')
      .update({ uses_count: (referralCode.uses_count || 0) + 1 })
      .eq('id', referralCode.id);

    if (updateError) {
      console.warn('Failed to increment referral uses count:', updateError);
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Referral use error:', error);
    return res.status(500).json({ error: 'Failed to record referral use' });
  }
});

/**
 * GET /api/referrals/stats
 * 
 * Gets referral stats for the current user.
 * 
 * Response:
 *   - { ok: true, code: string, uses_count: number, recent_uses: Array }
 *   - { error: string } on failure
 */
router.get('/stats', requireUser, async (req, res) => {
  try {
    const userId = req.auth.user.id;

    if (!supabaseServiceRole) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: referralCode, error: fetchError } = await supabaseServiceRole
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching referral stats:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch referral stats' });
    }

    if (!referralCode) {
      return res.json({
        ok: true,
        code: null,
        uses_count: 0,
        recent_uses: [],
      });
    }

    // Fetch recent uses
    const { data: uses, error: usesError } = await supabaseServiceRole
      .from('referral_uses')
      .select('created_at')
      .eq('referral_code_id', referralCode.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (usesError) {
      console.warn('Error fetching referral uses:', usesError);
    }

    return res.json({
      ok: true,
      code: referralCode.code,
      uses_count: referralCode.uses_count || 0,
      recent_uses: uses || [],
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

module.exports = router;
