const express = require('express');
const router = express.Router();
const { supabasePublic, supabaseServiceRole } = require('../supabaseClient');
const { requireUser } = require('../middleware/auth');

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

function normalizeUsername(username) {
  if (!username) return null;
  const trimmed = String(username).trim();
  if (!trimmed) return null;
  return trimmed;
}

function validateUsername(username) {
  if (!username) return false;
  return USERNAME_REGEX.test(username);
}

async function ensureProfile(user, username) {
  if (!supabaseServiceRole || !user?.id) return;

  const payload = {
    id: user.id,
    display_name: user.email ? user.email.split('@')[0] : null,
    email: user.email,
  };

  const normalizedUsername = normalizeUsername(username || user.user_metadata?.username);
  if (normalizedUsername) payload.username = normalizedUsername;

  try {
    const { error } = await supabaseServiceRole
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('ensureProfile upsert failed:', error);
    }
  } catch (err) {
    console.error('ensureProfile unexpected error:', err);
  }
}

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    if (!supabasePublic) {
      return res.status(500).json({ error: 'Supabase auth not configured on server.' });
    }

    const { email, password, username } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername && !validateUsername(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores).' });
    }

    if (normalizedUsername && supabaseServiceRole) {
      const { data: existing } = await supabaseServiceRole
        .from('profiles')
        .select('id')
        .eq('username', normalizedUsername)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
    }

    const { data, error } = await supabasePublic.auth.signUp({
      email,
      password,
      options: {
        data: normalizedUsername ? { username: normalizedUsername } : undefined,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await ensureProfile(data.user, normalizedUsername);

    return res.status(201).json({
      ok: true,
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token || null,
      refresh_token: data.session?.refresh_token || null,
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

    await ensureProfile(data.user, data.user?.user_metadata?.username);

    return res.json({
      ok: true,
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token || null,
      refresh_token: data.session?.refresh_token || null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    if (!supabasePublic) {
      return res.status(500).json({ error: 'Supabase auth not configured on server.' });
    }

    const refreshToken = req.body?.refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }

    const { data, error } = await supabasePublic.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) {
      return res.status(401).json({ error: error?.message || 'Unable to refresh session' });
    }

    await ensureProfile(data.session.user, data.session.user?.user_metadata?.username);

    res.json({
      ok: true,
      user: data.session.user,
      session: data.session,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
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
      await Promise.allSettled([
        supabaseServiceRole.from('judgements').delete().eq('user_id', user.id),
        supabaseServiceRole.from('friends').delete().or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabaseServiceRole.from('notifications').delete().eq('user_id', user.id),
        supabaseServiceRole.from('user_settings').delete().eq('user_id', user.id),
        supabaseServiceRole.from('questions').delete().eq('user_id', user.id),
      ]);
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
