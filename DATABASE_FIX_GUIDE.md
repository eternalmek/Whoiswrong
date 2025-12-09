# Database Schema Fix - Implementation Guide

## Problem Summary

The live site at whoiswrong.io was experiencing 500 errors because the database schema was missing columns that the application code expected:

1. **Missing `photo_url` column** - The code in `src/services/judges.js` (line 133) explicitly selects `photo_url` from the judges table, but migration 006 only created an `avatar_url` column
2. **Missing `system_prompt` column** - Used as a fallback for `personality_prompt` (line 312)
3. **Missing `image_url` column** - Used for additional image source flexibility
4. **Missing price-related columns** - `price` and `price_cents` needed for proper pricing calculations

## Solution Implemented

Created **Migration 008** (`migrations/008_add_missing_judge_columns.sql`) that:

✅ Adds missing columns to the `judges` table:
- `photo_url` (text)
- `system_prompt` (text)
- `image_url` (text)
- `price` (numeric, default 0.99)
- `price_cents` (integer, default 99)

✅ Backfills data from existing columns:
- Populates `photo_url` from `avatar_url`
- Populates `image_url` from `avatar_url`
- Ensures `price_cents` matches `price` (converted to cents)

✅ All operations use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for idempotency

## How to Apply the Fix

### Option 1: Via Supabase Dashboard (Recommended)

1. Log into your Supabase dashboard at [app.supabase.com](https://app.supabase.com)
2. Select your project (whoiswrong.io)
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `migrations/008_add_missing_judge_columns.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl/Cmd + Enter)
8. Verify success - you should see "Success. No rows returned"

### Option 2: Via Supabase CLI (Local/Remote)

If you have the Supabase CLI installed and configured:

```bash
# For remote project
npx supabase db push

# OR run the specific migration
npx supabase migration up
```

### Option 3: Manual SQL Execution

If you prefer to run SQL manually, execute these commands in order:

```sql
-- Add missing columns
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS system_prompt text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0.99;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS price_cents integer DEFAULT 99;

-- Backfill data
UPDATE public.judges SET photo_url = avatar_url WHERE photo_url IS NULL AND avatar_url IS NOT NULL;
UPDATE public.judges SET image_url = avatar_url WHERE image_url IS NULL AND avatar_url IS NOT NULL;
UPDATE public.judges SET price_cents = ROUND(price * 100)::integer WHERE price IS NOT NULL;
```

## Verification Steps

After running the migration, verify the fix:

1. **Check the columns exist:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'judges' 
AND table_schema = 'public'
ORDER BY column_name;
```

You should see: `photo_url`, `system_prompt`, `image_url`, `price`, `price_cents`, etc.

2. **Check data was backfilled:**
```sql
SELECT name, avatar_url, photo_url, image_url, price, price_cents
FROM public.judges 
LIMIT 5;
```

You should see `photo_url` and `image_url` populated with the same values as `avatar_url`, and `price_cents` should be `price * 100`.

## Testing the Fix

After applying the migration:

1. **Restart your Vercel deployment** (or wait for auto-deploy from this PR)
2. Visit https://whoiswrong.io
3. Navigate to the "Internet Court Wall" - debates should now be displayed
4. Try the "Start your own" flow - should work without 500 errors
5. Check browser console and network tab - should see no errors

## Environment Variable Check

As mentioned in the problem statement, ensure your Vercel environment variables point to the correct Supabase project:

1. Go to your Vercel dashboard
2. Select the whoiswrong project
3. Navigate to **Settings** → **Environment Variables**
4. Verify these match your Supabase project:
   - `NEXT_PUBLIC_SUPABASE_URL` - Should be your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Should be your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Should be your Supabase service role key

You can find these values in Supabase:
- Dashboard → Project Settings → API

## Additional Notes

- **Idempotent**: The migration can be run multiple times safely
- **No Data Loss**: All existing data is preserved
- **Backward Compatible**: Existing queries will continue to work
- **Forward Compatible**: New code expecting these columns will now work

## Troubleshooting

If you still see errors after applying the migration:

1. **Check Vercel logs:**
   ```bash
   vercel logs
   ```

2. **Verify migration was applied:**
   Run the verification SQL queries above

3. **Check database connection:**
   Ensure Vercel environment variables match your Supabase project

4. **Clear any caches:**
   - Redeploy the Vercel project
   - Clear browser cache/storage

## Summary

This migration resolves the mismatch between:
- Migration 006 (incomplete judges table schema)
- full_schema.sql (complete schema)
- Application code expectations (requires photo_url, system_prompt, etc.)

After applying this migration, your production database will match both the full_schema.sql and the code requirements, eliminating the 500 errors.
