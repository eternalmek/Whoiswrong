const express = require('express');
const router = express.Router();
const { supabaseServiceRole, supabaseConfigIssues } = require('../supabaseClient');
const { requireUser } = require('../middleware/auth');

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

function sanitizeText(value, maxLength = 280) {
  if (value === null || value === undefined) return null;
  let cleaned = String(value).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
  return cleaned;
}

function validateUsername(username) {
  if (!username) return false;
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

async function ensureProfile(userId, email) {
  if (!supabaseServiceRole) return null;

  try {
    const { data: existing, error: existingError } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existingError) {
      console.error('Account profile lookup failed', existingError);
    }

    if (existing) return existing;

    const displayName = email ? email.split('@')[0] : 'New User';
    const { data, error } = await supabaseServiceRole
      .from('profiles')
      .insert({ id: userId, display_name: displayName, email })
      .select()
      .single();

    if (error) {
      console.error('Account profile insert failed', error);
      return null;
    }

    return data;
  } catch (profileError) {
    console.error('Unexpected profile error', profileError);
    return null;
  }
}

async function fetchFriendships(userId) {
  try {
    const { data, error } = await supabaseServiceRole
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
    if (error) throw error;
    return data || [];
  } catch (friendsError) {
    console.error('Friendship fetch failed for account view', friendsError);
    return [];
  }
}

