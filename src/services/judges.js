// src/services/judges.js
// Responsible for seeding judges and resolving judge ids (slug <-> uuid)

const crypto = require('crypto');
const { supabaseServiceRole } = require('../supabaseClient');
const { celebrityJudges } = require('../data/judges');
const { ensureJudgeAvatars } = require('./judgeAvatars');

// Number of free judges (AI + two celebrities = 3 total free)
const FREE_JUDGES_COUNT = 3;

// UUID regex for v1-5 pattern check
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true if value is a UUID v1-5 (basic pattern check)
 */
function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Generate a deterministic UUID v5 from a slug.
 * This ensures the same slug always produces the same UUID.
 * @param {string} slug - The slug to convert to UUID
 * @returns {string} A valid UUID v5
 */
function slugToUuid(slug) {
  if (!slug) return crypto.randomUUID();
  
  // Generate UUID v5 using namespace-based hashing
  // Namespace UUID for "whoiswrong.io judges" (DNS namespace)
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from('whoiswrong-judge-' + slug, 'utf8');
  
  // Create SHA-1 hash
  const hash = crypto.createHash('sha1')
    .update(namespaceBytes)
    .update(nameBytes)
    .digest('hex');
  
  // Format as UUID v5
  const uuid = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16), // Version 5
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.slice(18, 20), // Variant
    hash.slice(20, 32)
  ].join('-');
  
  return uuid;
}

/**
 * Resolve an input which may be a UUID or a slug to a judge UUID.
 * Throws if not found.
 * @param {object} supabase - Supabase client instance (optional, defaults to supabaseServiceRole)
 * @param {string} identifier - uuid or slug
 * @returns {Promise<string>} judge uuid
 */
async function resolveJudgeId(supabase, identifier) {
  const client = supabase || supabaseServiceRole;
  if (!client) {
    throw new Error('Supabase client is required');
  }

  if (!identifier) {
    throw new Error('No judge identifier provided');
  }

  if (isUuid(identifier)) return identifier;

  // Treat as slug - look up id
  const { data, error } = await client
    .from('judges')
    .select('id')
    .eq('slug', identifier)
    .maybeSingle();

  if (error) {
    throw new Error(`DB error resolving judge slug "${identifier}": ${error.message || JSON.stringify(error)}`);
  }
  if (!data || !data.id) {
    throw new Error(`Judge not found for slug: ${identifier}`);
  }
  return data.id;
}

async function ensureJudgesTable() {
  if (!supabaseServiceRole) {
    throw new Error('Supabase service role not configured');
  }

  // Check if the judges table exists and has the required columns
  const { error: checkError } = await supabaseServiceRole
    .from('judges')
    .select('id')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    // Table doesn't exist - this shouldn't happen in production
    // as migrations should have been run
    throw new Error('Judges table does not exist. Please run migrations.');
  }

  return true;
}

/**
 * Seed judges if missing.
 * - Upserts by slug to be idempotent.
 * - Maps input fields to DB column names and computes price_cents if price provided.
 *
 * @param {object} supabase - Supabase client instance (optional, defaults to supabaseServiceRole)
 * @param {Array<object>} judges - array of judge objects to seed (optional, defaults to celebrityJudges)
 */
