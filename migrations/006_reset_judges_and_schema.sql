-- Migration 006: Reset judges catalogue and align social schema
-- - Ensures required social tables/columns exist
-- - Truncates judges and repopulates with new celebrity list
-- - Adds supporting constraints and defaults

-- 1) Ensure core tables/columns exist (idempotent safety)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.judges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  avatar_url text NOT NULL,
  color_theme text,
  is_ai_default boolean DEFAULT false,
  is_free boolean DEFAULT false,
  price_id text NULL,
  created_at timestamptz DEFAULT now(),
  is_celebrity boolean DEFAULT true,
  description text,
  personality_prompt text,
  category text,
  is_active boolean DEFAULT true
);

ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS color_theme text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS is_ai_default boolean DEFAULT false;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS price_id text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS personality_prompt text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;
UPDATE public.judges SET avatar_url = COALESCE(avatar_url, 'https://api.dicebear.com/8.x/adventurer/png?seed=judge&size=512&backgroundColor=f8fafc');
ALTER TABLE public.judges ALTER COLUMN avatar_url SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.judge_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, judge_id)
);

CREATE TABLE IF NOT EXISTS public.debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  context text,
  option_a text NOT NULL,
  option_b text NOT NULL,
  wrong_side text CHECK (wrong_side IN ('A','B')),
  right_side text CHECK (right_side IN ('A','B')),
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

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (debate_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid REFERENCES public.debates(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 2) Reset judges content
TRUNCATE TABLE public.judges RESTART IDENTITY CASCADE;

-- Set is_celebrity default to true for celebrity judges
ALTER TABLE public.judges ALTER COLUMN is_celebrity SET DEFAULT true;

INSERT INTO public.judges (id, name, slug, avatar_url, color_theme, is_ai_default, is_free, price_id, description, personality_prompt, category, is_active)
VALUES
  (gen_random_uuid(), 'AI Judge', 'ai_judge', 'https://api.dicebear.com/8.x/adventurer/png?seed=ai_judge&size=512&backgroundColor=6B7280', '#6B7280', true, true, NULL, 'Impartial AI judge - clear, logical, neutral.', NULL, 'Core', true),
  (gen_random_uuid(), 'Elon Musk', 'elon_musk', 'https://api.dicebear.com/8.x/adventurer/png?seed=elon_musk&size=512&backgroundColor=3B82F6', '#3B82F6', false, true, NULL, 'Analytical, futuristic, blunt. Meme-ready.', NULL, 'Tech Icons', true),
  (gen_random_uuid(), 'Taylor Swift', 'taylor_swift', 'https://api.dicebear.com/8.x/adventurer/png?seed=taylor_swift&size=512&backgroundColor=EC4899', '#EC4899', false, true, NULL, 'Emotional, empathetic, poetic. Relationship expert.', NULL, 'Global Superstars', true),
  (gen_random_uuid(), 'Cristiano Ronaldo', 'cristiano_ronaldo', 'https://api.dicebear.com/8.x/adventurer/png?seed=cristiano_ronaldo&size=512&backgroundColor=DC2626', '#DC2626', false, false, NULL, 'Confident, competitive. Champion mindset.', NULL, 'Global Superstars', true),
  (gen_random_uuid(), 'Lionel Messi', 'lionel_messi', 'https://api.dicebear.com/8.x/adventurer/png?seed=lionel_messi&size=512&backgroundColor=2563EB', '#2563EB', false, false, NULL, 'Calm, humble, fair. Teamwork focused.', NULL, 'Global Superstars', true),
  (gen_random_uuid(), 'Drake', 'drake', 'https://api.dicebear.com/8.x/adventurer/png?seed=drake&size=512&backgroundColor=7C3AED', '#7C3AED', false, false, NULL, 'Soft, emotional, reflective. Sees both sides.', NULL, 'Global Superstars', true),
  (gen_random_uuid(), 'Zendaya', 'zendaya', 'https://api.dicebear.com/8.x/adventurer/png?seed=zendaya&size=512&backgroundColor=F59E0B', '#F59E0B', false, false, NULL, 'Smart, grounded, empathetic. Modern relationships.', NULL, 'Global Superstars', true),
  (gen_random_uuid(), 'The Rock', 'the_rock', 'https://api.dicebear.com/8.x/adventurer/png?seed=the_rock&size=512&backgroundColor=78350F', '#78350F', false, false, NULL, 'Strong, motivational, humorous. Coach mindset.', NULL, 'Icons & Legends', true),
  (gen_random_uuid(), 'Kim Kardashian', 'kim_kardashian', 'https://api.dicebear.com/8.x/adventurer/png?seed=kim_kardashian&size=512&backgroundColor=DB2777', '#DB2777', false, false, NULL, 'Glamorous, image-aware, direct.', NULL, 'Ultra-Viral Public Figures', true),
  (gen_random_uuid(), 'MrBeast', 'mrbeast', 'https://api.dicebear.com/8.x/adventurer/png?seed=mrbeast&size=512&backgroundColor=10B981', '#10B981', false, false, NULL, 'Straightforward, YouTube-style, playful.', NULL, 'Ultra-Viral Public Figures', true),
  (gen_random_uuid(), 'Jordan Peterson', 'jordan_peterson', 'https://api.dicebear.com/8.x/adventurer/png?seed=jordan_peterson&size=512&backgroundColor=475569', '#475569', false, false, NULL, 'Structured, philosophical, responsibility-focused.', NULL, 'Intellectuals', true),
  (gen_random_uuid(), 'Gordon Ramsay', 'gordon_ramsay', 'https://api.dicebear.com/8.x/adventurer/png?seed=gordon_ramsay&size=512&backgroundColor=EF4444', '#EF4444', false, false, NULL, 'Brutally honest, comedic. Chef energy.', NULL, 'Icons & Legends', true),
  (gen_random_uuid(), 'Amber Heard', 'amber_heard', 'https://api.dicebear.com/8.x/adventurer/png?seed=amber_heard&size=512&backgroundColor=8B5CF6', '#8B5CF6', false, false, NULL, 'Dramatic, emotional. Explores miscommunication.', NULL, 'Controversial', true),
  (gen_random_uuid(), 'Johnny Depp', 'johnny_depp', 'https://api.dicebear.com/8.x/adventurer/png?seed=johnny_depp&size=512&backgroundColor=6366F1', '#6366F1', false, false, NULL, 'Calm, witty, theatrical. Points out contradictions.', NULL, 'Icons & Legends', true),
  (gen_random_uuid(), 'Kylie Jenner', 'kylie_jenner', 'https://api.dicebear.com/8.x/adventurer/png?seed=kylie_jenner&size=512&backgroundColor=EC4899', '#EC4899', false, false, NULL, 'Influencer-style, confident, image-conscious.', NULL, 'Ultra-Viral Public Figures', true),
  (gen_random_uuid(), 'Kevin Hart', 'kevin_hart', 'https://api.dicebear.com/8.x/adventurer/png?seed=kevin_hart&size=512&backgroundColor=F59E0B', '#F59E0B', false, false, NULL, 'Comedic, animated, friendly. Light jokes.', NULL, 'Icons & Legends', true),
  (gen_random_uuid(), 'Snoop Dogg', 'snoop_dogg', 'https://api.dicebear.com/8.x/adventurer/png?seed=snoop_dogg&size=512&backgroundColor=10B981', '#10B981', false, false, NULL, 'Relaxed, humorous, chill. Dislikes drama.', NULL, 'Icons & Legends', true),
  (gen_random_uuid(), 'Andrew Tate', 'andrew_tate', 'https://api.dicebear.com/8.x/adventurer/png?seed=andrew_tate&size=512&backgroundColor=1F2937', '#1F2937', false, false, NULL, 'Direct, intense. Personal responsibility focus.', NULL, 'Controversial', true),
  (gen_random_uuid(), 'Billie Eilish', 'billie_eilish', 'https://api.dicebear.com/8.x/adventurer/png?seed=billie_eilish&size=512&backgroundColor=0EA5E9', '#0EA5E9', false, false, NULL, 'Introspective, calm, dark-humored.', NULL, 'Global Superstars', true),
  (gen_random_uuid(), 'Mr Wonderful', 'mr_wonderful', 'https://api.dicebear.com/8.x/adventurer/png?seed=mr_wonderful&size=512&backgroundColor=DC2626', '#DC2626', false, false, NULL, 'Sarcastic, business-like, brutally pragmatic.', NULL, 'Business Icons', true);

-- 3) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_judges_is_free ON public.judges (is_free);
CREATE INDEX IF NOT EXISTS idx_judges_slug ON public.judges (slug);
CREATE INDEX IF NOT EXISTS idx_debates_is_public ON public.debates (is_public);
