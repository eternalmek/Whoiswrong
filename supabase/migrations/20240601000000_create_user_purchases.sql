-- Creates a user_purchases table to track paid judge unlocks and subscriptions
-- This ensures purchases persist and are linked to user accounts

create table if not exists public.user_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  purchase_type text not null check (purchase_type in ('single', 'subscription')),
  judge_id text, -- Only set for 'single' purchases; null for subscriptions
  stripe_session_id text, -- Stripe checkout session ID for reference
  stripe_subscription_id text, -- Only set for subscriptions
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for quick lookup by user
create index if not exists idx_user_purchases_user_id on public.user_purchases (user_id);

-- Index for finding active subscriptions
create index if not exists idx_user_purchases_status on public.user_purchases (status) where status = 'active';

-- Unique constraint to prevent duplicate single judge purchases for same user
create unique index if not exists idx_user_purchases_unique_single 
  on public.user_purchases (user_id, judge_id) 
  where purchase_type = 'single';

-- Enable RLS
alter table public.user_purchases enable row level security;

-- Policy: Users can read their own purchases
create policy "Users can view own purchases" 
  on public.user_purchases for select 
  using (auth.uid() = user_id);

-- Policy: Only service role can insert/update (backend creates purchases)
create policy "Service role can manage purchases" 
  on public.user_purchases for all 
  using (auth.role() = 'service_role');
