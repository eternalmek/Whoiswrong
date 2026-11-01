const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { verifyPurchaseSession } = require('../src/services/paymentVerification');

function loadRoute(filename, { env = {}, stripe = {}, database = null } = {}) {
  const routes = [];
  const requireUser = () => {};
  const router = { post: (route, ...handlers) => routes.push({ route, handlers }), get() {} };
  const modules = {
    express: { Router: () => router, raw: () => () => {} },
    stripe: function () { return stripe; },
    '../middleware/auth': { requireUser },
    '../supabaseClient': { supabaseServiceRole: database },
    '../services/judges': { fetchJudges: async () => [{ id: 'paid-judge', slug: 'paid', is_free: false }], resolveJudgeId: async () => 'resolved-uuid' },
    '../services/paymentVerification': { verifyPurchaseSession },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/routes', filename), 'utf8'), {
    require(name) { assert.ok(name in modules, name); return modules[name]; },
    module: { exports: {} }, process: { env }, URL, URLSearchParams,
    console: { log() {}, warn() {}, error() {} },
  });
  return { routes, requireUser };
}
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const env = { STRIPE_SECRET_KEY: 'test-only', STRIPE_WEBHOOK_SECRET: 'test-only',
  STRIPE_PRICE_SINGLE_JUDGE: 'price_single', STRIPE_PRICE_ALL_JUDGES: 'price_all' };

test('checkout requires authenticated middleware and stops when webhook is missing', async () => {
  let charged = false;
  const loaded = loadRoute('checkout.js', { env: { STRIPE_SECRET_KEY: 'test-only' },
    stripe: { checkout: { sessions: { create: async () => { charged = true; } } } } });
  const route = loaded.routes[0];
  assert.equal(route.handlers[0], loaded.requireUser);
  const res = response();
  await route.handlers.at(-1)({ body: { mode: 'subscription' }, auth: { user: { id: 'buyer' } } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(charged, false);
});
test('checkout uses the public origin and binds subscription metadata to buyer', async () => {
  let config;
  const { routes } = loadRoute('checkout.js', { env,
    stripe: { checkout: { sessions: { create: async (value) => { config = value; return { url: 'https://checkout.stripe.com/test' }; } } } } });
  const res = response();
  await routes[0].handlers.at(-1)({ body: { mode: 'subscription' }, auth: { user: { id: 'buyer' } } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(config.subscription_data.metadata.userId, 'buyer');
  assert.equal(config.success_url, 'https://www.whoiswrong.io/success?mode=subscription&session_id={CHECKOUT_SESSION_ID}');
});
for (const [name, session, expected] of [
  ['unpaid checkout', { metadata: { userId: 'buyer' }, status: 'complete', payment_status: 'unpaid' }, 409],
  ['another buyer', { metadata: { userId: 'other' }, status: 'complete', payment_status: 'paid' }, 403],
]) {
  test(`purchase save rejects ${name} before writing to database`, async () => {
    const { routes } = loadRoute('purchases.js', { env,
      database: { from() { assert.fail('must not access purchase database'); } },
      stripe: { checkout: { sessions: { retrieve: async () => session } } } });
    const res = response();
    await routes[0].handlers.at(-1)({ auth: { user: { id: 'buyer' } }, body: { mode: 'single', judgeId: 'paid', stripeSessionId: 'cs_test' } }, res, assert.fail);
    assert.equal(res.statusCode, expected);
  });
}
test('webhook retries database failures instead of acknowledging lost purchases', async () => {
  const session = { status: 'complete', payment_status: 'paid', metadata: { userId: 'buyer', mode: 'single', celebrityId: 'paid' } };
  const { routes } = loadRoute('stripeWebhook.js', { env,
    stripe: { webhooks: { constructEvent: () => ({ type: 'checkout.session.completed', data: { object: session } }) } },
    database: { from() { throw new Error('database offline'); } } });
  const res = response();
  await routes[0].handlers.at(-1)({ headers: { 'stripe-signature': 'test' }, body: Buffer.from('{}') }, res);
  assert.equal(res.statusCode, 500);
});
test('unpaid delayed-payment webhook grants no access', async () => {
  const { routes } = loadRoute('stripeWebhook.js', { env,
    stripe: { webhooks: { constructEvent: () => ({ type: 'checkout.session.completed', data: { object: { payment_status: 'unpaid' } } }) } },
    database: { from() { assert.fail('must not grant access'); } } });
  const res = response();
  await routes[0].handlers.at(-1)({ headers: { 'stripe-signature': 'test' }, body: Buffer.from('{}') }, res);
  assert.equal(res.statusCode, 200);
});
