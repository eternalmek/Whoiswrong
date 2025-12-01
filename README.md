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

2. Copy `.env.example` to `.env` and provide values for:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL` — from your Supabase project settings
   - `SUPABASE_ANON_KEY` — from your Supabase project settings
   - `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project settings
   - `FRONTEND_ORIGIN` (optional)
   - `PORT` (optional)

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create the table in Supabase:
   - Run the SQL in `supabase/migrations/20240101000000_create_judgements.sql` using Supabase SQL editor.

5. Start the server:
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
