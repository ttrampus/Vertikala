-- New table backing the "Tabori" section.
-- Run this in the Supabase SQL editor against the project referenced by
-- VITE_SUPABASE_URL — this is a live schema change, not something a
-- git push/deploy applies for you.
-- Requires public.is_admin() from security_fixes.sql (run that first if
-- it hasn't already been applied to this project).

create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date_from date not null,
  date_to date,
  location text,
  summary text,
  description text,
  image_url text,
  created_by_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Table already existed before "image_url"/"summary" were added here —
-- "create table if not exists" above is a no-op in that case, so add the
-- columns directly. "description" holds the full free-text details (where
-- it starts/ends, what to bring, rules…); "summary" is the short blurb
-- shown on the card in the list view.
alter table public.camps add column if not exists image_url text;
alter table public.camps add column if not exists summary text;

alter table public.camps enable row level security;

drop policy if exists "camps are viewable by everyone" on public.camps;
create policy "camps are viewable by everyone"
  on public.camps for select
  using (true);

-- Admin-only: the UI only exposes "Dodaj tabor" on the /admin route (gated
-- to isAdmin), but that's a client-side check only — without is_admin() here
-- too, any logged-in member could insert a camp directly via the API. This
-- keeps the DB in sync with what the UI actually allows.
drop policy if exists "authenticated users can insert camps" on public.camps;
drop policy if exists "admins can insert camps" on public.camps;
create policy "admins can insert camps"
  on public.camps for insert
  to authenticated
  with check (auth.uid() = created_by_id and public.is_admin());

drop policy if exists "owners and admins can delete camps" on public.camps;
create policy "owners and admins can delete camps"
  on public.camps for delete
  to authenticated
  using (auth.uid() = created_by_id or public.is_admin());

drop policy if exists "owners and admins can update camps" on public.camps;
create policy "owners and admins can update camps"
  on public.camps for update
  to authenticated
  using (auth.uid() = created_by_id or public.is_admin())
  with check (auth.uid() = created_by_id or public.is_admin());
