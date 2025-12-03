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
  createPublicDebate,
};
