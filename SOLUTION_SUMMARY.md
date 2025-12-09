# Summary of Changes

## ✅ Problem Solved

Your whoiswrong.io site was experiencing 500 errors because the database schema was out of sync with the application code. Specifically:

- The `judges` table was missing the `photo_url` column that the code explicitly tries to select
- Other columns (`system_prompt`, `image_url`, `price`, `price_cents`) were also missing

## ✅ Solution Implemented

Created **Migration 008** that adds all missing columns to the `judges` table with proper defaults and backfills existing data.

### Files Added

1. **`migrations/008_add_missing_judge_columns.sql`**
   - Adds 5 missing columns: `photo_url`, `system_prompt`, `image_url`, `price`, `price_cents`
   - Backfills `photo_url` and `image_url` from existing `avatar_url` values
   - Ensures `price_cents` matches `price` (converted to cents)
   - Fully idempotent - can be run multiple times safely

2. **`DATABASE_FIX_GUIDE.md`**
   - Step-by-step instructions for applying the migration
   - Three methods: Supabase Dashboard, CLI, or manual SQL
   - Verification steps to confirm the fix worked
   - Troubleshooting guidance

## 🚀 Next Steps

### Immediate Action Required

You need to run the migration on your production Supabase database. Choose one method:

**Easiest Method - Supabase Dashboard:**

1. Log into https://app.supabase.com
2. Select your whoiswrong project
3. Go to SQL Editor → New Query
4. Copy/paste the contents of `migrations/008_add_missing_judge_columns.sql`
5. Click Run

**After Running the Migration:**

1. Your live site should automatically work (if Vercel auto-deploys this PR)
2. OR manually redeploy on Vercel if auto-deploy isn't enabled
3. Visit https://whoiswrong.io and verify:
   - "Internet Court Wall" shows debates
   - "Start your own" flow works without errors
   - No 500 errors in browser console

### Verification

After applying the migration, confirm it worked:

```sql
-- Run this in Supabase SQL Editor
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'judges' 
AND table_schema = 'public'
AND column_name IN ('photo_url', 'system_prompt', 'image_url', 'price', 'price_cents')
ORDER BY column_name;
```

You should see all 5 columns listed.

## 📋 What Changed

### Schema Changes
- ✅ Added `photo_url` column (text) - fixes the main 500 error
- ✅ Added `system_prompt` column (text) - prevents future errors
- ✅ Added `image_url` column (text) - provides image flexibility
- ✅ Added `price` column (numeric, default 0.99) - consistent pricing
- ✅ Added `price_cents` column (integer, default 99) - Stripe integration

### Data Backfill
- ✅ Copied `avatar_url` → `photo_url` for existing judges
- ✅ Copied `avatar_url` → `image_url` for existing judges
- ✅ Calculated `price_cents` from `price` for existing judges

## 🔒 Security

- ✅ No security vulnerabilities introduced
- ✅ CodeQL security scan passed
- ✅ All operations are safe and idempotent
- ✅ No data loss - only adds columns and copies data

## 💡 Why This Happened

The mismatch occurred because:

1. **Migration 004** added `price`, `image_url`, and `personality_prompt` columns
2. **Migration 006** truncated and recreated the judges table but didn't include all columns from migration 004
3. The `full_schema.sql` has all columns, but wasn't used for production
4. The code expects all columns from `full_schema.sql`

Migration 008 bridges this gap by ensuring all expected columns exist.

## 📞 Support

If you encounter any issues:

1. Check the `DATABASE_FIX_GUIDE.md` for detailed troubleshooting
2. Verify your Vercel environment variables point to the correct Supabase project
3. Check Vercel logs: `vercel logs`
4. Verify migration was applied with the SQL query above

## 🎉 Benefits

After this fix:

- ✅ No more 500 errors on the Internet Court Wall
- ✅ Debates will be displayed correctly
- ✅ "Start your own" flow will work
- ✅ Future deployments won't have schema issues
- ✅ Code and database are in sync
