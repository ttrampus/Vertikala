-- ============================================================================
-- Vertikala — prepreči lažno predstavljanje (spoofing) pri ustvarjanju vrstic
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Ugotovljeno v varnostnem pregledu: INSERT politike na BlogPost, comments in
-- likes imajo with_check = true, torej NIČESAR ne preverjajo o tem, čigav je
-- author_id/created_by_id/user_id v novi vrstici. Vsak prijavljen član lahko
-- trenutno prek neposrednega API klica vstavi objavo/komentar/všeček z ID-jem
-- DRUGEGA člana kot avtorja — aplikacija tega nikoli ne počne (vedno pošlje
-- auth.uid()), a RLS tega ne preprečuje na strani baze. To omogoča lažno
-- pripisovanje vsebine resničnim članom (npr. objava ali komentar, ki izgleda,
-- kot da ga je napisal nekdo drug).
--
-- ascents in trip_signups že imajo pravilen with_check (created_by_id/user_id
-- = auth.uid()) — ta popravek jih ne spreminja, dodaja enako zaščito še za
-- BlogPost, comments in likes.
-- ============================================================================

drop policy if exists "Authenticated users can insert posts" on public."BlogPost";
create policy "Authenticated users can insert posts"
  on public."BlogPost" for insert
  to authenticated
  with check ((auth.uid())::text = created_by_id);

drop policy if exists "Authenticated users can comment" on public.comments;
create policy "Authenticated users can comment"
  on public.comments for insert
  to authenticated
  with check (author_id = auth.uid());

drop policy if exists "Authenticated users can like" on public.likes;
create policy "Authenticated users can like"
  on public.likes for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================================
-- Po zagonu: objavo/komentar/všeček je mogoče ustvariti samo v svojem
-- imenu — created_by_id/author_id/user_id v novi vrstici se mora ujemati
-- s prijavljenim uporabnikom.
-- ============================================================================
