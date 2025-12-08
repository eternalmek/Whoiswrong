const { supabaseServiceRole } = require('../supabaseClient');

function slugifyTitle(title = '') {
  const base = String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-');
  return base || 'debate';
}

async function getUniqueSlug(baseSlug) {
  if (!supabaseServiceRole) return baseSlug;

  let slug = baseSlug;
  let attempt = 1;

  // Limit attempts to avoid endless loops
  while (attempt < 50) {
    const { data, error } = await supabaseServiceRole
      .from('public_debates')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.warn('Failed to check slug uniqueness', error);
      return slug;
    }

    if (!data) break;

    slug = `${baseSlug}-${attempt}`;
    attempt += 1;
  }

  return slug;
}

/**
 * Create a new debate entry
 * @param {Object} params - Debate parameters
 * @returns {Promise<Object|null>} Created debate or null
 */
async function createDebate({
  userId,
  context,
  optionA,
  optionB,
  wrongSide,
  rightSide,
  verdictText,
  category = null,
  isPublic = true,
  isAnonymous = false,
  judgeId,
  judgeName,
  judgeSlug,
  judgeStyle = null,
}) {
  if (!supabaseServiceRole) return null;

  const payload = {
    user_id: userId || null,
    context: context || null,
    option_a: optionA,
    option_b: optionB,
    wrong_side: wrongSide,
    right_side: rightSide,
    verdict_text: verdictText,
    category,
    is_public: isPublic,
    is_anonymous: isAnonymous,
    judge_id: judgeId || null,
    judge_name: judgeName || null,
    judge_slug: judgeSlug || null,
    judge_style: judgeStyle,
    like_count: 0,
    comment_count: 0,
  };

  const { data, error } = await supabaseServiceRole
    .from('debates')
    .insert([payload])
    .select()
    .limit(1);

  if (error) {
    console.warn('Supabase insert warning (debates):', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get public debates feed
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of debates
 */
async function getPublicDebates({ limit = 20, offset = 0, category = null } = {}) {
  if (!supabaseServiceRole) return [];

  let query = supabaseServiceRole
    .from('debates')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('Error fetching public debates:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single debate by ID
 * @param {string} debateId - Debate UUID
 * @returns {Promise<Object|null>} Debate or null
 */
async function getDebateById(debateId) {
  if (!supabaseServiceRole) return null;

  const { data, error } = await supabaseServiceRole
    .from('debates')
    .select('*')
    .eq('id', debateId)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching debate:', error);
    return null;
  }

  return data;
}

/**
 * Legacy: Create public debate for SEO (kept for backward compatibility)
 */
async function createPublicDebate({
  title,
  content,
  judgeId,
  verdict,
  userId,
  isPublic = true,
  isIndexable = true,
  judgementId,
}) {
  if (!supabaseServiceRole) return null;

  const baseSlug = slugifyTitle(title);
  const slug = await getUniqueSlug(baseSlug);

  const payload = {
    slug,
    title: title || 'Debate',
    content: content || null,
    judge_id: judgeId || null,
    verdict: verdict || null,
    user_id: userId || null,
    is_public: isPublic,
    is_indexable: isIndexable,
    judgement_id: judgementId || null,
  };

  const { data, error } = await supabaseServiceRole
    .from('public_debates')
    .insert([payload])
    .select()
    .limit(1);

  if (error) {
    console.warn('Supabase insert warning (public_debates):', error);
    return null;
  }

  return data?.[0] || null;
}

module.exports = {
  slugifyTitle,
  createDebate,
  getPublicDebates,
  getDebateById,
  createPublicDebate, // legacy
};
