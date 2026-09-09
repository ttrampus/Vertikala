-- ============================================================================
-- Vertikala — urejanje vsebine podstrani iz same spletne strani
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Namen: vsebina strani "Alpinistična šola" (inštruktorji, datum uvodnega
-- sestanka, moduli, besedila, slika) je bila zapisana v kodi, zato jo je bilo
-- mogoče spremeniti le z novo objavo strani. Ker se ti podatki menjajo vsako
-- leto, so zdaj v bazi in jih admin ureja z gumbom "Uredi stran" kar na
-- strani sami.
--
-- Vsebina je en sam JSONB zapis na stran (id = 'alpine-school'). Odjemalec ga
-- zlije prek privzete vsebine v src/lib/schoolContent.js, zato:
--   • stran deluje enako kot doslej, dokler nihče ničesar ne uredi (in tudi
--     če je baza nedosegljiva) — privzeta vsebina je še vedno v kodi;
--   • kasneje dodano polje ne pokvari že shranjenega zapisa.
-- ============================================================================

create table if not exists public.site_content (
  id          text primary key,
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.site_content enable row level security;

-- Brati sme kdorkoli: strani so javne, vsebina se izriše tudi odjavljenim.
drop policy if exists "site content is viewable by everyone" on public.site_content;
create policy "site content is viewable by everyone"
  on public.site_content for select
  using (true);

-- Pisati smejo samo admini. Enako kot pri taborih (create_camps.sql) to NI
-- le skrit gumb v vmesniku — brez te politike bi lahko katerikoli prijavljen
-- član vsebino zamenjal neposredno prek API-ja.
do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() ne obstaja — najprej zaženite supabase/security_fixes.sql';
  end if;
end $$;

drop policy if exists "admins can insert site content" on public.site_content;
create policy "admins can insert site content"
  on public.site_content for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins can update site content" on public.site_content;
create policy "admins can update site content"
  on public.site_content for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- updated_at/updated_by vzdržuje baza, da ju odjemalec ne more napačno
-- nastaviti (in da je v zapisu vedno vidno, kdo je nazadnje urejal).
create or replace function public.touch_site_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch
  before insert or update on public.site_content
  for each row execute function public.touch_site_content();

-- Prazen zapis, da ima stran kaj posodabljati; vsebina pride iz privzetih
-- vrednosti v kodi, dokler je admin prvič ne shrani.
insert into public.site_content (id, content)
values ('alpine-school', '{}'::jsonb)
on conflict (id) do nothing;
