-- ============================================================================
-- Vertikala — urejanje objav (popravek: urejanje ni delovalo za nikogar)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- TEŽAVA
-- Tabela "BlogPost" je imela en sam UPDATE policy — "Authors can update own
-- posts" (auth.uid() = created_by_id). Vseh 578 objav je bilo uvoženih iz
-- WordPressa (scripts/import-wp.mjs) in imajo created_by_id = NULL, zato se
-- pogoj `auth.uid() = NULL` ovrednoti v NULL → torej NE v true → RLS je
-- zavrnil vsak UPDATE. Posledice, ki so bile vidne v aplikaciji:
--   • urejanje objave (EditPost) je "uspelo" in preusmerilo na objavo, a
--     sprememb ni shranilo — niti kot admin;
--   • koš / mehko brisanje (deleted_at) ni nikoli ničesar premaknilo;
--   • preklop objavljeno/osnutek (status) ni deloval.
-- V bazi to potrdi: nobena objava nima updated_date != created_date in
-- nobena nima nastavljenega deleted_at.
--
-- Zakaj ni bilo napake: PostgREST ob zavrnitvi z RLS ne vrne napake, ampak
-- posodobi 0 vrstic. Odjemalec je klical .update().eq() brez .select(), zato
-- je dobil "uspeh" brez vrstic. (Odjemalec je zdaj popravljen tako, da tak
-- primer javi kot napako — glej EditPost.jsx in lib/deletePosts.js.)
--
-- REŠITEV
-- Dodamo politiko, ki adminom dovoli urejanje katerekoli objave — enako, kot
-- to že velja za tabori/camps (glej create_camps.sql). Obstoječa politika za
-- avtorje OSTANE: permissive politike se seštevajo (OR), zato član še naprej
-- ureja svoje objave, admin pa vse.
-- ============================================================================

-- Varovalo: brez is_admin() (security_fixes.sql) spodnja politika ne bi
-- delovala. Če je ni, raje glasno pademo, kot da tiho nastavimo napačen dostop.
do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() ne obstaja — najprej zaženite supabase/security_fixes.sql';
  end if;
end $$;

alter table public."BlogPost" enable row level security;

drop policy if exists "admins can update any post" on public."BlogPost";
create policy "admins can update any post"
  on public."BlogPost" for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Preverjanje (kot admin v SQL Editorju vrne obe politiki):
--   select polname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'BlogPost' and cmd = 'UPDATE';
