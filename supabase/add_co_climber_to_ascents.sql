-- Adds a "soplezalec" (co-climber) field to the ascents log.
-- Run this in the Supabase SQL editor (or `supabase db execute`) against the
-- project referenced by VITE_SUPABASE_URL — this is a live schema change,
-- not something a git push/deploy applies for you.
alter table public.ascents
  add column if not exists co_climber text;
