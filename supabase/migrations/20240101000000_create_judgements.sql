-- Creates a judgements table to persist each AI verdict.

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
  user_id text, -- optional: map to auth users if you use authentication
  created_at timestamptz default now()
);

-- index for fetching recent entries
create index if not exists idx_judgements_created_at on public.judgements (created_at desc);