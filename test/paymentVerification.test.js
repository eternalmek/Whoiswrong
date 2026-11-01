const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyPurchaseSession } = require('../src/services/paymentVerification');
const paid = { metadata: { userId: 'buyer' }, status: 'complete', payment_status: 'paid' };

test('completed paid checkout belongs to its authenticated buyer', () => {
  assert.equal(verifyPurchaseSession(paid, 'buyer'), null);
});
test('a paid checkout cannot be claimed by another account', () => {
  assert.equal(verifyPurchaseSession(paid, 'other').status, 403);
});
test('legacy checkout with no account binding requires support', () => {
  assert.equal(verifyPurchaseSession({ ...paid, metadata: {} }, 'buyer').status, 403);
});
for (const payment_status of ['unpaid', 'no_payment_required', undefined]) {
  test(`checkout with payment status ${payment_status} does not grant access`, () => {
    assert.equal(verifyPurchaseSession({ ...paid, payment_status }, 'buyer').status, 409);
  });
}
for (const status of ['open', 'expired', undefined]) {
  test(`${status} checkout does not grant access`, () => {
    assert.equal(verifyPurchaseSession({ ...paid, status }, 'buyer').status, 409);
  });
}
