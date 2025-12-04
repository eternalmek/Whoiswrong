-- Ensure public judgements can be filtered for feeds
alter table if exists public.judgements
  add column if not exists is_public boolean default true;

create index if not exists idx_judgements_is_public_created_at
  on public.judgements (is_public, created_at desc);
