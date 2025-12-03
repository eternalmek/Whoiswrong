-- Create unlocked_judges table for single judge purchases
-- This table is required by the /api/purchases route
create table if not exists public.unlocked_judges (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  celebrity_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists unlocked_judges_user_judge_idx
  on public.unlocked_judges (user_id, celebrity_id);

-- Enable RLS
alter table public.unlocked_judges enable row level security;

-- Policy: Users can view their own unlocked judges
create policy "Users can view own unlocked judges"
  on public.unlocked_judges for select
  using (auth.uid() = user_id);

-- Policy: Service role can manage unlocked judges
create policy "Service role can manage unlocked judges"
  on public.unlocked_judges for all
  using (auth.role() = 'service_role');

-- Create subscriptions table for recurring access
-- This table is required by the /api/purchases route
create table if not exists public.subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  -- stripe_customer_id and stripe_subscription_id may be null during pending states
  -- or for manually added subscriptions
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx
  on public.subscriptions (user_id);

-- Composite index for common queries filtering by user and status
create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policy: Users can view their own subscriptions
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Policy: Service role can manage subscriptions
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');
