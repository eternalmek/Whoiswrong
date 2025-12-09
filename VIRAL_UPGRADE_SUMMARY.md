# Viral Upgrade Implementation Summary

## Overview
This upgrade transforms whoiswrong.io into a viral, social-first platform while maintaining the simple, clean UX. All changes follow the existing architecture and coding patterns.

## What's New

### 🎭 Judges System
- **Source of Truth**: Now uses `src/data/newJudges.js` with 20 celebrity judges
- **3 FREE Judges**: AI Judge, Elon Musk, Taylor Swift
- **17 PAID Judges**: $0.99 each including Cristiano Ronaldo, MrBeast, Gordon Ramsay, and more
- **Priority Ordering**: Judges displayed in viral-friendly order (most TikTok-ready first)
- **Visual Indicators**: Clear FREE/PREMIUM labels on judge cards
- **Dual Unlock System**: Uses new `judge_unlocks` table with backwards compatibility

### 🚀 Viral Sharing Features
- **Enhanced Share Function**: One function handles all platforms
- **Platform Support**:
  - **TikTok**: Copies text + link, opens upload page
  - **X (Twitter)**: Pre-filled tweet with verdict
  - **Instagram**: Opens story camera with link copied
  - **WhatsApp**: Direct share on mobile, web fallback on desktop
  - **Copy Link**: Always available as fallback
