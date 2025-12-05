const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Track configuration issues for debugging
const supabaseConfigIssues = [];
if (!supabaseUrl) supabaseConfigIssues.push('NEXT_PUBLIC_SUPABASE_URL is missing');
if (!supabaseAnonKey) supabaseConfigIssues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');

if (supabaseConfigIssues.length > 0) {
  throw new Error(
    'Supabase configuration missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Explicit public client export to align with route imports
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

async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: 'Missing bearer token' };

  const client = supabaseServiceRole || supabase;
  const { data, error } = await client.auth.getUser(token);
  return { user: data?.user || null, error: error?.message || null, token };
}

async function verifyAuthToken(token) {
  if (!token) return { user: null, error: 'Missing token' };

  const client = supabaseServiceRole || supabase;
  const { data, error } = await client.auth.getUser(token);
  return { user: data?.user || null, error: error?.message || null };
}

module.exports = {
  supabase,
  supabasePublic,
  supabaseServiceRole,
  requireUser,
  getBearerToken,
  verifyAuthToken,
  supabaseConfigIssues,
};
