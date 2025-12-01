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
- migrations/001_create_judgements.sql — SQL to create the judgements table

## Setup

1. Copy `.env.example` to `.env` and provide values for:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (for auth/login)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
   - `FRONTEND_ORIGIN` (optional)
   - `PORT` (optional)

2. Install dependencies:
   ```
   npm install
   ```

3. Create the table in Supabase:
   - Run the SQL in `migrations/001_create_judgements.sql` using Supabase SQL editor.

4. Start the server:
   ```
   npm start
   ```
   or for development:
   ```
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
