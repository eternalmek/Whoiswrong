// Only Stripe's server response can establish payment ownership and completion.
function verifyPurchaseSession(session, userId) {
  if (!session.metadata?.userId || session.metadata.userId !== userId) {
    return { status: 403, error: 'This checkout belongs to a different account or requires support to link.' };
  }
  if (session.status !== 'complete' || session.payment_status !== 'paid') {
    return { status: 409, error: 'Payment is not confirmed yet. Please retry after payment completes.' };
  }
  return null;
}

module.exports = { verifyPurchaseSession };
