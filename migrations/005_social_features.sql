-- ============================================================================
-- Migration 005: Social Features & New Schema
-- Adds profiles, debates, comments, likes, reports tables
-- Extends judges table with new fields
-- ============================================================================

-- ============================================================================
-- 1. Profiles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- ============================================================================
-- 2. Extend Judges Table
-- ============================================================================
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS color_theme text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS is_ai_default boolean DEFAULT false;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS price_id text;

-- Update the "normal" judge to be AI default
UPDATE public.judges SET is_ai_default = true WHERE slug = 'normal' OR slug = 'ai_judge';

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_judges_is_free ON public.judges (is_free);
CREATE INDEX IF NOT EXISTS idx_judges_is_ai_default ON public.judges (is_ai_default);

-- ============================================================================
-- 3. Judge Unlocks Table (replaces unlocked_judges with better structure)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.judge_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_unlocks_user ON public.judge_unlocks (user_id);
CREATE INDEX IF NOT EXISTS idx_judge_unlocks_judge ON public.judge_unlocks (judge_id);

-- ============================================================================
-- 4. Debates Table (replaces/extends judgements for public feed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  context text,
  option_a text NOT NULL,
  option_b text NOT NULL,
  wrong_side text CHECK (wrong_side IN ('A', 'B')),
  right_side text CHECK (right_side IN ('A', 'B')),
  verdict_text text NOT NULL,
  category text,
  is_public boolean DEFAULT true,
  is_anonymous boolean DEFAULT false,
  judge_id uuid REFERENCES public.judges(id) ON DELETE SET NULL,
  judge_name text,
  judge_slug text,
  judge_style text,
  like_count int DEFAULT 0,
  comment_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_debates_created_at ON public.debates (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debates_user_id ON public.debates (user_id);
CREATE INDEX IF NOT EXISTS idx_debates_judge_id ON public.debates (judge_id);
CREATE INDEX IF NOT EXISTS idx_debates_is_public ON public.debates (is_public);
CREATE INDEX IF NOT EXISTS idx_debates_category ON public.debates (category);

-- ============================================================================
-- 5. Comments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_debate ON public.comments (debate_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments (created_at DESC);

-- ============================================================================
-- 6. Likes Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (debate_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_debate ON public.likes (debate_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes (user_id);

-- ============================================================================
-- 7. Reports Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid REFERENCES public.debates(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_debate ON public.reports (debate_id);
CREATE INDEX IF NOT EXISTS idx_reports_comment ON public.reports (comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_unlocks ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read, users can update their own
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Debates: Anyone can read public debates where user has permission, authenticated users can insert
CREATE POLICY "debates_read_public" ON public.debates FOR SELECT USING (
  is_public = true OR (user_id IS NOT NULL AND auth.uid() = user_id)
);
CREATE POLICY "debates_insert" ON public.debates FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "debates_update_own" ON public.debates FOR UPDATE USING (auth.uid() = user_id);

-- Comments: Anyone can read, authenticated users can insert, users can update/delete their own
CREATE POLICY "comments_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Likes: Anyone can read, authenticated users can like, users can unlike their own
CREATE POLICY "likes_read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Reports: Users can insert reports, only admins can view (simplified: users can view their own)
CREATE POLICY "reports_insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);
CREATE POLICY "reports_view_own" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- Judge Unlocks: Users can read their own unlocks
CREATE POLICY "judge_unlocks_read_own" ON public.judge_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "judge_unlocks_insert" ON public.judge_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to increment like count on debates
CREATE OR REPLACE FUNCTION increment_debate_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.debates SET like_count = like_count + 1 WHERE id = NEW.debate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_debate_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.debates SET like_count = like_count - 1 WHERE id = OLD.debate_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers for like count
DROP TRIGGER IF EXISTS trigger_increment_like_count ON public.likes;
CREATE TRIGGER trigger_increment_like_count
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_debate_like_count();

DROP TRIGGER IF EXISTS trigger_decrement_like_count ON public.likes;
CREATE TRIGGER trigger_decrement_like_count
  AFTER DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_debate_like_count();

-- Function to increment comment count on debates
CREATE OR REPLACE FUNCTION increment_debate_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.debates SET comment_count = comment_count + 1 WHERE id = NEW.debate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_debate_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.debates SET comment_count = comment_count - 1 WHERE id = OLD.debate_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers for comment count
DROP TRIGGER IF EXISTS trigger_increment_comment_count ON public.comments;
CREATE TRIGGER trigger_increment_comment_count
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_debate_comment_count();

DROP TRIGGER IF EXISTS trigger_decrement_comment_count ON public.comments;
CREATE TRIGGER trigger_decrement_comment_count
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_debate_comment_count();

-- ============================================================================
-- Migration Complete
-- ============================================================================
