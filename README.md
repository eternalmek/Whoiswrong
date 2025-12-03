# Who Is Wrong? — Full Stack App (OpenAI + Supabase)

**The King of Petty** — A viral-ready, TikTok-friendly judgement API.

This repository provides a small Node.js backend that:

## Features

### Frontend
- **Modern, conversion-optimized landing page** with clear CTAs
- **AI Judge form** - Enter two options and get a decisive verdict
- **User authentication** - Sign up and login with email/password
- **Account management** - View profile, verdict history, and delete account
- **Social sharing** - Copy verdicts or share on Twitter
- **Responsive design** - Works on desktop and mobile

### Backend
- Accepts battles (context, optionA, optionB)
- Calls OpenAI to produce a **savage, decisive** JSON verdict { wrong, right, reason, roast }
- Never says "it depends" — always picks a side
- Roasts the loser with brutal, funny burns
- Persists the judgement to Supabase
- Provides authentication and lightweight account management
- Provides shareable receipt generation
- Provides funny loading messages for frontend

## Viral Features

✅ **Savage Mode** — AI roasts the loser ("You have the palate of a toddler")  
✅ **No Neutrality** — AI ALWAYS picks a side, even on 50/50 choices  
✅ **Short & Punchy** — 1-2 sentence responses max  
✅ **Receipt Generation** — Create shareable "receipt" images of verdicts  
✅ **Loading Messages** — Funny messages to show while waiting ("Reading the evidence...")  
✅ **Anonymous First** — No login required for judgements

## Files

- src/server.js — Express server & middleware
- src/routes/judge.js — POST /api/judge (savage AI verdicts)
- src/routes/history.js — GET /api/judgements
- src/routes/auth.js — auth + account endpoints
- src/routes/receipt.js — POST /api/receipt (generate shareable receipts)
- src/routes/loadingMessages.js — GET /api/loading-messages (funny loading messages)
- src/routes/checkout.js — POST /api/checkout (Stripe checkout sessions)
- src/routes/webhook.js — POST /api/webhook (Stripe webhook handler)
- src/openaiClient.js — wrapper that calls OpenAI and returns parsed JSON with roast
- src/supabaseClient.js — Supabase clients (service + anon)
- supabase/migrations/ — Database migrations for Supabase
- supabase/config.toml — Supabase local development configuration

## Setup

### Option 1: Local Development with Supabase CLI (Recommended)

This option runs Supabase locally using Docker, which is great for development.

**Prerequisites:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js 18+

**Steps:**

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start Supabase locally:
   ```bash
   npm run db:start
   ```
   
   This will output your local Supabase credentials. Copy the `API URL`, `anon key`, and `service_role key`.

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```
   
   Update with local Supabase values (from step 2):
   ```
   PORT=8080
   FRONTEND_ORIGIN=http://localhost:3000
   OPENAI_API_KEY=your_openai_key
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_BASE_URL=https://api.openai.com/v1
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=your_local_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

**Supabase CLI Commands:**

| Command | Description |
|---------|-------------|
| `npm run db:start` | Start local Supabase (includes Postgres, Auth, Storage) |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:status` | Check local Supabase status |
| `npm run db:reset` | Reset database and run all migrations |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:diff` | Generate migration from schema changes |
| `npm run db:push` | Push migrations to remote Supabase project |

### Option 2: Remote Supabase Project

Use this option if you prefer to connect to a hosted Supabase project.

