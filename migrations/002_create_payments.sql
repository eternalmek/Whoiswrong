-- Create unlocked_judges table for single judge purchases
create table if not exists unlocked_judges (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  celebrity_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists unlocked_judges_user_judge_idx
  on unlocked_judges (user_id, celebrity_id);

-- Create subscriptions table for recurring access
create table if not exists subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx
  on subscriptions (user_id);
