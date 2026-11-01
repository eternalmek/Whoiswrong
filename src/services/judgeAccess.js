// Check access before spending money on an AI response. Never trust client unlocks.
async function checkJudgeAccess({ judge, userId, database }) {
  if (judge.is_free === true || (judge.is_free == null && judge.is_default_free === true)) {
    return { allowed: true };
  }
  if (!userId) return { allowed: false, status: 401, error: 'Please log in to use a premium judge.' };
  if (!database) return { allowed: false, status: 503, error: 'Unable to verify judge access. Please try again.' };

  const [unlocks, subscriptions] = await Promise.all([
    database.from('judge_unlocks').select('judge_id').eq('user_id', userId).eq('judge_id', judge.id),
    database.from('subscriptions').select('status').eq('user_id', userId),
  ]);
  if (unlocks.error || subscriptions.error) {
    return { allowed: false, status: 503, error: 'Unable to verify judge access. Please try again.' };
  }
  if (unlocks.data?.length || subscriptions.data?.some((row) => row.status === 'active')) {
    return { allowed: true };
  }
  return { allowed: false, status: 403, error: 'Unlock this judge or subscribe to all judges to continue.' };
}

module.exports = { checkJudgeAccess };
