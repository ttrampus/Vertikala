-- ============================================================================
-- Vertikala — skrij e-poštne naslove prijavljenih na izlet
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Isti razred težave kot pri comments.author_email (glej security_fixes.sql,
-- razdelek 2): TripSignupButton.jsx bere seznam prijavljenih s `select("*")`
-- in ga prikazuje BREZ prijave (vsak obiskovalec objave vidi seznam), a v UI
-- izriše samo user_name. Če ima trenutna SELECT politika na trip_signups
-- dovoljenje na ravni cele tabele (kar je pri javno berljivih tabelah
-- pogosto), stolpec user_email pušča skozi isti API klic, tudi če ga
-- vmesnik ne prikaže — kdorkoli lahko e-pošto prebere neposredno iz
-- omrežnega odgovora.
--
-- POZOR: samo "revoke select (user_email)" NE deluje, če vloga že ima SELECT
-- na celotni tabeli — pravica na ravni tabele pokriva vse stolpce. Zato
-- najprej odvzamemo tabelni SELECT, nato podelimo SELECT le na varne
-- stolpce, ki jih TripSignupButton.jsx dejansko bere.
-- ============================================================================

revoke select on public.trip_signups from anon, authenticated;
grant select (id, post_id, user_id, user_name, created_at)
  on public.trip_signups to anon, authenticated;

-- ============================================================================
-- Po zagonu: seznam prijavljenih na izlet ostane javno viden (ime, ne
-- e-pošta) — e-pošta ostane shranjena in vidna adminu v Dashboardu
-- (service_role obide stolpčne pravice).
-- ============================================================================
