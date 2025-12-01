# Who Is Wrong? — Full Stack App (OpenAI + Supabase)

The AI Judge that always picks a side! Settle any debate with AI-powered judgement.

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
- Calls OpenAI GPT-4 to produce a decisive JSON verdict { wrong, right, reason }
- Persists the judgement to Supabase
- Provides authentication and account management
- Provides a history endpoint (with optional user scoping)

## Files Structure

```
├── public/                    # Frontend static files
│   ├── index.html            # Main landing page
│   ├── account.html          # Account management page
│   └── app.js                # Frontend JavaScript
├── src/
│   ├── server.js             # Express server & middleware
│   ├── routes/
│   │   ├── judge.js          # POST /api/judge
│   │   ├── history.js        # GET /api/judgements
│   │   └── auth.js           # Auth + account endpoints
│   ├── middleware/
│   │   └── auth.js           # Auth middleware
│   ├── openaiClient.js       # OpenAI wrapper
│   └── supabaseClient.js     # Supabase clients
├── api/
│   └── index.js              # Vercel serverless entry
├── migrations/
│   └── 001_create_judgements.sql
└── vercel.json               # Vercel deployment config
```

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

5. Open http://localhost:8080 in your browser

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/judge` | POST | Submit a battle for judgement |
| `/api/judgements` | GET | Get judgement history |
| `/api/auth/signup` | POST | Create a new account |
| `/api/auth/login` | POST | Log in to existing account |
| `/api/auth/me` | GET | Get current user info |
| `/api/auth/me` | DELETE | Delete current user account |
| `/health` | GET | Health check endpoint |

## Deploying to Vercel

1. Add the environment variables to your Vercel project:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_ORIGIN` (set to your Vercel domain)

2. Deploy with `vercel deploy`

## Security Notes

- Never expose your Supabase service_role key or OpenAI key in client code
- The service_role key grants elevated privileges; restrict it to server-side use only
- All API calls from the frontend go through the backend, keeping keys secure

## License

MIT