async function seedJudgesIfMissing(supabase, judges) {
  const client = supabase || supabaseServiceRole;
  const judgeList = Array.isArray(judges) && judges.length > 0 ? judges : celebrityJudges;

  if (!client) {
    throw new Error('Supabase client is required');
  }

  if (!Array.isArray(judgeList) || judgeList.length === 0) {
    // nothing to seed
    return;
  }

  const { data: existing, error } = await client
    .from('judges')
    .select('id, slug, personality_prompt, photo_url, category, price, is_free');

  if (error) {
    throw new Error(`Unable to check judges table: ${error.message}`);
  }

  const existingSlugs = new Set((existing || []).map((j) => j.slug));
  const existingBySlug = new Map((existing || []).map((row) => [row.slug, row]));
  const missing = judgeList.filter((judge) => !existingSlugs.has(judge.slug));

  // Check for judges that need pricing updates
  const needsPricingUpdate = judgeList.filter((judge) => {
    const current = existingBySlug.get(judge.slug);
    if (!current) return false;
    return current.price === null || current.is_free === null;
  });

  const needsPatch = judgeList.filter((judge) => {
    const current = existingBySlug.get(judge.slug);
    if (!current) return false;
    return !current.personality_prompt || !current.category;
  });

    // Determine which judges are free based on position in the list
    // First 3 judges are free (AI + two celebrities)
    // This ensures consistent free tier across fresh deployments
  const getFreeStatus = (judgeSlug) => {
    const index = judgeList.findIndex((j) => j.slug === judgeSlug);
    return index >= 0 && index < FREE_JUDGES_COUNT;
  };

  const getPrice = (judgeSlug) => {
    return getFreeStatus(judgeSlug) ? 0 : 0.99;
  };

  // Prepare rows: normalize fields
  // Generate a deterministic UUID from the slug for the id field
  // This ensures consistent UUIDs across restarts and handles both uuid and text id columns
  const prepareRow = (j) => {
    // Handle price: if price_cents is provided, convert to dollars; otherwise use price
    const price = j.price !== undefined ? Number(j.price) : (j.price_cents ? j.price_cents / 100 : 0);
    const computedPrice = price > 0 ? price : getPrice(j.slug);
    const slugSource = (j.slug || j.name || '').toString().toLowerCase();
    // Use a deterministic fallback based on name hash if slug is empty
    const fallbackSlug = j.name ? `judge-${j.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `judge-unknown`;
    const normalizedSlug = slugSource
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallbackSlug;

    return {
      // Generate a deterministic UUID from the slug
      id: slugToUuid(normalizedSlug),
      name: j.name || null,
      slug: normalizedSlug,
      color_theme: j.color_theme || null,
      is_ai_default: !!j.is_ai_default,
      description: j.description || j.bio || null,
      base_prompt: j.base_prompt || j.personality_prompt || null,
      personality_prompt: j.personality_prompt || null,
      category: j.category || null,
      is_default: !!j.is_default,
      is_celebrity: !!j.is_celebrity,
      is_free: j.is_free !== undefined ? !!j.is_free : getFreeStatus(j.slug),
      is_default_free: j.is_default_free !== undefined ? !!j.is_default_free : getFreeStatus(j.slug),
      price: computedPrice,
      price_cents: Math.round(computedPrice * 100),
      image_url: j.image_url || j.photo_url || j.avatar_url || j.avatar_placeholder || null,
      avatar_url: j.avatar_url || j.avatar_placeholder || null,
      photo_url: j.photo_url || j.avatar_placeholder || null,
      price_id: j.price_id || null,
      is_active: typeof j.is_active === 'boolean' ? j.is_active : true,
    };
  };

  if (missing.length > 0) {
    const rows = missing.map(prepareRow);
    const { error: insertError } = await client
      .from('judges')
      .upsert(rows, { onConflict: 'slug' });

    if (insertError) {
      throw new Error(`Unable to seed judges table: ${insertError.message}`);
    }
  }

  // Update pricing for existing judges if needed
  if (needsPricingUpdate.length > 0) {
    for (const judge of needsPricingUpdate) {
      const { error: priceError } = await client
        .from('judges')
        .update({
          is_free: getFreeStatus(judge.slug),
          price: getPrice(judge.slug),
        })
        .eq('slug', judge.slug);

      if (priceError) {
        console.warn(`Unable to update pricing for ${judge.name}:`, priceError);
      }
    }
  }

  if (needsPatch.length > 0) {
    const rows = needsPatch.map((judge) => {
      const current = existingBySlug.get(judge.slug) || {};
      // Preserve existing photo_url if set, otherwise use fallbacks
      const photoUrl = current.photo_url || judge.photo_url || judge.avatar_placeholder;
      // For updates, use existing id if present, otherwise generate from slug
      const judgeId = current.id || slugToUuid(judge.slug);
      return {
        id: judgeId,
        slug: judge.slug,
        name: judge.name,
        category: judge.category,
        is_celebrity: judge.is_celebrity,
        is_default_free: getFreeStatus(judge.slug),
        is_free: getFreeStatus(judge.slug),
        price: getPrice(judge.slug),
        photo_url: photoUrl,
        image_url: photoUrl,
        description: judge.description,
        personality_prompt: judge.personality_prompt,
        is_active: judge.is_active,
      };
    });

    const { error: patchError } = await client
      .from('judges')
      .upsert(rows, { onConflict: 'slug' });

    if (patchError) {
      console.warn('Unable to patch judges fields', patchError);
    }
  }
}

/**
 * Safe wrapper to seed judges but not crash on failure.
 * Use this in request handlers where seeding is opportunistic.
 */
async function trySeedJudgesIfMissing(supabase, judges) {
  try {
    return await seedJudgesIfMissing(supabase, judges);
  } catch (err) {
    // Log and continue; don't let seeding break request flows.
    console.error('Non-fatal: seedJudgesIfMissing failed:', err.message || err);
    return null;
  }
}

async function fetchJudges() {
  if (!supabaseServiceRole) {
    throw new Error('Supabase service role not configured. Cannot load judges.');
  }

  await ensureJudgesTable();
  await seedJudgesIfMissing();
  await ensureJudgeAvatars();

  const { data, error } = await supabaseServiceRole
    .from('judges')
    .select('*')
    .eq('is_active', true)
    .order('is_free', { ascending: false })
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch judges from Supabase: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No judges found in database. Please ensure judges are seeded.');
  }

  return data.map((judge) => ({
    ...judge,
    // Normalize field names for API response
    image_url: judge.image_url || judge.photo_url || judge.avatar_url || null,
    photo_url: judge.photo_url || judge.avatar_url || judge.image_url || null,
    personality_prompt: judge.personality_prompt || judge.system_prompt,
    // Ensure pricing fields are present
    is_free: judge.is_free ?? judge.is_default_free ?? false,
    price: judge.price ?? (judge.is_free ? 0 : 0.99),
  }));
}

async function getJudgeById(id) {
  if (!id) return (await fetchJudges())[0];

  const judges = await fetchJudges();
  const found = judges.find((j) => j.id === id || j.slug === id);
  return found || judges[0];
}

/**
 * Get local judges data without database access.
 * Useful as fallback when DB is unavailable.
 */
function getLocalJudges() {
  return celebrityJudges.map((judge, index) => ({
    ...judge,
    // Generate a deterministic UUID from the slug for consistency
    id: slugToUuid(judge.slug),
    image_url: judge.photo_url || judge.avatar_placeholder || null,
    photo_url: judge.photo_url || judge.avatar_placeholder || null,
    personality_prompt: judge.personality_prompt,
    // Use same logic as seeding: first FREE_JUDGES_COUNT judges are free
    is_free: index < FREE_JUDGES_COUNT,
    price: index < FREE_JUDGES_COUNT ? 0 : 0.99,
  }));
}

module.exports = {
  isUuid,
  resolveJudgeId,
  getJudgeById,
  fetchJudges,
  seedJudgesIfMissing,
  trySeedJudgesIfMissing,
  ensureJudgesTable,
  getLocalJudges,
  FREE_JUDGES_COUNT,
};
