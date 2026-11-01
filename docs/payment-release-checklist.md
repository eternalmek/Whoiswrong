# Payment release checks

The payment hardening changes are code-level safeguards, not proof that live billing works.

## Configuration

- Confirm the intended Vercel project, deployment commit, environment, and custom domain before release.
- Configure Stripe's signing secret directly in the hosting provider. Never commit or paste secret values into issues, logs, or documentation.
- Register `/api/stripe-webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid` (or `invoice.payment_succeeded`), `customer.subscription.updated`, and `customer.subscription.deleted`.
- Verify the database is running and required tables, constraints, RLS, and migrations are applied. A configured key does not prove availability.
- Set the frontend origin to the public website origin. Checkout falls back to the canonical production website rather than localhost.
- Confirm Stripe account verification, products, prices, currency, payment collection, and payout status in the actual merchant account. The public readiness endpoint checks presence of environment variables only.

## Test-mode customer journey

1. Log in with a test account; generate a free verdict.
2. Confirm a premium verdict is rejected before payment.
3. Start a one-time purchase and complete it using Stripe test mode.
4. Verify the return page confirms access only after server verification; retrying is idempotent.
5. Verify the purchased judge works while other paid judges remain locked.
6. Confirm a different account cannot reuse that checkout session.
7. Verify an unpaid, expired, or open session does not grant access.
8. Test all-access signup, renewal, payment failure, and cancellation. A replayed old success page must not reactivate a canceled subscription.
9. Simulate database failure during a signed webhook; confirm a non-2xx response causes Stripe to retry instead of losing the unlock silently.
10. Test a delayed payment method; no access before payment clears.
11. Check mobile layout and expired login behavior on both success URLs.

## Known boundaries

Legacy anonymous checkouts without buyer metadata require support reconciliation; the new flow deliberately does not allow arbitrary account claims. Free trials and zero-value checkout sessions are not currently fulfilled by the paid-session verification rule. Refund and dispute handling still require a defined access policy and implementation. These scenarios must be resolved before offering them as supported behavior.

The code test suite uses isolated Stripe/database doubles; it does not replace signed webhook delivery tests, browser testing, or checking real merchant account configuration.

Run tests with `node --test test/*.test.js`.
