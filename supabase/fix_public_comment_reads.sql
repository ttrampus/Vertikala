-- ============================================================================
-- Vertikala — komentarji naj bodo vidni tudi odjavljenim obiskovalcem
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- TEŽAVA
-- Vloga "anon" nima pravice SELECT na tabeli public.comments. PostDetail.jsx
-- pa CommentSection prikaže vsem, tudi odjavljenim, in ta ob nalaganju vedno
-- pokliče select nad "comments". Odjavljen obiskovalec zato dobi
--   401  permission denied for table comments
-- razdelek "Razprava" ostane prazen (napaka konča le v konzoli), čeprav je na
-- kartici objave izpisano število komentarjev. Preverjeno: v bazi je 5
-- komentarjev, anon jih vidi 0.
--
-- Da je bil javni prikaz mišljen, kaže tudi pogled profile_public, ki obstaja
-- prav zato, da lahko anon prebere ime in avatar avtorja komentarja — in ki
-- ga CommentSection že uspešno bere.
--
-- POZOR: če komentarje NAMENOMA vidijo samo prijavljeni člani, te datoteke ne
-- zaganjajte — namesto tega naj CommentSection odjavljenim prikaže vabilo k
-- prijavi. Datoteka odpre komentarje javnosti.
-- ============================================================================

-- Samo stolpci, ki jih odjemalec res prikaže. author_email NI vključen — je
-- osebni podatek in v brskalnik ne sme, enako kot velja za prijavljene.
grant select (id, post_id, content, author_id, author_name, created_at)
  on public.comments to anon;

alter table public.comments enable row level security;

-- Pogoje vidnosti objave preverimo IZRECNO (objavljena, ni v košu, javna) in
-- se ne zanašamo na to, da bo RLS nad "BlogPost" podpoizvedbo že odfiltriral:
-- tako komentarji pod osnutkom ali članom vidno objavo ne uidejo v javnost
-- niti, če se politike nad "BlogPost" kdaj spremenijo.
drop policy if exists "public can read comments on public posts" on public.comments;
create policy "public can read comments on public posts"
  on public.comments for select
  to anon
  using (
    exists (
      select 1 from public."BlogPost" p
      where p.id = comments.post_id
        and p.status = 'published'
        and p.deleted_at is null
        and coalesce(p.is_public, true)
    )
  );

-- Preverjanje po zagonu (z anon ključem mora vrniti komentarje, ne 401):
--   curl "$SUPABASE_URL/rest/v1/comments?select=id,content&limit=5" \
--        -H "apikey: $ANON_KEY"
