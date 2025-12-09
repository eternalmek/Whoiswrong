-- ============================================================================
-- Migration 008: Add missing columns to judges table
-- Adds photo_url and system_prompt columns that are expected by the code
-- ============================================================================

-- Add photo_url column (expected by src/services/judges.js line 133 select)
-- This is used as an alias/alternative to avatar_url
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Add system_prompt column (expected by src/services/judges.js line 312 as fallback)
-- This is used as an alternative to personality_prompt
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS system_prompt text;

-- Add image_url column for additional flexibility in image sources
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS image_url text;

-- Add price column if missing (used for pricing calculations)
-- Default to 0.99 to match existing pricing pattern (migration 004)
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0.99;

-- Add price_cents column if missing (used for Stripe integration)
-- Default to 99 cents to match price column (0.99 * 100)
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS price_cents integer DEFAULT 99;

-- Backfill photo_url from avatar_url for existing judges
UPDATE public.judges 
SET photo_url = avatar_url 
WHERE photo_url IS NULL AND avatar_url IS NOT NULL;

-- Backfill image_url from avatar_url for existing judges
UPDATE public.judges 
SET image_url = avatar_url 
WHERE image_url IS NULL AND avatar_url IS NOT NULL;

-- Update price_cents to match price for existing judges
-- This ensures consistency between price (in dollars) and price_cents
UPDATE public.judges 
SET price_cents = ROUND(price * 100)::integer 
WHERE price IS NOT NULL;
