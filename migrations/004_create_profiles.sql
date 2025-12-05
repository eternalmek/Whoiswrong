-- Migration: Create profiles table
-- This table stores user profile information and premium status

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  username text unique,
  premium boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for username lookups
create index if not exists idx_profiles_username on public.profiles (username);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policy: Anyone can view profiles (public feed)
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- RLS Policy: Users can insert their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- RLS Policy: Users can update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Update judgements table RLS
-- RLS Policy: Public can view public judgements
create policy if not exists "Public judgements are viewable by everyone"
  on public.judgements for select
  using (is_public = true or auth.uid() = user_id::uuid);

-- RLS Policy: Authenticated users can insert judgements
create policy if not exists "Authenticated users can insert judgements"
  on public.judgements for insert
  with check (true);

-- RLS Policy: Anonymous users can insert judgements (for free tier)
create policy if not exists "Anonymous users can insert judgements"
  on public.judgements for insert
  with check (true);

-- Function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on profile changes
drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
