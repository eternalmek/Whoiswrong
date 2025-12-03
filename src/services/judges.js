const { supabaseServiceRole } = require('../supabaseClient');
const { celebrityJudges } = require('../data/judges');
const { ensureJudgeAvatars } = require('./judgeAvatars');

function getLocalJudges() {
  return celebrityJudges;
}

async function seedJudgesIfMissing() {
  if (!supabaseServiceRole) return getLocalJudges();

  const { data: existing, error } = await supabaseServiceRole
    .from('judges')
    .select('id, slug, personality_prompt, photo_url, category');

  if (error) {
    console.warn('Unable to check judges table, using fallback list.', error);
    return getLocalJudges();
  }

  const existingSlugs = new Set((existing || []).map((j) => j.slug));
  const existingBySlug = new Map((existing || []).map((row) => [row.slug, row]));
  const missing = celebrityJudges.filter((judge) => !existingSlugs.has(judge.slug));

  const needsPatch = celebrityJudges.filter((judge) => {
    const current = existingBySlug.get(judge.slug);
    if (!current) return false;
    return !current.personality_prompt || !current.category;
  });

  if (missing.length > 0) {
    const { error: insertError } = await supabaseServiceRole
      .from('judges')
      .upsert(
        missing.map((judge) => ({
          id: judge.id,
          slug: judge.slug,
          name: judge.name,
          category: judge.category,
          is_celebrity: judge.is_celebrity,
          is_default_free: judge.is_default_free,
          photo_url: judge.photo_url,
          description: judge.description,
          personality_prompt: judge.personality_prompt,
          is_active: judge.is_active,
        })),
        { onConflict: 'slug' }
      );

    if (insertError) {
      console.warn('Unable to seed judges table, using fallback list.', insertError);
    }
  }

  if (needsPatch.length > 0) {
    const { error: patchError } = await supabaseServiceRole
      .from('judges')
      .upsert(
        needsPatch.map((judge) => {
          const current = existingBySlug.get(judge.slug) || {};
          return {
            id: judge.id,
            slug: judge.slug,
            name: judge.name,
            category: judge.category,
            is_celebrity: judge.is_celebrity,
            is_default_free: judge.is_default_free,
            photo_url: current.photo_url || judge.photo_url,
            description: judge.description,
            personality_prompt: judge.personality_prompt,
            is_active: judge.is_active,
          };
        }),
        { onConflict: 'slug' }
      );

    if (patchError) {
      console.warn('Unable to patch judges fields', patchError);
    }
  }

  return getLocalJudges();
}

async function fetchJudges() {
  const fallback = getLocalJudges();

  if (!supabaseServiceRole) return fallback;

  await seedJudgesIfMissing();
  await ensureJudgeAvatars();

  const { data, error } = await supabaseServiceRole
    .from('judges')
    .select('*')
    .eq('is_active', true)
    .order('is_default_free', { ascending: false })
    .order('name');

  if (error || !data || data.length === 0) {
    if (error) console.warn('Falling back to local judges list', error);
    return fallback;
  }

  return data.map((judge) => ({
    ...judge,
    photo_url: judge.photo_url || judge.avatar_url || null,
    personality_prompt: judge.personality_prompt || judge.system_prompt,
  }));
}

async function getJudgeById(id) {
  if (!id) return (await fetchJudges())[0];

  const judges = await fetchJudges();
  const found = judges.find((j) => j.id === id || j.slug === id);
  return found || judges[0];
}

module.exports = {
  getJudgeById,
  fetchJudges,
  seedJudgesIfMissing,
  getLocalJudges,
};
