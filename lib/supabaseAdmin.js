// lib/supabaseAdmin.js
// Shared Supabase admin client for API routes with service role access
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Track configuration issues for debugging
const configIssues = [];
if (!supabaseUrl) configIssues.push('NEXT_PUBLIC_SUPABASE_URL is missing');
if (!serviceRoleKey) configIssues.push('SUPABASE_SERVICE_ROLE_KEY is missing');

if (configIssues.length > 0) {
  console.warn('Supabase env vars missing in supabaseAdmin.js:', configIssues.join(', '));
}

// Create client only if configured
let supabaseAdmin = null;

if (supabaseUrl && serviceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

module.exports = { supabaseAdmin, configIssues };
