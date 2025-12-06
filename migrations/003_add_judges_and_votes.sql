-- Judges catalogue for celebrity and default options
create table if not exists public.judges (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  is_celebrity boolean default false,
  is_default_free boolean default false,
  avatar_url text,
  description text,
  system_prompt text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Attach judge to judgements
alter table if exists public.judgements add column if not exists judge_id uuid;
create index if not exists idx_judgements_judge on public.judgements (judge_id);

-- Votes for public feed
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
