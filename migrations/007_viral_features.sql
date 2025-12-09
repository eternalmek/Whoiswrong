-- ============================================================================
-- Migration 007: Viral Features - Analytics, Referrals, Notifications
-- Adds tables for tracking shares, referrals, analytics events, and notifications
-- ============================================================================

-- ============================================================================
-- 1. Share Events Table
-- Tracks when users share debates to social platforms
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  debate_id uuid REFERENCES public.debates(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'x', 'instagram', 'whatsapp', 'copy_link', 'native')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_events_user ON public.share_events (user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_debate ON public.share_events (debate_id);
CREATE INDEX IF NOT EXISTS idx_share_events_platform ON public.share_events (platform);
CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON public.share_events (created_at DESC);

-- ============================================================================
-- 2. Referral Codes Table
-- User-specific referral codes for viral growth
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  uses_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes (code);

-- ============================================================================
-- 3. Referral Uses Table
-- Tracks when referral codes are used
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_uses_code ON public.referral_uses (referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_user ON public.referral_uses (referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_created_at ON public.referral_uses (created_at DESC);

-- ============================================================================
-- 4. Analytics Events Table
-- Generic event tracking for user interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at DESC);

-- ============================================================================
-- 5. Notifications Table
-- User notifications for friend requests, likes, comments, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('friend_request', 'friend_accept', 'like', 'comment', 'system')),
  title text NOT NULL,
  message text,
  link_url text,
  is_read boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- ============================================================================
-- 6. Data Export Requests Table (GDPR compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  export_url text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_data_export_user ON public.data_export_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_status ON public.data_export_requests (status);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- Share events: Users can read their own
CREATE POLICY "share_events_read_own" ON public.share_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "share_events_insert" ON public.share_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Referral codes: Users can read their own
CREATE POLICY "referral_codes_read_own" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "referral_codes_insert" ON public.referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referral uses: Users can read uses of their own codes
CREATE POLICY "referral_uses_read" ON public.referral_uses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.referral_codes
    WHERE referral_codes.id = referral_uses.referral_code_id
    AND referral_codes.user_id = auth.uid()
  )
);

-- Analytics events: Users can insert (service role can read all)
CREATE POLICY "analytics_events_insert" ON public.analytics_events FOR INSERT WITH CHECK (true);

-- Notifications: Users can read their own
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Data export: Users can request their own
CREATE POLICY "data_export_read_own" ON public.data_export_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "data_export_insert" ON public.data_export_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
