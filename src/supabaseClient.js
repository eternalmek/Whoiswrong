const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase operations will fail.');
}

if (!SUPABASE_ANON_KEY) {
  console.warn('SUPABASE_ANON_KEY not set — user auth endpoints will fail.');
}

const supabaseServiceRole = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null;

const supabasePublic = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null;

async function verifyAuthToken(token) {
  if (!token) {
    return { user: null, error: new Error('Missing token') };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !supabaseServiceRole) {
    return { user: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabaseServiceRole.auth.getUser(token);
  return { user: data?.user || null, error };
}

module.exports = {
  supabaseServiceRole,
  supabasePublic,
  verifyAuthToken,
};