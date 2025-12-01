# Who Is Wrong? — Backend (OpenAI + Supabase)

This repository provides a small Node.js backend that:

- Accepts battles (context, optionA, optionB)
- Calls OpenAI to produce a decisive JSON verdict { wrong, right, reason }
- Persists the judgement to Supabase
- Provides a simple history endpoint

Files:
- src/server.js — Express server & middleware
- src/routes/judge.js — POST /api/judge
- src/routes/history.js — GET /api/judgements
- src/openaiClient.js — wrapper that calls OpenAI and returns parsed JSON
- src/supabaseClient.js — Supabase client
- migrations/001_create_judgements.sql — SQL to create the judgements table

Setup
1. Copy `.env.example` to `.env` and provide values for:
   - OPENAI_API_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY (server-side only)
   - FRONTEND_ORIGIN (optional)
   - PORT (optional)

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

Frontend integration
- Replace the existing direct client-side OpenAI call with a call to your backend:
  POST /api/judge
  Body (JSON): { context, optionA, optionB }
  Response: { ok: true, judgement: { wrong, right, reason }, saved: {...} }

Example (fetch):
```
const response = await fetch('https://your-backend.example.com/api/judge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ context, optionA, optionB })
});
const payload = await response.json();
console.log(payload.judgement);
```

Security note
- Never expose your Supabase service_role key or OpenAI key in client code. Keep them only on the server.
- The service_role key grants elevated privileges; restrict it to server-side use only.

What's next
- Add authentication (associate user_id with judgements).
- Add more robust model fallback logic and monitoring for parse failures.
- If you want, I can adapt the backend to use OpenAI's newer Responses API or to return structured JSON via function-calling style (if you prefer strict schema enforcement).