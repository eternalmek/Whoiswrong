const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase Configuration
 *
 * To get these values from your Supabase project:
 * 1. Go to https://supabase.com and open your project
 * 2. Navigate to: Settings → API
 * 3. Copy the values:
 *    - SUPABASE_URL: from "Project URL"
 *    - SUPABASE_ANON_KEY: from "anon public" key (safe for client-side)
 *    - SUPABASE_SERVICE_ROLE_KEY: from "service_role" key (server-side ONLY!)
 */
// Prefer server-side env vars but fall back to public ones when available (for anon client)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseConfigIssues = [];
if (!SUPABASE_URL) supabaseConfigIssues.push('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is missing');
if (!SUPABASE_SERVICE_ROLE_KEY)
  supabaseConfigIssues.push('SUPABASE_SERVICE_ROLE_KEY is missing on the server');
if (!SUPABASE_ANON_KEY)
  supabaseConfigIssues.push('SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is missing');

if (supabaseConfigIssues.length) {
  console.warn('Supabase configuration issues detected:', supabaseConfigIssues.join('; '));
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

// Use the most privileged available client for auth so the API can still
// validate tokens even when the service role key is missing.
const supabaseAuthClient = supabaseServiceRole || supabasePublic || null;

async function verifyAuthToken(token) {
  if (!token) {
    return { user: null, error: new Error('Missing token') };
  }

  if (!SUPABASE_URL || !supabaseAuthClient) {
    return { user: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token);
  return { user: data?.user || null, error };
}

module.exports = {
  supabaseServiceRole,
  supabasePublic,
  supabaseAuthClient,
  verifyAuthToken,
  supabaseConfigIssues,
};
