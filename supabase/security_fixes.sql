-- ============================================================================
-- Vertikala — varnostni popravki (Row Level Security)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor → New query.
-- Skripta je idempotentna (varno jo je pognati večkrat).
--
-- Ozadje: aplikacija do baze dostopa NEPOSREDNO iz brskalnika z javnim
-- "anon" ključem. Edina resnična varnostna meja je zato RLS v bazi — ne
-- koda v Reactu. Ta skripta zapre tri konkretne luknje in popravi gumb
-- "Naredi admina".
--
--  1) invitations — cela tabela (vključno s TOKENI) je bila berljiva vsem
--     anonimnim obiskovalcem → kdorkoli je lahko prebral povabila in se
--     registriral kot povabljena oseba (prevzem povabila).
--  2) comments.author_email — e-poštni naslovi članov so bili vidni vsem.
--  3) profile.role — brez zaščite bi lahko član z ročnim API klicem sam
--     sebi nastavil role='admin' (dvig privilegijev). Hkrati je manjkala
--     politika, da admin lahko spreminja vloge → gumb "Naredi admina" ni
--     deloval.
-- ============================================================================

-- ── Pomožna funkcija: ali je trenutni uporabnik admin? ─────────────────────
-- SECURITY DEFINER + ločena funkcija prepreči neskončno rekurzijo, ki bi
-- nastala, če bi politika na "profile" v svojem pogoju spet brala "profile".
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profile
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ============================================================================
-- 1) INVITATIONS — zapri tabelo, dostop samo prek varnih funkcij
-- ============================================================================
alter table public.invitations enable row level security;

-- Odstrani morebitne prej nastavljene (preohlapne) politike.
drop policy if exists "anon read invitations"            on public.invitations;
drop policy if exists "public read invitations"          on public.invitations;
drop policy if exists "Enable read access for all users" on public.invitations;
drop policy if exists "admin manage invitations"         on public.invitations;

-- Nihče (anon/authenticated) ne dostopa do tabele neposredno prek PostgREST.
revoke all on public.invitations from anon, authenticated;

-- Admini lahko upravljajo povabila (branje, ustvarjanje, brisanje) prek RLS.
create policy "admin manage invitations"
  on public.invitations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Preverjanje tokena BREZ razkritja tabele. Vrne samo varna polja za en
-- konkreten token. Token je treba že poznati (iz e-poštne povezave), zato
-- naštevanje ostalih povabil ni mogoče.
create or replace function public.validate_invitation(p_token text)
returns table (email text, expires_at timestamptz, used_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select email, expires_at, used_at
  from public.invitations
  where token::text = p_token
  limit 1;
$$;

revoke all on function public.validate_invitation(text) from public;
grant execute on function public.validate_invitation(text) to anon, authenticated;

-- Označi povabilo kot uporabljeno (kliče prijavljen uporabnik po registraciji).
-- Deluje samo za še neuporabljeno, nepotečeno povabilo.
create or replace function public.mark_invitation_used(p_token text)
returns void
language sql
security definer
volatile
set search_path = public
as $$
  update public.invitations
  set used_at = now()
  where token::text = p_token
    and used_at is null
    and expires_at > now();
$$;

revoke all on function public.mark_invitation_used(text) from public;
grant execute on function public.mark_invitation_used(text) to authenticated;


-- ============================================================================
-- 2) COMMENTS — skrij e-poštne naslove avtorjev pred branjem
-- ============================================================================
-- E-pošta se še vedno shrani ob oddaji komentarja (za administracijo), a je
-- ni več mogoče prebrati prek javnega API-ja. Odjemalec bere samo:
--   id, post_id, content, author_id, author_name, created_at
-- (glej src/components/CommentSection.jsx).
revoke select (author_email) on public.comments from anon, authenticated;

-- Če želite e-pošto vseeno videti kot admin, jo preberite v Dashboardu
-- (service_role obide RLS in stolpčne pravice).


-- ============================================================================
-- 3) PROFILE — prepreči samostojni dvig v admina + omogoči "Naredi admina"
-- ============================================================================
alter table public.profile enable row level security;

-- Branje profilov (ime, avatar) je javno — potrebno za prikaz avtorjev.
drop policy if exists "public read profiles" on public.profile;
create policy "public read profiles"
  on public.profile
  for select
  using (true);

-- Uporabnik lahko ustvari SVOJ profil (ob sprejemu povabila / registraciji).
drop policy if exists "insert own profile" on public.profile;
create policy "insert own profile"
  on public.profile
  for insert
  to authenticated
  with check (id = auth.uid());

-- Uporabnik lahko posodobi svoj profil; admin lahko posodobi kateregakoli
-- (to je tisto, kar potrebuje gumb "Naredi admina").
drop policy if exists "update own profile"       on public.profile;
drop policy if exists "admin update any profile" on public.profile;
create policy "update own or admin"
  on public.profile
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- KLJUČNA ZAŠČITA: samo admin lahko spremeni stolpec "role". Brez tega bi
-- lahko član pri posodobitvi svojega profila (dovoljeni zgoraj) hkrati
-- nastavil role='admin'. Sprožilec to prepreči na ravni vrstice.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Samo administrator lahko spremeni vlogo uporabnika.';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_guard_role on public.profile;
create trigger profile_guard_role
  before update on public.profile
  for each row
  execute function public.guard_profile_role();

-- ============================================================================
-- Konec. Po zagonu:
--   • Povabila/tokeni niso več javno berljivi.
--   • E-pošte v komentarjih niso več javno berljive.
--   • Član si ne more sam dodeliti admina.
--   • Gumb "Naredi admina" deluje (za administratorje).
-- ============================================================================
