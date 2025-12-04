-- Strengthen account system tables for whoiswrong.io
-- Profiles
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  country text,
  is_public_profile boolean default true,
  allow_friend_requests boolean default true,
  show_debates_on_wall boolean default true,
  allow_notifications boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles alter column created_at set default now();
create index if not exists idx_profiles_username on public.profiles(username);

alter table public.profiles enable row level security;
create policy if not exists "profiles_self_select" on public.profiles for select using (auth.uid() = id or is_public_profile = true);
create policy if not exists "profiles_self_update" on public.profiles for update using (auth.uid() = id);
create policy if not exists "profiles_self_insert" on public.profiles for insert with check (auth.uid() = id);

create or replace function public.touch_profiles() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists trigger_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_profiles();

-- User settings
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  theme text default 'light',
  email_notifications boolean default true,
  language text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;
create policy if not exists "settings_self_select" on public.user_settings for select using (auth.uid() = user_id);
create policy if not exists "settings_self_modify" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_user_settings() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists trigger_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.touch_user_settings();

-- Judgements alignment
alter table public.judgements add column if not exists question_text text;
alter table public.judgements add column if not exists user_side text check (user_side in ('left','right','undecided'));
alter table public.judgements add column if not exists result text check (result in ('left_was_right','right_was_right','tie','pending'));
alter table public.judgements alter column created_at set default now();
-- convert legacy text ids to uuid when possible
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='judgements' and column_name='user_id' and data_type <> 'uuid') then
    alter table public.judgements alter column user_id type uuid using nullif(user_id::text, '')::uuid;
  end if;
exception
  when others then
    raise notice 'user_id column could not be converted to uuid; please review data manually';
end $$;
alter table public.judgements alter column user_id drop not null;
alter table public.judgements add constraint if not exists judgements_user_fk foreign key (user_id) references auth.users(id) on delete set null;

alter table public.judgements enable row level security;
create policy if not exists "judgements_public_read" on public.judgements for select using (true);
create policy if not exists "judgements_self_manage" on public.judgements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friends table
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','accepted','blocked')),
  action_user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint friends_unique_pair unique (requester_id, addressee_id)
);

create index if not exists idx_friends_requester on public.friends(requester_id, status);
create index if not exists idx_friends_addressee on public.friends(addressee_id, status);

alter table public.friends enable row level security;
create policy if not exists "friends_self_visibility" on public.friends for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy if not exists "friends_self_insert" on public.friends for insert with check (auth.uid() = requester_id and requester_id <> addressee_id);
create policy if not exists "friends_self_update" on public.friends for update using (auth.uid() = requester_id or auth.uid() = addressee_id) with check (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy if not exists "friends_self_delete" on public.friends for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

create or replace function public.touch_friends() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists trigger_friends_updated_at
  before update on public.friends
  for each row
  execute function public.touch_friends();

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy if not exists "notifications_self_read" on public.notifications for select using (auth.uid() = user_id);
create policy if not exists "notifications_self_manage" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