router.get('/profile', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    console.info('[account] loading profile', { userId: user.id });

    const profile = await ensureProfile(user.id, user.email);
    if (!profile) {
      return res.status(503).json({ error: 'Profile could not be loaded. Please try again shortly.' });
    }

    const warnings = [];
    const stats = {
      debates: 0,
      friends: 0,
      unlockedJudges: 0,
    };

    const statsResults = await Promise.allSettled([
      supabaseServiceRole
        .from('judgements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabaseServiceRole
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`),
      supabaseServiceRole
        .from('user_purchases')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
    ]);

    const [debatesResult, friendsResult, purchasesResult] = statsResults;

    if (debatesResult.status === 'fulfilled') {
      stats.debates = debatesResult.value?.count || 0;
    } else {
      console.warn('Failed to load debates stats for account profile', debatesResult.reason);
      warnings.push('Unable to load debate stats');
    }

    if (friendsResult.status === 'fulfilled') {
      stats.friends = friendsResult.value?.count || 0;
    } else {
      console.warn('Failed to load friends stats for account profile', friendsResult.reason);
      warnings.push('Unable to load friends stats');
    }

    if (purchasesResult.status === 'fulfilled') {
      stats.unlockedJudges = purchasesResult.value?.count || 0;
    } else {
      console.warn('Failed to load purchases stats for account profile', purchasesResult.reason);
      warnings.push('Unable to load judge unlock stats');
    }

    // Fetch friends' latest debates
    let friendsDebates = [];
    try {
      const friendships = await fetchFriendships(user.id);
      const friendIds = friendships
        .filter((f) => f.status === 'accepted')
        .map((f) => (f.requester_id === user.id ? f.receiver_id : f.requester_id));

      if (friendIds.length > 0) {
        const { data: friendProfiles } = await supabaseServiceRole
          .from('profiles')
          .select('id, display_name, username, show_debates_on_wall, avatar_url')
          .in('id', friendIds);

        const shareableIds = new Set(
          (friendProfiles || [])
            .filter((p) => p.show_debates_on_wall !== false)
            .map((p) => p.id)
        );

        if (shareableIds.size > 0) {
          const { data: debates, error } = await supabaseServiceRole
            .from('judgements')
            .select('id, context, option_a, option_b, wrong, right, reason, roast, user_id, created_at')
            .in('user_id', Array.from(shareableIds))
            .order('created_at', { ascending: false })
            .limit(10);
          if (error) throw error;

          const profileMap = new Map((friendProfiles || []).map((p) => [p.id, p]));
          friendsDebates = (debates || []).map((item) => ({
            ...item,
            profile: profileMap.get(item.user_id) || null,
          }));
        }
      }
    } catch (friendsError) {
      console.warn('Failed to load friends list for account profile', friendsError);
      warnings.push('Unable to load recent friend debates');
    }

    res.json({
      ok: true,
      profile,
      stats,
      friendsDebates,
      auth: {
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
      },
      warnings,
    });
  } catch (err) {
    console.error('Account page error', err);
    res.status(500).json({ error: 'Unable to load account profile right now. Please try again.' });
  }
});

router.put('/profile', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;

    const updates = {};
    const {
      display_name,
      username,
      avatar_url,
      bio,
      country,
      is_public_profile,
      allow_friend_requests,
      show_debates_on_wall,
      dark_mode_preference,
      allow_notifications,
    } = req.body || {};

    if (display_name !== undefined) updates.display_name = sanitizeText(display_name, 120);
    if (bio !== undefined) updates.bio = sanitizeText(bio, 500);
    if (country !== undefined) updates.country = sanitizeText(country, 80);
    if (avatar_url !== undefined) updates.avatar_url = sanitizeText(avatar_url, 400);

    if (typeof is_public_profile === 'boolean') updates.is_public_profile = is_public_profile;
    if (typeof allow_friend_requests === 'boolean') updates.allow_friend_requests = allow_friend_requests;
    if (typeof show_debates_on_wall === 'boolean') updates.show_debates_on_wall = show_debates_on_wall;
    if (typeof dark_mode_preference === 'boolean') updates.dark_mode_preference = dark_mode_preference;
    if (typeof allow_notifications === 'boolean') updates.allow_notifications = allow_notifications;

    if (username !== undefined) {
      if (username && !validateUsername(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 chars (letters, numbers, underscores).' });
      }

      if (username) {
        const { data: existing } = await supabaseServiceRole
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .maybeSingle();
        if (existing) {
          return res.status(409).json({ error: 'Username is already taken.' });
        }
      }
      updates.username = username || null;
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
    next(err);
  }
});

router.get('/username-check', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const username = String(req.query.username || '').trim();

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
    const term = sanitizeText(req.query.query || '', 64);

    let query = supabaseServiceRole
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_public_profile, allow_friend_requests')
      .neq('id', user.id)
      .or('is_public_profile.eq.true,allow_friend_requests.eq.true')
      .limit(20);

    if (term) {
      query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
    }

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

    const relatedIds = Array.from(
      new Set(
        (friendships || []).map((f) => (f.requester_id === user.id ? f.receiver_id : f.requester_id))
      )
    );

    let profiles = [];
    if (relatedIds.length > 0) {
      const { data } = await supabaseServiceRole
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', relatedIds);
      profiles = data || [];
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const incoming = [];
    const outgoing = [];
    const friends = [];

    (friendships || []).forEach((f) => {
      const otherId = f.requester_id === user.id ? f.receiver_id : f.requester_id;
      const profile = profileMap.get(otherId) || null;
      const item = { ...f, other_user: profile };
      if (f.status === 'pending') {
        if (f.receiver_id === user.id) incoming.push(item);
        else outgoing.push(item);
      } else if (f.status === 'accepted') {
        friends.push(item);
      }
    });

    res.json({ ok: true, incoming, outgoing, friends });
  } catch (err) {
    next(err);
  }
});

router.post('/friends/request', requireUser, async (req, res, next) => {
  try {
    if (!ensureSupabase(res)) return;
    const { user } = req.auth;
    const receiver_id = req.body?.receiver_id;

    if (!receiver_id) {
      return res.status(400).json({ error: 'receiver_id is required' });
    }
    if (receiver_id === user.id) {
      return res.status(400).json({ error: 'You cannot friend yourself.' });
    }

    const { data: receiverProfile } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('id', receiver_id)
      .maybeSingle();

    if (!receiverProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (receiverProfile.allow_friend_requests === false) {
      return res.status(403).json({ error: 'This user is not accepting friend requests.' });
    }

    const { data: requesterProfile } = await supabaseServiceRole
      .from('profiles')
      .select('last_friend_request_at')
      .eq('id', user.id)
      .maybeSingle();

    const now = new Date();
    if (requesterProfile?.last_friend_request_at) {
      const last = new Date(requesterProfile.last_friend_request_at);
      if (now - last < 15 * 1000) {
        return res.status(429).json({ error: 'Please wait before sending another request.' });
      }
    }

    const { data: existing } = await supabaseServiceRole
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(requester_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        return res.json({ ok: true, status: 'pending', friendship: existing });
      }
      if (existing.status === 'accepted') {
        return res.json({ ok: true, status: 'accepted', friendship: existing });
      }
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
      .update({ last_friend_request_at: now.toISOString() })
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

    if (!friendship_id || !action) {
      return res.status(400).json({ error: 'friendship_id and action are required' });
    }

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
