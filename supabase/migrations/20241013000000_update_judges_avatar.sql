-- Add new judge fields and align naming
alter table public.judges add column if not exists photo_url text;
alter table public.judges add column if not exists personality_prompt text;
alter table public.judges add column if not exists category text;

-- Backfill from legacy columns when present
update public.judges
set photo_url = coalesce(photo_url, avatar_url),
    personality_prompt = coalesce(personality_prompt, system_prompt)
where photo_url is null or personality_prompt is null;

-- Ensure slug uniqueness
create unique index if not exists idx_judges_slug_unique on public.judges (slug);

-- Enable RLS and lock down writes
alter table public.judges enable row level security;

drop policy if exists "Judges are public" on public.judges;

drop policy if exists "Enable read access for all users" on public.judges;

create policy "Public can read active judges"
  on public.judges for select
  using (is_active is true);

create policy "Service role can manage judges"
  on public.judges for all
  using (auth.role() = 'service_role');

-- Storage bucket for generated avatars
insert into storage.buckets (id, name, public)
values ('judge-photos', 'judge-photos', true)
on conflict (id) do nothing;

create policy if not exists "Public read judge photos"
  on storage.objects for select
  using (bucket_id = 'judge-photos');

create policy if not exists "Service role upload judge photos"
  on storage.objects for insert
  with check (auth.role() = 'service_role' and bucket_id = 'judge-photos');

create policy if not exists "Service role update judge photos"
  on storage.objects for update
  using (auth.role() = 'service_role' and bucket_id = 'judge-photos')
  with check (auth.role() = 'service_role' and bucket_id = 'judge-photos');

create policy if not exists "Service role delete judge photos"
  on storage.objects for delete
  using (auth.role() = 'service_role' and bucket_id = 'judge-photos');
