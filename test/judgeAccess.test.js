const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkJudgeAccess } = require('../src/services/judgeAccess');

function database(results) {
  return { from(table) {
    const query = { select() { return query; }, eq() { return query; },
      then(resolve, reject) { return Promise.resolve(results[table]).then(resolve, reject); } };
    return query;
  } };
}

test('free judges work without login or database', async () => {
  assert.equal((await checkJudgeAccess({ judge: { is_free: true } })).allowed, true);
});
test('premium judges reject anonymous requests', async () => {
  assert.equal((await checkJudgeAccess({ judge: { is_free: false } })).status, 401);
});
for (const status of ['canceled', 'past_due', 'unpaid', 'incomplete']) {
  test(`${status} subscription does not unlock premium judges`, async () => {
    const result = await checkJudgeAccess({ judge: { id: 'premium', is_free: false }, userId: 'buyer',
      database: database({ judge_unlocks: { data: [] }, subscriptions: { data: [{ status }] } }) });
    assert.equal(result.status, 403);
  });
}
test('single purchase unlocks the purchased judge', async () => {
  assert.equal((await checkJudgeAccess({ judge: { id: 'premium' }, userId: 'buyer',
    database: database({ judge_unlocks: { data: [{ judge_id: 'premium' }] }, subscriptions: { data: [] } }) })).allowed, true);
});
test('active subscription unlocks premium judges', async () => {
  assert.equal((await checkJudgeAccess({ judge: { id: 'premium' }, userId: 'buyer',
    database: database({ judge_unlocks: { data: [] }, subscriptions: { data: [{ status: 'active' }] } }) })).allowed, true);
});
test('database errors do not grant free premium access', async () => {
  assert.equal((await checkJudgeAccess({ judge: { id: 'premium' }, userId: 'buyer',
    database: database({ judge_unlocks: { error: { message: 'offline' } }, subscriptions: { data: [] } }) })).status, 503);
});
