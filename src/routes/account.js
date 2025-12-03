const express = require('express');
const router = express.Router();
const { supabaseServiceRole, supabaseConfigIssues } = require('../supabaseClient');
const { requireUser } = require('../middleware/auth');

/**
 * Utilities
 */
const ACCOUNT_TEXT_LIMITS = {
  displayName: 120,
  bio: 500,
  country: 80,
  avatarUrl: 400,
  search: 64,
};

const FRIEND_REQUEST_COOLDOWN_MS = 15 * 1000;

function ensureSupabase(res) {
  if (!supabaseServiceRole) {
    res.status(503).json({
      error: 'Supabase not configured on server.',
      details: supabaseConfigIssues || undefined,
    });
    return false;
  }
  return true;
}

function sanitizeText(value, maxLength) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  if (maxLength && cleaned.length > maxLength) return cleaned.slice(0, maxLength);
  return cleaned;
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username || '');
}

async function ensureProfile(userId, email) {
  const { data: existing } = await supabaseServiceRole
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existing) return existing;

  const display_name = email ? email.split('@')[0] : 'New User';
  const { data } = await supabaseServiceRole
    .from('profiles')
    .insert({ id: userId, display_name })
    .select()
    .single();

  return data;
}

async function fetchStats(userId) {
  const [debates, friends, purchases] = await Promise.allSettled([
    supabaseServiceRole
      .from('judgements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabaseServiceRole
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
    supabaseServiceRole
      .from('user_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  const stats = {
    debates: debates.status === 'fulfilled' ? debates.value?.count || 0 : 0,
    friends: friends.status === 'fulfilled' ? friends.value?.count || 0 : 0,
    unlockedJudges: purchases.status === 'fulfilled' ? purchases.value?.count || 0 : 0,
  };

  const warnings = [];
  if (debates.status === 'rejected') warnings.push('Unable to load debate stats');
  if (friends.status === 'rejected') warnings.push('Unable to load friends stats');
  if (purchases.status === 'rejected') warnings.push('Unable to load judge unlock stats');

  return { stats, warnings };
}

async function fetchFriendships(userId) {
  const { data, error } = await supabaseServiceRole
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
  if (error) throw error;
  return data || [];
}

async function fetchFriendsDebates(userId) {
  const warnings = [];
  try {
    const friendships = await fetchFriendships(userId);
    const friendIds = friendships
      .filter((f) => f.status === 'accepted')
      .map((f) => (f.requester_id === userId ? f.receiver_id : f.requester_id));

    if (friendIds.length === 0) return { debates: [], warnings };

    const { data: friendProfiles } = await supabaseServiceRole
      .from('profiles')
      .select('id, display_name, username, show_debates_on_wall, avatar_url')
      .in('id', friendIds);

    const shareableIds = new Set(
      (friendProfiles || [])
        .filter((p) => p.show_debates_on_wall !== false)
        .map((p) => p.id)
    );

    if (shareableIds.size === 0) return { debates: [], warnings };

    const { data: debates, error } = await supabaseServiceRole
      .from('judgements')
      .select('id, context, option_a, option_b, wrong, right, reason, roast, user_id, created_at')
      .in('user_id', Array.from(shareableIds))
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const profileMap = new Map((friendProfiles || []).map((p) => [p.id, p]));
    const formatted = (debates || []).map((item) => ({
      ...item,
      profile: profileMap.get(item.user_id) || null,
    }));

    return { debates: formatted, warnings };
  } catch (err) {
    console.warn('Failed to load friends list for account profile', err);
    warnings.push('Unable to load recent friend debates');
    return { debates: [], warnings };
  }
}

async function assertUsernameAvailable(userId, username) {
  const { data: existing } = await supabaseServiceRole
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', userId)
    .maybeSingle();

  if (existing) {
    const error = new Error('Username is already taken.');
    error.status = 409;
    throw error;
  }
}

function buildFriendshipLists(userId, friendships, profileMap) {
  const incoming = [];
  const outgoing = [];
  const friends = [];

  (friendships || []).forEach((f) => {
    const otherId = f.requester_id === userId ? f.receiver_id : f.requester_id;
    const profile = profileMap.get(otherId) || null;
    const item = { ...f, other_user: profile };

    if (f.status === 'pending') {
      if (f.receiver_id === userId) incoming.push(item);
      else outgoing.push(item);
    } else if (f.status === 'accepted') {
      friends.push(item);
    }
  });

  return { incoming, outgoing, friends };
}

async function loadFriendProfiles(friendships, userId) {
  const relatedIds = Array.from(
    new Set((friendships || []).map((f) => (f.requester_id === userId ? f.receiver_id : f.requester_id)))
  );

  if (relatedIds.length === 0) return new Map();

  const { data } = await supabaseServiceRole
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', relatedIds);

  return new Map((data || []).map((p) => [p.id, p]));
}

/**
 * Routes
 */
router.get('/profile', requireUser, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;

    const profile = await ensureProfile(user.id, user.email);
    const { stats, warnings: statsWarnings } = await fetchStats(user.id);
    const { debates: friendsDebates, warnings: friendWarnings } = await fetchFriendsDebates(user.id);

    res.json({
      ok: true,
      profile,
      stats,
      friendsDebates,
      auth: {
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
      },
      warnings: [...statsWarnings, ...friendWarnings],
    });
  } catch (err) {
    console.error('Account page error', err);
    res.status(500).json({ error: 'Unable to load account profile right now.' });
  }
});

router.put('/profile', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const body = req.body || {};

    const updates = {};
    if (body.display_name !== undefined) updates.display_name = sanitizeText(body.display_name, ACCOUNT_TEXT_LIMITS.displayName);
    if (body.bio !== undefined) updates.bio = sanitizeText(body.bio, ACCOUNT_TEXT_LIMITS.bio);
    if (body.country !== undefined) updates.country = sanitizeText(body.country, ACCOUNT_TEXT_LIMITS.country);
    if (body.avatar_url !== undefined) updates.avatar_url = sanitizeText(body.avatar_url, ACCOUNT_TEXT_LIMITS.avatarUrl);

    if (typeof body.is_public_profile === 'boolean') updates.is_public_profile = body.is_public_profile;
    if (typeof body.allow_friend_requests === 'boolean') updates.allow_friend_requests = body.allow_friend_requests;
    if (typeof body.show_debates_on_wall === 'boolean') updates.show_debates_on_wall = body.show_debates_on_wall;
    if (typeof body.dark_mode_preference === 'boolean') updates.dark_mode_preference = body.dark_mode_preference;
    if (typeof body.allow_notifications === 'boolean') updates.allow_notifications = body.allow_notifications;

    if (body.username !== undefined) {
      if (body.username && !validateUsername(body.username)) {
        return res.status(400).json({ error: 'Username must be 3-20 chars (letters, numbers, underscores).' });
      }
      if (body.username) await assertUsernameAvailable(user.id, body.username);
      updates.username = body.username || null;
    }

    const { data, error } = await supabaseServiceRole
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, profile: data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.get('/username-check', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const username = sanitizeText(req.query.username || '', ACCOUNT_TEXT_LIMITS.search);

    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username format.' });
    }

    const { data } = await supabaseServiceRole
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .maybeSingle();

    res.json({ ok: true, available: !data });
  } catch (err) {
    next(err);
  }
});

