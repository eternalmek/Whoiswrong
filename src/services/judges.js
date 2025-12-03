const { supabaseServiceRole } = require('../supabaseClient');
const { celebrityJudges } = require('../data/judges');

function getLocalJudges() {
  return celebrityJudges;
}

async function seedJudgesIfEmpty() {
  if (!supabaseServiceRole) return getLocalJudges();

  const { count, error } = await supabaseServiceRole
    .from('judges')
    .select('id', { head: true, count: 'exact' });

  if (error) {
    console.warn('Unable to check judges table, using fallback list.', error);
    return getLocalJudges();
  }

  if ((count || 0) === 0) {
    const { error: insertError } = await supabaseServiceRole
      .from('judges')
      .upsert(
        celebrityJudges.map((judge) => ({
          id: judge.id,
          slug: judge.slug,
          name: judge.name,
          is_celebrity: judge.is_celebrity,
          is_default_free: judge.is_default_free,
          avatar_url: judge.avatar_url,
          description: judge.description,
          system_prompt: judge.system_prompt,
          is_active: judge.is_active,
        })),
        { onConflict: 'id' }
      );

    if (insertError) {
      console.warn('Unable to seed judges table, using fallback list.', insertError);
    }
  }

  return getLocalJudges();
}

async function fetchJudges() {
  const fallback = getLocalJudges();

  if (!supabaseServiceRole) return fallback;

  await seedJudgesIfEmpty();

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

  return data;
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
  seedJudgesIfEmpty,
  getLocalJudges,
};
