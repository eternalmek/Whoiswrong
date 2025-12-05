-- Migration: Add missing columns to judgements table
-- Adds is_public, question_text, verdict_text columns for public feed functionality

-- Add is_public column with default true (all debates are public by default)
ALTER TABLE public.judgements ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Add question_text column for storing the debate question
ALTER TABLE public.judgements ADD COLUMN IF NOT EXISTS question_text text;

-- Add verdict_text column for storing the verdict summary
ALTER TABLE public.judgements ADD COLUMN IF NOT EXISTS verdict_text text;

-- Add judge_id column (in case it was missed)
ALTER TABLE public.judgements ADD COLUMN IF NOT EXISTS judge_id text;

-- Create index on is_public for efficient filtering
CREATE INDEX IF NOT EXISTS idx_judgements_is_public ON public.judgements (is_public) WHERE is_public = true;

-- Enable RLS on judgements table
ALTER TABLE public.judgements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view public judgements
DROP POLICY IF EXISTS "Public judgements are viewable by everyone" ON public.judgements;
CREATE POLICY "Public judgements are viewable by everyone"
  ON public.judgements FOR SELECT
  USING (is_public = true);

-- RLS Policy: Users can view their own judgements
DROP POLICY IF EXISTS "Users can view their own judgements" ON public.judgements;
CREATE POLICY "Users can view their own judgements"
  ON public.judgements FOR SELECT
  USING (auth.uid()::text = user_id);

-- RLS Policy: Anyone can insert judgements (for free tier and anonymous users)
DROP POLICY IF EXISTS "Anyone can insert judgements" ON public.judgements;
CREATE POLICY "Anyone can insert judgements"
  ON public.judgements FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update their own judgements
DROP POLICY IF EXISTS "Users can update their own judgements" ON public.judgements;
CREATE POLICY "Users can update their own judgements"
  ON public.judgements FOR UPDATE
  USING (auth.uid()::text = user_id);

-- RLS Policy: Users can delete their own judgements
DROP POLICY IF EXISTS "Users can delete their own judgements" ON public.judgements;
CREATE POLICY "Users can delete their own judgements"
  ON public.judgements FOR DELETE
  USING (auth.uid()::text = user_id);
