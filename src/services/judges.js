const { supabaseServiceRole } = require('../supabaseClient');
const { celebrityJudges } = require('../data/judges');
const { ensureJudgeAvatars } = require('./judgeAvatars');

// Number of free judges (1 default + 3 celebrities = 4 total free)
const FREE_JUDGES_COUNT = 4;

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

async function seedJudgesIfMissing() {
  if (!supabaseServiceRole) {
    throw new Error('Supabase service role not configured');
  }

  const { data: existing, error } = await supabaseServiceRole
    .from('judges')
    .select('id, slug, personality_prompt, photo_url, category, price, is_free');

  if (error) {
    throw new Error(`Unable to check judges table: ${error.message}`);
  }

  const existingSlugs = new Set((existing || []).map((j) => j.slug));
  const existingBySlug = new Map((existing || []).map((row) => [row.slug, row]));
  const missing = celebrityJudges.filter((judge) => !existingSlugs.has(judge.slug));

  // Check for judges that need pricing updates
  const needsPricingUpdate = celebrityJudges.filter((judge) => {
    const current = existingBySlug.get(judge.slug);
    if (!current) return false;
    return current.price === null || current.is_free === null;
  });

  const needsPatch = celebrityJudges.filter((judge) => {
    const current = existingBySlug.get(judge.slug);
    if (!current) return false;
    return !current.personality_prompt || !current.category;
  });

  // Determine which judges are free based on position in the list
  // First 4 judges are free (1 default + 3 celebrities)
  const getFreeStatus = (judgeId) => {
    const index = celebrityJudges.findIndex((j) => j.id === judgeId);
    return index >= 0 && index < FREE_JUDGES_COUNT;
  };

  const getPrice = (judgeId) => {
    return getFreeStatus(judgeId) ? 0 : 0.99;
  };

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
          is_default_free: getFreeStatus(judge.id),
          is_free: getFreeStatus(judge.id),
          price: getPrice(judge.id),
          photo_url: judge.photo_url,
          avatar_url: judge.avatar_placeholder,
          image_url: judge.photo_url || judge.avatar_placeholder,
          description: judge.description,
          personality_prompt: judge.personality_prompt,
          system_prompt: judge.personality_prompt,
          is_active: judge.is_active,
        })),
        { onConflict: 'slug' }
      );

    if (insertError) {
      throw new Error(`Unable to seed judges table: ${insertError.message}`);
    }
  }

  // Update pricing for existing judges if needed
  if (needsPricingUpdate.length > 0) {
    for (const judge of needsPricingUpdate) {
      const { error: priceError } = await supabaseServiceRole
        .from('judges')
        .update({
          is_free: getFreeStatus(judge.id),
          price: getPrice(judge.id),
        })
        .eq('id', judge.id);

      if (priceError) {
        console.warn(`Unable to update pricing for ${judge.name}:`, priceError);
      }
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
            is_default_free: getFreeStatus(judge.id),
            is_free: getFreeStatus(judge.id),
            price: getPrice(judge.id),
            photo_url: current.photo_url || judge.photo_url,
            image_url: current.photo_url || current.image_url || judge.photo_url || judge.avatar_placeholder,
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

module.exports = {
  getJudgeById,
  fetchJudges,
  seedJudgesIfMissing,
  ensureJudgesTable,
  FREE_JUDGES_COUNT,
};
