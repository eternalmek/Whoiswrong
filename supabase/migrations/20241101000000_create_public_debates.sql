-- Create public_debates table for SEO-friendly public debate pages
create table if not exists public.public_debates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete set null,
  judgement_id uuid references public.judgements(id) on delete cascade,
  slug text not null unique,
  title text not null,
  content text,
  judge_id text references public.judges(id) on delete set null,
  verdict text,
  is_public boolean default true,
  is_indexable boolean default true
);

create index if not exists idx_public_debates_slug on public.public_debates (slug);