router.get('/search', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const term = sanitizeText(req.query.query || '', ACCOUNT_TEXT_LIMITS.search);

    let query = supabaseServiceRole
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_public_profile, allow_friend_requests')
      .neq('id', user.id)
      .or('is_public_profile.eq.true,allow_friend_requests.eq.true')
      .limit(20);

    if (term) query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);

    const { data: profiles, error } = await query;
    if (error) throw error;

    const targetIds = (profiles || []).map((p) => p.id);
    let statusMap = new Map();
    if (targetIds.length > 0) {
      const { data: relations } = await supabaseServiceRole
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const filtered = (relations || []).filter((r) => {
        const otherId = r.requester_id === user.id ? r.receiver_id : r.requester_id;
        return targetIds.includes(otherId);
      });
      statusMap = new Map(filtered.map((r) => [r.requester_id === user.id ? r.receiver_id : r.requester_id, r]));
    }

    const results = (profiles || []).map((p) => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      status: statusMap.get(p.id)?.status || null,
      is_requester: statusMap.get(p.id)?.requester_id === user.id || false,
    }));

    res.json({ ok: true, results });
  } catch (err) {
    next(err);
  }
});

router.get('/friends', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;

    const { data: friendships, error } = await supabaseServiceRole
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const profileMap = await loadFriendProfiles(friendships, user.id);
    const lists = buildFriendshipLists(user.id, friendships, profileMap);

    res.json({ ok: true, ...lists });
  } catch (err) {
    next(err);
  }
});

