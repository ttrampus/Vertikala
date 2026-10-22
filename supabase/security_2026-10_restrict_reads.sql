-- ============================================================================
-- Vertikala — zapri bralni dostop do podatkov, ki jih UI ne kaže (finding 7)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- ⚠ NAJPREJ PREIZKUS NA VEJI: te spremembe zadevajo BRANJE prek RLS. Preden
--   jih uveljavite na produkciji, jih poženite na Supabase preview veji in
--   preverite: javna stran (objave, komentarji, galerije), prijavljen član
--   (komentarji, všečki), skrbniška plošča. Spodaj so poizvedbe za preverjanje.
--
-- Kaj zapira:
--   • BlogPost: izbrisane (deleted_at) objave niso več berljive prek API-ja za
--     anon/druge člane (ostale so vidne, ker pravilnik gleda samo status).
--   • comments: anon je zaradi preširokega pravilnika "Anyone can read
--     comments" (true) bral komentarje VSEH objav, tudi nejavnih/neobjavljenih.
--   • trip_signups: imena in id-ji prijavljenih so bili javni (vpisna forma je
--     odstranjena).
--   • likes: kdo je kaj všečkal, je bilo javno (prek profile_public → ime).
-- ============================================================================

-- ── BlogPost: skrij izbrisane (restriktivno = doda pogoj z AND) ─────────────
drop policy if exists "hide deleted posts" on public."BlogPost";
create policy "hide deleted posts" on public."BlogPost"
  as restrictive for select to public
  using (
    deleted_at is null
    or public.is_admin()
    or (auth.uid())::text = created_by_id
  );
-- (Skrbniška plošča bere koš prek admin_list_posts() — SECURITY DEFINER, mimo
--  RLS — zato ta pravilnik koša v plošči ne skrije. Avtor vidi svoje izbrisane
--  objave prek pogoja created_by_id.)

-- ── comments: odstrani preširok "vse lahko bere", ohrani pravo vedenje ──────
-- anon: samo komentarji javnih, objavljenih, neizbrisanih objav (ta pravilnik
--       že obstaja: "public can read comments on public posts").
-- authenticated (člani): še naprej berejo vse komentarje (člani vidijo vse
--       objave) — zato dodamo izrecen pravilnik za prijavljene.
drop policy if exists "Anyone can read comments" on public.comments;
drop policy if exists "members can read comments" on public.comments;
create policy "members can read comments" on public.comments
  for select to authenticated
  using (true);

-- ── trip_signups: samo lastnik vpisa in skrbnik ─────────────────────────────
drop policy if exists "trip_signups_select" on public.trip_signups;
drop policy if exists "trip_signups owner or admin read" on public.trip_signups;
create policy "trip_signups owner or admin read" on public.trip_signups
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ── likes: bere jih le prijavljen uporabnik (za svoje stanje všečka) ────────
-- LikeButton bere vrstice samo za trenutnega uporabnika; števec pride iz
-- BlogPost.likes_count, zato javno branje tabele likes ni potrebno.
drop policy if exists "Anyone can read likes" on public.likes;
drop policy if exists "members can read likes" on public.likes;
create policy "members can read likes" on public.likes
  for select to authenticated
  using (true);

-- ── Preverjanje (na veji, kot anon in kot prijavljen) ──────────────────────
--   -- anon ne sme videti izbrisane objave:
--   select count(*) from "BlogPost" where deleted_at is not null;   -- 0 za anon
--   -- komentarji javne objave so še vidni anon; všečki niso:
--   select count(*) from likes;                                      -- 0 za anon
--   select count(*) from trip_signups;                               -- 0 za anon
