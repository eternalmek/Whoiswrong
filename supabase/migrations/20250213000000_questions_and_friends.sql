-- Ensure pgcrypto is available for UUID generation
create extension if not exists "pgcrypto";

-- Keep profiles aligned with auth tables
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists notifications_enabled boolean default true;

-- Questions history for saved cases
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  question_text text,
  judge_type text,
  verdict jsonb,
  created_at timestamptz default now()
);

alter table public.questions enable row level security;
create policy if not exists "Users can view own questions" on public.questions
  for select using (auth.uid() = user_id);
create policy if not exists "Users can insert own questions" on public.questions
  for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own questions" on public.questions
  for update using (auth.uid() = user_id);
create policy if not exists "Users can delete own questions" on public.questions
  for delete using (auth.uid() = user_id);

-- Friend relationships (simple version)
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default now()
);

alter table public.friends enable row level security;
create policy if not exists "Users can view own friend rows" on public.friends
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy if not exists "Users can create friend rows" on public.friends
  for insert with check (auth.uid() = requester_id);
create policy if not exists "Users can manage their friend rows" on public.friends
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy if not exists "Users can delete their friend rows" on public.friends
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

create index if not exists idx_friends_requester on public.friends (requester_id, status);
create index if not exists idx_friends_addressee on public.friends (addressee_id, status);
