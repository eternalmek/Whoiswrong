const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseServiceRole } = require('../supabaseClient');
const { requireUser } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    if (!supabasePublic) {
      return res.status(500).json({ error: 'Supabase auth not configured on server.' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabasePublic.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      ok: true,
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token || null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    if (!supabasePublic) {
      return res.status(500).json({ error: 'Supabase auth not configured on server.' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    return res.json({
      ok: true,
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token || null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireUser, async (req, res, next) => {
  try {
    const { user } = req.auth;
    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/me
router.delete('/me', requireUser, async (req, res, next) => {
  try {
    const { user } = req.auth;

    // clean up user-linked rows
    if (supabaseServiceRole) {
      await supabaseServiceRole.from('judgements').delete().eq('user_id', user.id);
    }

    const { error } = await supabaseServiceRole.auth.admin.deleteUser(user.id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ ok: true, message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