router.post('/friends/request', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const receiver_id = req.body?.receiver_id;

    if (!receiver_id) return res.status(400).json({ error: 'receiver_id is required' });
    if (receiver_id === user.id) return res.status(400).json({ error: 'You cannot friend yourself.' });

    const { data: receiverProfile } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('id', receiver_id)
      .maybeSingle();

    if (!receiverProfile) return res.status(404).json({ error: 'User not found' });
    if (receiverProfile.allow_friend_requests === false) {
      return res.status(403).json({ error: 'This user is not accepting friend requests.' });
    }

    const { data: requesterProfile } = await supabaseServiceRole
      .from('profiles')
      .select('last_friend_request_at')
      .eq('id', user.id)
      .maybeSingle();

    const now = Date.now();
    if (requesterProfile?.last_friend_request_at) {
      const last = new Date(requesterProfile.last_friend_request_at).getTime();
      if (now - last < FRIEND_REQUEST_COOLDOWN_MS) {
        return res.status(429).json({ error: 'Please wait before sending another request.' });
      }
    }

    const { data: existing } = await supabaseServiceRole
      .from('friendships')
      .select('*')
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${receiver_id}),` +
          `and(requester_id.eq.${receiver_id},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') return res.json({ ok: true, status: 'pending', friendship: existing });
      if (existing.status === 'accepted') return res.json({ ok: true, status: 'accepted', friendship: existing });
    }

    const { data, error } = await supabaseServiceRole
      .from('friendships')
      .insert({
        requester_id: user.id,
        receiver_id,
        status: 'pending',
        action_user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseServiceRole
      .from('profiles')
      .update({ last_friend_request_at: new Date(now).toISOString() })
      .eq('id', user.id);

    res.status(201).json({ ok: true, friendship: data });
  } catch (err) {
    next(err);
  }
});

router.post('/friends/respond', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const { friendship_id, action } = req.body || {};

    if (!friendship_id || !action) return res.status(400).json({ error: 'friendship_id and action are required' });

    const { data: friendship } = await supabaseServiceRole
      .from('friendships')
      .select('*')
      .eq('id', friendship_id)
      .maybeSingle();

    if (!friendship || friendship.receiver_id !== user.id) {
      return res.status(403).json({ error: 'You cannot update this request.' });
    }

    let status;
    if (action === 'accept') status = 'accepted';
    else if (action === 'decline') status = 'declined';
    else if (action === 'block') status = 'blocked';
    else return res.status(400).json({ error: 'Invalid action' });

    const { data, error } = await supabaseServiceRole
      .from('friendships')
      .update({ status, action_user_id: user.id })
      .eq('id', friendship_id)
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, friendship: data });
  } catch (err) {
    next(err);
  }
});

router.post('/friends/cancel', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const { friendship_id } = req.body || {};

    if (!friendship_id) return res.status(400).json({ error: 'friendship_id is required' });

    const { data: friendship } = await supabaseServiceRole
      .from('friendships')
      .select('*')
      .eq('id', friendship_id)
      .maybeSingle();

    if (!friendship || friendship.requester_id !== user.id) {
      return res.status(403).json({ error: 'You cannot cancel this request.' });
    }

    const { data, error } = await supabaseServiceRole
      .from('friendships')
      .update({ status: 'cancelled', action_user_id: user.id })
      .eq('id', friendship_id)
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, friendship: data });
  } catch (err) {
    next(err);
  }
});

router.post('/friends/remove', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const { friendship_id } = req.body || {};

    if (!friendship_id) return res.status(400).json({ error: 'friendship_id is required' });

    const { data: friendship } = await supabaseServiceRole
      .from('friendships')
      .select('*')
      .eq('id', friendship_id)
      .maybeSingle();

    if (!friendship || (friendship.requester_id !== user.id && friendship.receiver_id !== user.id)) {
      return res.status(403).json({ error: 'You cannot modify this friendship.' });
    }

    const { data, error } = await supabaseServiceRole
      .from('friendships')
      .update({ status: 'removed', action_user_id: user.id })
      .eq('id', friendship_id)
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, friendship: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
