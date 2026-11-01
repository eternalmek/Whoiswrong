const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/purchase-success.js'), 'utf8');

async function render({ search = '', token, result = { ok: true }, ok = true } = {}) {
  const elements = {};
  const storage = new Map(token ? [['accessToken', token]] : []);
  let calls = 0;
  vm.runInNewContext(source, {
    window: { location: { search } }, URLSearchParams,
    document: { getElementById(id) { return elements[id] ||= { hidden: true, addEventListener() {} }; } },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    fetch: async () => { calls++; return { ok, json: async () => result }; },
  });
  await new Promise(setImmediate);
  return { elements, storage, calls };
}
test('opening success page directly never confirms payment', async () => {
  const page = await render();
  assert.equal(page.calls, 0);
  assert.equal(page.elements.purchaseTitle.textContent, 'Purchase reference missing');
});
test('verification failure shows retry without granting local access', async () => {
  const page = await render({ search: '?mode=single&judgeId=paid&session_id=cs_test', token: 'test', ok: false, result: { error: 'Payment pending' } });
  assert.equal(page.elements.retryPurchase.hidden, false);
  assert.equal(page.elements.purchaseStatus.textContent, 'Payment pending');
  assert.equal(page.storage.has('unlockedJudgeIds'), false);
  assert.equal(page.storage.has('hasAllJudgeAccess'), false);
  assert.equal(page.storage.has('pendingPurchase'), true);
});
test('only server-verified purchase displays confirmation', async () => {
  const page = await render({ search: '?mode=subscription&session_id=cs_test', token: 'test' });
  assert.equal(page.elements.purchaseTitle.textContent, 'Your purchase is confirmed');
  assert.equal(page.storage.has('pendingPurchase'), false);
});
