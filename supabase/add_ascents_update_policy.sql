-- Lets an ascent's owner or an admin edit it (needed for the new "Uredi"
-- button in the admin dashboard's Vzponi tab). Run in the Supabase SQL
-- editor against the project referenced by VITE_SUPABASE_URL.
-- Requires public.is_admin() from security_fixes.sql.
--
-- The ascents table's other RLS policies (select/insert/delete) were set up
-- directly in the Supabase dashboard, not tracked in this repo, so this only
-- adds what's missing rather than assuming anything about what's already
-- there — safe to run even if you're not sure an UPDATE policy exists yet.

alter table public.ascents enable row level security;

drop policy if exists "owners and admins can update ascents" on public.ascents;
create policy "owners and admins can update ascents"
  on public.ascents for update
  to authenticated
  using (auth.uid() = created_by_id or public.is_admin())
  with check (auth.uid() = created_by_id or public.is_admin());
