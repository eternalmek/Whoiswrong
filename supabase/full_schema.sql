-- Consolidated Supabase schema alignment script
-- Run in Supabase SQL editor to align database with application expectations.

-- Safety: ensure extensions available
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- Core user profile data
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  email text,
  avatar_url text,
  bio text,
  country text,
  is_public_profile boolean default true,
  allow_friend_requests boolean default true,
  show_debates_on_wall boolean default true,
  dark_mode_preference boolean default false,
  allow_notifications boolean default true,
  last_friend_request_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_username on public.profiles (username);

-- =====================================================================
-- Judges catalogue and unlocks
-- =====================================================================
create table if not exists public.judges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  avatar_url text not null,
  color_theme text,
  is_ai_default boolean default false,
  is_free boolean default false,
  price_id text,
  price numeric(10,2) default 0.99,
  created_at timestamptz default now(),
  is_celebrity boolean default true,
  description text,
  personality_prompt text,
  category text,
  is_active boolean default true,
  image_url text,
  system_prompt text,
  photo_url text
);

alter table public.judges add column if not exists color_theme text;
alter table public.judges add column if not exists is_ai_default boolean default false;
alter table public.judges add column if not exists price_id text;
alter table public.judges add column if not exists price numeric(10,2) default 0.99;
alter table public.judges add column if not exists is_free boolean default false;
alter table public.judges add column if not exists personality_prompt text;
alter table public.judges add column if not exists category text;
alter table public.judges add column if not exists description text;
alter table public.judges add column if not exists is_active boolean default true;
alter table public.judges add column if not exists image_url text;

update public.judges set image_url = coalesce(image_url, photo_url, avatar_url) where image_url is null;
update public.judges set price = 0 where is_free = true;
update public.judges set price = 0.99 where is_free = false or is_free is null;

create index if not exists idx_judges_is_free on public.judges (is_free);
create index if not exists idx_judges_slug on public.judges (slug);
create index if not exists idx_judges_is_ai_default on public.judges (is_ai_default);

-- Legacy single-purchase unlocks (still used by API)
create table if not exists public.unlocked_judges (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  celebrity_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, celebrity_id)
);

create index if not exists unlocked_judges_user_judge_idx on public.unlocked_judges (user_id, celebrity_id);

-- Subscriptions table (Stripe)
create table if not exists public.subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

-- New unlocks table (social features)
create table if not exists public.judge_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  judge_id uuid not null references public.judges(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, judge_id)
);

create index if not exists idx_judge_unlocks_user on public.judge_unlocks (user_id);
create index if not exists idx_judge_unlocks_judge on public.judge_unlocks (judge_id);

