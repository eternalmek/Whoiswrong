const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Track configuration issues for debugging
const supabaseConfigIssues = [];
if (!supabaseUrl) supabaseConfigIssues.push('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
if (!supabaseAnonKey) supabaseConfigIssues.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alias for backwards compatibility
const supabasePublic = supabase;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseServiceRole = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  : null;

function getBearerToken(req) {
  const authHeader = req.headers?.authorization || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

/**
 * Verify an auth token and return the user
 * @param {string} token - JWT access token
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
async function verifyAuthToken(token) {
  if (!token) return { user: null, error: 'Missing token' };

  const client = supabaseServiceRole || supabase;
  const { data, error } = await client.auth.getUser(token);
  return { user: data?.user || null, error: error?.message || null };
}

async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: 'Missing bearer token' };

  const { user, error } = await verifyAuthToken(token);
  return { user, error, token };
}

module.exports = {
  supabase,
  supabasePublic,
  supabaseServiceRole,
  supabaseConfigIssues,
  requireUser,
  getBearerToken,
  verifyAuthToken,
};
