# WhoIsWrong.io - Complete Setup Guide

This guide provides step-by-step instructions to set up and run the WhoIsWrong application, including all external dependencies.

## ✅ What Works Out of the Box

The application is designed to work in stages, allowing you to test basic functionality before configuring external services:

- ✅ **Server starts successfully** (even without API keys)
- ✅ **Frontend loads and displays correctly**
- ✅ **Basic API endpoints work** (`/health`, `/api`, `/api/judges`, `/api/loading-messages`)
- ✅ **Judge selection UI works** with local fallback data
- ✅ **Error handling works** when API keys are missing

## 🚀 Quick Start (Minimal Setup)

### Prerequisites
- Node.js 18 or higher
- npm (comes with Node.js)

### Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Start the server:**
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:8080`

**Note:** Without API keys, you can browse the UI and test the interface, but verdict generation will fail with "Internal Server Error" (expected behavior).

---

## 🔑 Required Configuration for Full Functionality

### 1. OpenAI API Key (REQUIRED for Core Feature)

The AI verdict generation requires an OpenAI API key.

#### Steps:
1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Navigate to API keys section
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)
5. Add to your `.env` file:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_BASE_URL=https://api.openai.com/v1
   ```
6. Restart the server

**Cost:** OpenAI charges per token. The `gpt-4o-mini` model is very affordable (~$0.15 per 1M input tokens).

#### Testing:
```bash
curl -X POST http://localhost:8080/api/judge \
  -H "Content-Type: application/json" \
  -d '{"context":"Test","optionA":"Cats","optionB":"Dogs"}'
```

Expected response:
```json
{
  "ok": true,
  "judgement": {
    "wrong": "Dogs",
    "right": "Cats",
    "reason": "...",
    "roast": "..."
  }
}
```

---

## 📦 Optional Configuration

### 2. Supabase (for Persistence & Auth)

Supabase provides database, authentication, and social features.

#### Option A: Local Supabase (Recommended for Development)

**Prerequisites:**
- Docker Desktop installed and running

**Steps:**
1. Start local Supabase:
   ```bash
   npm run db:start
   ```

2. Copy the credentials shown in the output to your `.env`:
   ```env
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

3. Restart the server

**Other commands:**
```bash
npm run db:stop     # Stop Supabase
npm run db:status   # Check status
npm run db:reset    # Reset database and re-run migrations
```

#### Option B: Supabase Cloud (For Production)

**Steps:**
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Navigate to **Settings → API**
4. Copy these values to your `.env`:
   ```env
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

5. **Run database migrations:**
   - Open the SQL editor in Supabase dashboard
   - Run each migration file from `supabase/migrations/` in order:
     1. `20240101000000_create_judgements.sql`
     2. `20240601000000_create_user_purchases.sql`
     3. `20240701000000_add_judges_and_votes.sql`
     4. `20240901000000_account_friendships.sql`
     5. `20241013000000_update_judges_avatar.sql`
     6. `20241015000000_create_unlocked_judges_subscriptions.sql`

6. Restart the server

#### Features Enabled with Supabase:
- ✅ User authentication (sign up, login)
- ✅ Verdict history persistence
- ✅ Public debate feed
- ✅ Social features (likes, comments, voting)
- ✅ Judge purchases tracking

#### Testing:
```bash
# Test judge endpoint (should return data from database)
curl http://localhost:8080/api/judges | jq '.judges[] | {name, is_free}'

# Test signup
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

### 3. Stripe (for Payment Features)

Stripe enables users to unlock premium judges.

#### Steps:

1. **Sign up at [stripe.com](https://stripe.com)**

2. **Get API keys:**
   - Navigate to **Developers → API keys**
   - Copy **Secret key** (starts with `sk_...`)
   - Copy **Publishable key** (starts with `pk_...`)

3. **Create products:**
   - Go to **Products** in dashboard
   - Create "Single Judge Unlock": $0.99 AUD, one-time payment
   - Create "All Judges Subscription": $3.99 AUD/month, recurring
   - Copy the **price IDs** (start with `price_...`)

4. **Set up webhook:**
   - Go to **Developers → Webhooks**
   - Add endpoint URL: `https://your-domain.com/api/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `customer.subscription.deleted`
   - Copy the **Signing secret** (starts with `whsec_...`)

