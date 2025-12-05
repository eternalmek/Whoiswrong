const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Track configuration issues for debugging
const supabaseConfigIssues = [];
if (!supabaseUrl) supabaseConfigIssues.push('NEXT_PUBLIC_SUPABASE_URL is missing');
if (!supabaseAnonKey) supabaseConfigIssues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');

// Create clients only if configured
let supabase = null;
let supabasePublic = null;
let supabaseServiceRole = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  supabasePublic = supabase;
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    supabaseServiceRole = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
} else if (process.env.NODE_ENV === 'production') {
  // Only throw in production - allow dev/testing without Supabase
  console.error('Supabase configuration missing:', supabaseConfigIssues.join(', '));
}

function getBearerToken(req) {
  const authHeader = req.headers?.authorization || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: 'Missing bearer token' };

  if (!supabase) {
    return { user: null, error: 'Database not configured' };
  }

  const client = supabaseServiceRole || supabase;
  const { data, error } = await client.auth.getUser(token);
  return { user: data?.user || null, error: error?.message || null, token };
}

async function verifyAuthToken(token) {
  if (!token) return { user: null, error: 'Missing token' };

  if (!supabase) {
    return { user: null, error: 'Database not configured' };
  }

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