-- =====================================================================
-- Judgements and voting
-- =====================================================================
create table if not exists public.judgements (
  id uuid default gen_random_uuid() primary key,
  context text,
  option_a text not null,
  option_b text not null,
  wrong text not null,
  right text not null,
  reason text,
  roast text,
  raw_model_response text,
  user_id uuid references auth.users(id) on delete set null,
  judge_id uuid references public.judges(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_judgements_created_at on public.judgements (created_at desc);
create index if not exists idx_judgements_judge on public.judgements (judge_id);

create table if not exists public.judgement_votes (
  id uuid default gen_random_uuid() primary key,
  judgement_id uuid references public.judgements(id) on delete cascade,
  voter_fingerprint text,
  user_id uuid references auth.users(id) on delete cascade,
  vote text check (vote in ('agree','disagree')),
  created_at timestamptz default now()
);

create index if not exists idx_judgement_votes_judgement on public.judgement_votes (judgement_id);
create unique index if not exists uniq_judgement_vote_user on public.judgement_votes (judgement_id, user_id) where user_id is not null;
create unique index if not exists uniq_judgement_vote_fingerprint on public.judgement_votes (judgement_id, voter_fingerprint) where voter_fingerprint is not null;

-- =====================================================================
-- Debates, comments, likes, reports
-- =====================================================================
create table if not exists public.debates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  context text,
  option_a text not null,
  option_b text not null,
  wrong_side text check (wrong_side in ('A','B')),
  right_side text check (right_side in ('A','B')),
  verdict_text text not null,
  category text,
  is_public boolean default true,
  is_anonymous boolean default false,
  judge_id uuid references public.judges(id) on delete set null,
  judge_name text,
  judge_slug text,
  judge_style text,
  like_count int default 0,
  comment_count int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_debates_created_at on public.debates (created_at desc);
create index if not exists idx_debates_user_id on public.debates (user_id);
create index if not exists idx_debates_judge_id on public.debates (judge_id);
create index if not exists idx_debates_is_public on public.debates (is_public);
create index if not exists idx_debates_category on public.debates (category);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.debates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  body text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists idx_comments_debate on public.comments (debate_id);
create index if not exists idx_comments_user on public.comments (user_id);
create index if not exists idx_comments_parent on public.comments (parent_id);
create index if not exists idx_comments_created_at on public.comments (created_at desc);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.debates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (debate_id, user_id)
);

create index if not exists idx_likes_debate on public.likes (debate_id);
create index if not exists idx_likes_user on public.likes (user_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid references public.debates(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text,
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists idx_reports_debate on public.reports (debate_id);
create index if not exists idx_reports_comment on public.reports (comment_id);
create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_created_at on public.reports (created_at desc);

-- Triggers to keep like/comment counts in sync
create or replace function increment_debate_like_count() returns trigger as $$
begin
  update public.debates set like_count = like_count + 1 where id = new.debate_id;
  return new;
end;
$$ language plpgsql;

create or replace function decrement_debate_like_count() returns trigger as $$
begin
  update public.debates set like_count = like_count - 1 where id = old.debate_id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trigger_increment_like_count on public.likes;
create trigger trigger_increment_like_count after insert on public.likes for each row execute function increment_debate_like_count();

drop trigger if exists trigger_decrement_like_count on public.likes;
create trigger trigger_decrement_like_count after delete on public.likes for each row execute function decrement_debate_like_count();

create or replace function increment_debate_comment_count() returns trigger as $$
begin
  update public.debates set comment_count = comment_count + 1 where id = new.debate_id;
  return new;
end;
$$ language plpgsql;

create or replace function decrement_debate_comment_count() returns trigger as $$
begin
  update public.debates set comment_count = comment_count - 1 where id = old.debate_id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trigger_increment_comment_count on public.comments;
create trigger trigger_increment_comment_count after insert on public.comments for each row execute function increment_debate_comment_count();

drop trigger if exists trigger_decrement_comment_count on public.comments;
create trigger trigger_decrement_comment_count after delete on public.comments for each row execute function decrement_debate_comment_count();

-- =====================================================================
-- Public debates (legacy SEO-friendly share pages)
-- =====================================================================
create table if not exists public.public_debates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text,
  judge_id uuid references public.judges(id) on delete set null,
  verdict text,
  user_id uuid references auth.users(id) on delete set null,
  is_public boolean default true,
  is_indexable boolean default true,
  judgement_id uuid references public.judgements(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_public_debates_created_at on public.public_debates (created_at desc);
create index if not exists idx_public_debates_user on public.public_debates (user_id);

-- =====================================================================
-- Friendships and lightweight purchase aggregation
-- =====================================================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  action_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_friendships_requester on public.friendships (requester_id);
create index if not exists idx_friendships_receiver on public.friendships (receiver_id);
create index if not exists idx_friendships_status on public.friendships (status);
create unique index if not exists uniq_friendships_pair on public.friendships (least(requester_id, receiver_id), greatest(requester_id, receiver_id));

create or replace function set_friendships_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at before update on public.friendships for each row execute function set_friendships_updated_at();

-- Used for account stats; keep minimal structure
create table if not exists public.user_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz default now()
);

create index if not exists idx_user_purchases_user on public.user_purchases (user_id);
create index if not exists idx_user_purchases_status on public.user_purchases (status);

-- =====================================================================
-- Row Level Security (RLS)
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.debates enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;
alter table public.judge_unlocks enable row level security;

create policy if not exists profiles_read on public.profiles for select using (true);
create policy if not exists profiles_insert on public.profiles for insert with check (auth.uid() = id);
create policy if not exists profiles_update on public.profiles for update using (auth.uid() = id);

create policy if not exists debates_read_public on public.debates for select using (is_public = true or (user_id is not null and auth.uid() = user_id));
create policy if not exists debates_insert on public.debates for insert with check (auth.uid() = user_id or user_id is null);
create policy if not exists debates_update_own on public.debates for update using (auth.uid() = user_id);

create policy if not exists comments_read on public.comments for select using (true);
create policy if not exists comments_insert on public.comments for insert with check (auth.uid() = user_id or user_id is null);
create policy if not exists comments_update_own on public.comments for update using (auth.uid() = user_id);
create policy if not exists comments_delete_own on public.comments for delete using (auth.uid() = user_id);

create policy if not exists likes_read on public.likes for select using (true);
create policy if not exists likes_insert on public.likes for insert with check (auth.uid() = user_id);
create policy if not exists likes_delete_own on public.likes for delete using (auth.uid() = user_id);

create policy if not exists reports_insert on public.reports for insert with check (auth.uid() = reporter_id or reporter_id is null);
create policy if not exists reports_view_own on public.reports for select using (auth.uid() = reporter_id);

create policy if not exists judge_unlocks_read_own on public.judge_unlocks for select using (auth.uid() = user_id);
create policy if not exists judge_unlocks_insert on public.judge_unlocks for insert with check (auth.uid() = user_id);

-- =====================================================================
-- Optional content refresh for judges (clears table then reloads defaults)
-- Uncomment the following block if you want to replace existing judge rows
-- with the curated set from migrations/006_reset_judges_and_schema.sql.
--
-- truncate table public.judges restart identity cascade;
-- insert into public.judges (id, name, slug, avatar_url, color_theme, is_ai_default, is_free, price_id, description, personality_prompt, category, is_active)
-- values
--   (gen_random_uuid(), 'AI Judge', 'ai_judge', 'https://api.dicebear.com/8.x/adventurer/png?seed=ai_judge&size=512&backgroundColor=6B7280', '#6B7280', true, true, null, 'Impartial AI judge - clear, logical, neutral.', null, 'Core', true);
