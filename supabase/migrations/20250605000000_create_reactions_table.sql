-- Creates reactions table for like/dislike system on judgements
-- Only logged-in users can react, one reaction per user per judgement

create table if not exists public.reactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  judgement_id uuid not null references public.judgements(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique constraint: one reaction per user per judgement
create unique index if not exists idx_reactions_user_judgement 
  on public.reactions (user_id, judgement_id);

-- Index for quick lookup by judgement
create index if not exists idx_reactions_judgement_id 
  on public.reactions (judgement_id);

-- Index for quick lookup by user
create index if not exists idx_reactions_user_id 
  on public.reactions (user_id);

-- Enable RLS
alter table public.reactions enable row level security;

-- Policy: Users can view all reactions
create policy "Anyone can view reactions" 
  on public.reactions for select 
  using (true);

-- Policy: Users can insert their own reactions
create policy "Users can create own reactions" 
  on public.reactions for insert 
  with check (auth.uid() = user_id);

-- Policy: Users can update their own reactions
create policy "Users can update own reactions" 
  on public.reactions for update 
  using (auth.uid() = user_id);

-- Policy: Users can delete their own reactions
create policy "Users can delete own reactions" 
  on public.reactions for delete 
  using (auth.uid() = user_id);

-- Policy: Service role can manage all reactions
create policy "Service role can manage reactions" 
  on public.reactions for all 
  using (auth.role() = 'service_role');

-- Add has_all_judges column to profiles if not exists
alter table public.profiles add column if not exists has_all_judges boolean default false;
