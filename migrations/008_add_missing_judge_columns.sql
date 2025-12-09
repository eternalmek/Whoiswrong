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
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0.00;

-- Add price_cents column if missing (used for Stripe integration)
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS price_cents int DEFAULT 0;

-- Backfill photo_url from avatar_url for existing judges
UPDATE public.judges 
SET photo_url = avatar_url 
WHERE photo_url IS NULL AND avatar_url IS NOT NULL;

-- Backfill image_url from avatar_url for existing judges
UPDATE public.judges 
SET image_url = avatar_url 
WHERE image_url IS NULL AND avatar_url IS NOT NULL;

-- Ensure judgement_votes table exists (should be from migration 003)
-- Including here for completeness in case migrations were run out of order
CREATE TABLE IF NOT EXISTS public.judgement_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  judgement_id uuid REFERENCES public.judgements(id) ON DELETE CASCADE,
  voter_fingerprint text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vote text CHECK (vote IN ('agree','disagree')),
  created_at timestamptz DEFAULT now()
);

-- Ensure indexes exist on judgement_votes
CREATE INDEX IF NOT EXISTS idx_judgement_votes_judgement 
  ON public.judgement_votes (judgement_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_judgement_vote_user 
  ON public.judgement_votes (judgement_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_judgement_vote_fingerprint 
  ON public.judgement_votes (judgement_id, voter_fingerprint) 
  WHERE voter_fingerprint IS NOT NULL;