- **TikTok-Ready Hooks**: Auto-generates catchy one-liners
- **Share Event Logging**: Best-effort tracking (won't break UX if it fails)

### 📊 New Backend Routes

#### Share Events (`/api/share-events`)
- **POST** - Log share events to track viral growth
- Best-effort logging (failures are silent)
- Tracks: user_id, debate_id, platform, timestamp

#### Referrals (`/api/referrals/*`)
- **POST `/create`** - Generate unique referral code for user
- **POST `/use`** - Track when someone uses a referral code
- **GET `/stats`** - Get referral stats (code, uses count, recent uses)
- Auto-increments usage counter
- Prevents self-referrals

#### Notifications (`/api/notifications`)
- **GET** - Fetch user notifications with pagination
- **POST `/mark-read`** - Mark notifications as read
- **DELETE `/:id`** - Delete a notification
- Supports: friend requests, likes, comments, system messages

#### Analytics (`/api/analytics/event`)
- **POST** - Log generic events (judge selected, verdict shared, etc.)
- Best-effort logging with graceful failure
- Captures: event_type, event_data, IP, user agent

### 🗄️ New Database Tables (Migration 007)

#### `share_events`
Tracks social media shares for viral analytics
```sql
- id: uuid (primary key)
- user_id: uuid (nullable, tracks logged-in shares)
- debate_id: uuid (nullable, links to debate)
- platform: text (tiktok, x, instagram, whatsapp, copy_link, native)
- created_at: timestamptz
```

#### `referral_codes`
User-specific referral codes for growth
```sql
- id: uuid (primary key)
- user_id: uuid (unique per user)
- code: text (unique, 8-char uppercase)
- uses_count: int (auto-incremented)
- created_at: timestamptz
```

#### `referral_uses`
Tracks referral code usage
```sql
- id: uuid (primary key)
- referral_code_id: uuid
- referred_user_id: uuid (nullable)
- ip_address: text
- user_agent: text
- created_at: timestamptz
```

#### `analytics_events`
Generic event tracking
```sql
- id: uuid (primary key)
- user_id: uuid (nullable)
- event_type: text (e.g., 'judge_selected', 'verdict_shared')
- event_data: jsonb (flexible event metadata)
- ip_address: text
- user_agent: text
- created_at: timestamptz
```

#### `notifications`
User notifications system
```sql
- id: uuid (primary key)
- user_id: uuid
- type: text (friend_request, friend_accept, like, comment, system)
- title: text
- message: text (nullable)
- link_url: text (nullable)
- is_read: boolean (default false)
- metadata: jsonb
- created_at: timestamptz
```

#### `data_export_requests`
GDPR compliance for data exports
```sql
- id: uuid (primary key)
- user_id: uuid
- status: text (pending, processing, completed, failed)
- export_url: text (nullable)
- created_at: timestamptz
- completed_at: timestamptz (nullable)
```

## Architecture Decisions

### Best-Effort Logging
Share events and analytics use a "best-effort" approach:
- Failures are logged to console but don't break UX
- Always returns success to frontend
- Prevents tracking from disrupting user experience

### Backwards Compatibility
The stripe webhook handler maintains dual-table writes:
- New purchases go to `judge_unlocks` table
- Legacy `unlocked_judges` table also updated
- Ensures no data loss during transition

### Environment Variables
All configuration uses env vars (no hardcoded values):
- `STRIPE_PRICE_SINGLE_JUDGE` - One-time judge unlock price
- `STRIPE_PRICE_ALL_JUDGES` - All-access subscription price
- `IMAGE_GENERATION_PROVIDER` - AI image provider (OPENAI/STABILITY)
- `IMAGE_GENERATION_API_KEY` - API key for avatar generation

### Mobile-First Sharing
Share functions detect mobile devices and optimize behavior:
- WhatsApp: `whatsapp://` on mobile, web fallback on desktop
- Instagram: Tries native app first, falls back to web
- TikTok: Copies text for easy pasting in captions

## Files Changed

### Backend
- `src/server.js` - Added new route registrations
- `src/services/judges.js` - Uses newJudges.js, improved UUID handling
- `src/routes/stripeWebhook.js` - Dual-table unlock writes
- `src/routes/shareEvents.js` - NEW: Share event logging
- `src/routes/referrals.js` - NEW: Referral code management
- `src/routes/notifications.js` - NEW: User notifications
- `src/routes/analytics.js` - NEW: Event tracking

### Frontend
- `public/app.js` - Enhanced sharing, updated judge priority
- `public/index.html` - Added WhatsApp share button

### Database
- `migrations/007_viral_features.sql` - NEW: All new tables with RLS policies

## Testing Checklist

### Judges System
- [ ] Verify 3 free judges appear first
- [ ] Check paid judges show correct price ($0.99)
- [ ] Test judge unlock flow (single purchase)
- [ ] Test "unlock all" subscription
- [ ] Verify judge avatars load correctly

### Sharing
- [ ] Share to X (Twitter) - pre-filled text
- [ ] Share to TikTok - text copied, upload page opens
- [ ] Share to Instagram - link copied, story camera opens
- [ ] Share to WhatsApp - direct message on mobile
- [ ] Copy link - clipboard works
- [ ] Verify share events logged (check database)

### Referrals
- [ ] Create referral code for user
- [ ] Use referral code as new user
- [ ] Verify usage count increments
- [ ] Check self-referral prevention
- [ ] View referral stats

### Notifications
- [ ] Create notification programmatically
- [ ] Fetch notifications via API
- [ ] Mark notification as read
- [ ] Delete notification

### Analytics
- [ ] Log custom event via API
- [ ] Verify event appears in database
- [ ] Check graceful failure on DB error

## Migration Instructions

### 1. Update Environment Variables
Ensure all required variables are set in `.env`:
```bash
# Existing vars (verify they're still set)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_PRICE_SINGLE_JUDGE=...
STRIPE_PRICE_ALL_JUDGES=...

# Optional: For avatar generation
IMAGE_GENERATION_PROVIDER=OPENAI
IMAGE_GENERATION_API_KEY=...
```

### 2. Run Database Migration
Apply the new migration to add tables:

**Option A: Supabase CLI**
```bash
cd /path/to/Whoiswrong
supabase db push
```

**Option B: SQL Editor (Manual)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `migrations/007_viral_features.sql`
3. Paste and run in SQL editor

### 3. Reset Judges Data (Optional)
If you want to reset to the new judge list:
```bash
node src/scripts/resetJudges.js
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

### 6. Verify Everything Works
- Visit http://localhost:8080
- Test judge selection (free and paid)
- Try sharing a verdict
- Check browser console for errors

## Rollback Plan

If issues arise, you can rollback:

### 1. Revert Code
```bash
git revert HEAD~3  # Revert last 3 commits
```

### 2. Drop New Tables (If Needed)
```sql
DROP TABLE IF EXISTS public.share_events CASCADE;
DROP TABLE IF EXISTS public.referral_uses CASCADE;
DROP TABLE IF EXISTS public.referral_codes CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.data_export_requests CASCADE;
```

Note: The `judge_unlocks` table from migration 005 should NOT be dropped as it may contain user purchase data.

## Security Summary

✅ **CodeQL Analysis**: No vulnerabilities detected
✅ **Row Level Security**: All new tables have RLS policies
✅ **Input Validation**: All routes validate user input
✅ **Environment Variables**: No secrets in code
✅ **SQL Injection**: Parameterized queries throughout
✅ **GDPR Compliance**: data_export_requests table added

## Performance Considerations

### Optimizations
- Best-effort logging prevents blocking on analytics
- Efficient collision detection for referral codes
- Indexed columns for fast queries (user_id, debate_id, etc.)
- Single-record inserts (no unnecessary arrays)

### Database Indexes
All new tables include indexes on:
- Foreign keys (user_id, debate_id, etc.)
- Frequently queried fields (platform, event_type, is_read)
- Timestamp columns for date-range queries

## Future Enhancements

These features have backend support but no UI yet:
- [ ] Referral code display in account page
- [ ] Notification center UI
- [ ] Analytics dashboard for admins
- [ ] Data export UI (GDPR)
- [ ] Share event analytics view

The backend is ready - just add UI when needed!

## Support

If you encounter issues:
1. Check server logs for errors
2. Verify all environment variables are set
3. Ensure database migration ran successfully
4. Test API endpoints with curl/Postman
5. Check browser console for frontend errors

For questions or issues, refer to:
- `README_UPGRADE.md` - Original upgrade specification
- `SETUP_GUIDE.md` - Environment setup
- Supabase logs - Database queries and errors
- Server logs - Backend API errors
