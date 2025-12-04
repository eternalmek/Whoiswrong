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
// Prefer Vercel/Next-style env vars to avoid surprises when deploying
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_PROJECT_URL;

// Service role key must NEVER be shipped to the browser. Only read server-side names.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY;

// Anonymous key is safe for the client, so we accept the public names first.
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

const supabaseConfigIssues = [];
if (!SUPABASE_URL) supabaseConfigIssues.push('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is missing');
if (!SUPABASE_SERVICE_ROLE_KEY)
  supabaseConfigIssues.push('SUPABASE_SERVICE_ROLE_KEY is missing on the server (do NOT expose this publicly)');
if (!SUPABASE_ANON_KEY)
  supabaseConfigIssues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) is missing');

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

const REQUIRED_TABLES = ['judgements'];

async function verifySupabaseSchema(tables = REQUIRED_TABLES) {
  if (!supabaseServiceRole) return [];

  const missing = [];
  for (const table of tables) {
    const { error } = await supabaseServiceRole.from(table).select('id').limit(1);

    if (error) {
      const message = error.message || '';
      const isMissing =
        message.includes(`table '${table}'`) ||
        message.includes(`table 'public.${table}'`) ||
        message.includes(`${table}' in the schema cache`);

      if (isMissing) {
        missing.push(table);
      } else {
        console.warn(`Supabase table check failed for ${table}:`, message || error);
      }
    }
  }

  if (missing.length) {
    console.warn(
      'Supabase schema is missing required tables. Apply the SQL migrations in supabase/migrations to create them:',
      missing
    );
  }

  return missing;
}

if (supabaseServiceRole) {
  verifySupabaseSchema().catch((err) =>
    console.warn('Supabase schema verification failed:', err?.message || err)
  );
}

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
  supabaseConfigIssues,
  verifySupabaseSchema,
};