5. **Add to `.env`:**
   ```env
   STRIPE_SECRET_KEY=sk_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_PRICE_SINGLE_JUDGE=price_...
   STRIPE_PRICE_ALL_JUDGES=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_BASE_URL=http://localhost:8080
   ```

6. Restart the server

#### Features Enabled with Stripe:
- ✅ Unlock individual celebrity judges ($0.99)
- ✅ Subscribe to unlock all judges ($3.99/month)
- ✅ Payment processing and webhooks
- ✅ Purchase history tracking

#### Testing:
```bash
# Test prices endpoint
curl http://localhost:8080/api/prices | jq .

# Test checkout creation (requires login)
curl -X POST http://localhost:8080/api/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"mode":"single","celebrityId":"elon_musk"}'
```

**Testing payments:** Use Stripe test card `4242 4242 4242 4242` with any future expiry and any CVC.

---

## 🌐 Deployment

### Vercel (Recommended)

The application is optimized for Vercel deployment with serverless functions.

**Steps:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

**Important:** Set `FRONTEND_ORIGIN` to your Vercel domain for CORS:
```env
FRONTEND_ORIGIN=https://your-app.vercel.app
```

### Other Platforms

The application can run on any Node.js hosting platform:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS (with Express server)

**Note:** Make sure to:
- Set `PORT` environment variable (platform-specific)
- Configure `FRONTEND_ORIGIN` for CORS
- Set up Stripe webhook endpoint correctly

---

## 🧪 Testing the Integration

### Backend API Tests
```bash
# Health check
curl http://localhost:8080/health

# API documentation
curl http://localhost:8080/api

# Loading messages
curl http://localhost:8080/api/loading-messages/random

# Judges list
curl http://localhost:8080/api/judges

# Submit verdict (requires OpenAI key)
curl -X POST http://localhost:8080/api/judge \
  -H "Content-Type: application/json" \
  -d '{"context":"Test debate","optionA":"Option A","optionB":"Option B"}'
```

### Frontend Tests
1. Open `http://localhost:8080` in browser
2. Fill in debate form
3. Select a judge
4. Click "Judge Now"
5. Verify verdict displays (if OpenAI configured) or error shows (if not)

---

## 🐛 Troubleshooting

### "OpenAI API key is not configured"
- Add `OPENAI_API_KEY` to `.env`
- Restart server

### "Supabase service role not configured"
- This is a warning, not an error
- App works with local judge data as fallback
- Configure Supabase to enable full features

### Judges endpoint returns error
- Fixed in latest version with fallback to local data
- If still fails, check `src/routes/judges.js` has fallback logic

### Port 8080 already in use
- Change port in `.env`: `PORT=3000`
- Or kill process using port 8080

### Stripe webhook not working locally
- Use Stripe CLI for local testing:
  ```bash
  stripe listen --forward-to localhost:8080/api/stripe-webhook
  ```

---

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

## 🆘 Getting Help

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure external services (OpenAI, Supabase, Stripe) are properly configured
4. Check the browser console for frontend errors

---

## 📝 Summary of Environment Variables

```env
# Server
PORT=8080
FRONTEND_ORIGIN=http://localhost:8080

# OpenAI (REQUIRED for core functionality)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1

# Supabase (OPTIONAL - for persistence and auth)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (OPTIONAL - for payments)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_SINGLE_JUDGE=
STRIPE_PRICE_ALL_JUDGES=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:8080
```

## ✅ Integration Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] Server starts without crashing
- [ ] Frontend loads at `http://localhost:8080`
- [ ] Judge selection UI displays judges
- [ ] Form accepts input
- [ ] Error handling works when OpenAI key missing
- [ ] (If OpenAI configured) Verdicts generate successfully
- [ ] (If Supabase configured) Database operations work
- [ ] (If Stripe configured) Payment flow works