1. Create a project at [supabase.com](https://supabase.com)

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Get your Supabase credentials:
   - Go to your Supabase project dashboard
   - Navigate to **Settings → API** in the left menu
   - Find and copy the following values:
   
   | Environment Variable | Where to Find |
   |---------------------|---------------|
   | `SUPABASE_URL` | **Project URL** section |
   | `SUPABASE_ANON_KEY` | **anon public** key under "Project API keys" |
   | `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key under "Project API keys" |

   > If your hosting platform restricts environment variable names ending with `_KEY`, you can set `SUPABASE_SERVICE_ROLE` instead; the server will use either name.

   > ⚠️ **Security Note**: The `service_role` key has elevated privileges. Never expose it in client-side code or commit it to version control!

4. Update your `.env` file with the values:
   ```
   OPENAI_API_KEY=your_openai_key
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_BASE_URL=https://api.openai.com/v1
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   FRONTEND_ORIGIN=http://localhost:3000
   ```

5. Install dependencies:
   ```bash
   npm install
   ```

6. Apply all database migrations to Supabase:
   - Run **all** SQL files in `supabase/migrations/` using the Supabase SQL editor (in order by filename):
     - `20240101000000_create_judgements.sql` - Core judgements table
     - `20240601000000_create_user_purchases.sql` - User purchases tracking
     - `20240701000000_add_judges_and_votes.sql` - Judges catalogue and votes
     - `20240901000000_account_friendships.sql` - User profiles and friendships
     - `20241013000000_update_judges_avatar.sql` - Judge avatar updates
     - `20241015000000_create_unlocked_judges_subscriptions.sql` - **Required for /api/purchases** (unlocked_judges and subscriptions tables)
   
   > ⚠️ **Important**: All migrations must be applied for the API to function correctly. Missing migrations will cause errors like "Could not find the table 'public.unlocked_judges' in the schema cache".

7. Start the server:
   ```bash
   npm start
   ```
   or for development:
   ```bash
   npm run dev
   ```

## API Endpoints

### Core Judgement

**POST /api/judge** — Get a savage verdict
```json
// Request
{ "context": "Pizza debate", "optionA": "Pineapple Pizza", "optionB": "Regular Pizza" }

// Response
{
  "ok": true,
  "judgement": {
    "wrong": "Pineapple Pizza",
    "right": "Regular Pizza",
    "reason": "Fruit on pizza is a crime against Italy.",
    "roast": "You have the palate of a toddler."
  }
}
```

### Shareable Receipts

**POST /api/receipt** — Generate receipt data for sharing
```json
// Request
{ "wrong": "Pineapple Pizza", "right": "Regular Pizza", "reason": "...", "roast": "..." }

// Response
{
  "ok": true,
  "receipt": {
    "store": "WHO IS WRONG?",
    "tagline": "THE KING OF PETTY",
    "orderNumber": "#123456",
    "date": "Dec 1, 2025",
    "items": [{ "name": "Pineapple Pizza", "description": "WRONG OPINION", "cost": "Your Dignity", "verdict": "RETURNED" }],
    "winner": "Regular Pizza",
    "total": "L + Ratio",
    "footer": "NO REFUNDS • NO APPEALS • FINAL VERDICT"
  }
}
```

### Loading Messages

**GET /api/loading-messages** — Get funny loading messages
```json
{ "ok": true, "messages": ["Reading the evidence...", "Consulting the petty council...", ...] }
```

**GET /api/loading-messages/random** — Get a single random message
```json
{ "ok": true, "message": "Warming up the gavel..." }
```

### History

**GET /api/judgements?limit=20&mine=true** — Get judgement history

### Auth (Optional)

- POST /api/auth/signup — body: { email, password }
- POST /api/auth/login — body: { email, password }
- GET /api/auth/me — headers: Authorization: Bearer <access_token>
- DELETE /api/auth/me — headers: Authorization: Bearer <access_token>

### Stripe Payments

**POST /api/checkout** — Create a Stripe checkout session
```json
// Request for single judge unlock
{ "mode": "single", "judgeId": "tech_billionaire" }

// Request for all judges subscription
{ "mode": "subscription" }

// Response
{ "url": "https://checkout.stripe.com/..." }
```

**POST /api/webhook** — Stripe webhook endpoint (called by Stripe, not for direct use)
- Handles `checkout.session.completed` for payment verification
- Handles `invoice.payment_succeeded` for subscription renewals
- Handles `customer.subscription.deleted` for subscription cancellations

## Stripe Configuration

To enable Stripe payments:

1. **Create a Stripe Account** at [stripe.com](https://stripe.com)

2. **Get API Keys:**
   - Go to Stripe Dashboard → Developers → API keys
   - Copy your secret key (`sk_...`) and publishable key (`pk_...`)

3. **Create Products and Prices:**
   - Go to Products in Stripe Dashboard
   - Create a product for "Single Judge Unlock" with a one-time price of $0.99 AUD
   - Create a product for "All Judges Subscription" with a recurring price of $3.99 AUD/month
   - Copy the price IDs (`price_...`)

4. **Set Up Webhook:**
   - Go to Developers → Webhooks
   - Add an endpoint with URL: `https://your-domain.com/api/webhook`
   - Select events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
   - Copy the signing secret (`whsec_...`)

5. **Configure Environment Variables:**
   ```
   STRIPE_SECRET_KEY=sk_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_PRICE_SINGLE_JUDGE=price_...
   STRIPE_PRICE_ALL_JUDGES=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_BASE_URL=https://your-domain.com
   ```

   > Tip: `NEXT_PUBLIC_BASE_URL` (and `FRONTEND_ORIGIN`) should point to the URL that hosts your checkout success page so Stripe can redirect back with the `session_id` query string attached.

## Deploying to Vercel

- Add the environment variables above to your Vercel project
- Make sure `FRONTEND_ORIGIN` matches your Vercel domain so CORS succeeds
- The API routes are prefixed with `/api/` for easy proxying

## Security Note

- Never expose your Supabase service_role key or OpenAI key in client code
- The service_role key grants elevated privileges; restrict it to server-side use only

## Frontend Integration Tips

For a viral TikTok experience, your frontend should:

1. **Play a gavel sound** when the verdict appears
2. **Show a giant "WRONG" stamp** slamming onto the screen
3. **Display loading messages** from the `/api/loading-messages` endpoint
4. **Generate receipt images** using the `/api/receipt` data
5. **Keep time-to-verdict under 10 seconds** — zero friction!
