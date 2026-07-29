-- ============================================================================
-- Vertikala — skrij e-poštne naslove avtorjev objav pred javnim branjem
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Isti razred težave kot comments.author_email (security_fixes.sql, razdelek 2)
-- in trip_signups.user_email (restrict_trip_signups_email.sql): BlogPost je
-- javno berljiva tabela (objave so vidne brez prijave), zato tabelna SELECT
-- pravica pokriva VSE stolpce, vključno z author_email — kdorkoli je lahko
-- doslej prebral e-pošto avtorja neposredno iz API odgovora
-- (npr. ?select=author_email), čeprav je vmesnik nikjer ne prikazuje.
--
-- Admin nadzorna plošča (AdminDashboard.jsx) author_email POTREBUJE za prikaz
-- v seznamu objav. Ker je "authenticated" v Postgresu ena sama vloga (deli jo
-- vsak prijavljen član, ne le admini), navadna stolpčna pravica ne loči
-- admina od navadnega člana — zato author_email adminu ponudimo prek
-- SECURITY DEFINER funkcije, ki interno preveri is_admin(), namesto prek
-- stolpčne pravice na tabeli. AdminDashboard.jsx zdaj kliče to funkcijo
-- namesto neposrednega branja tabele.
-- ============================================================================

revoke select on public."BlogPost" from anon, authenticated;
grant select (
  id, title, summary, content, featured_image, images, tags, category,
  climb_metadata, status, author_name, created_by, created_by_id,
  created_date, updated_date, deleted_at, is_public, is_sample,
  likes_count, comments_count, views_count, wp_id
) on public."BlogPost" to anon, authenticated;

-- Admin-only branje z author_email (in vsemi stolpci). Vrne prazen set, če
-- klicatelj ni admin — varno tudi če jo pokliče kdorkoli iz brskalnika.
create or replace function public.admin_list_posts()
returns setof public."BlogPost"
language sql
security definer
stable
set search_path = public
as $$
  select * from public."BlogPost"
  where public.is_admin()
  order by created_date desc;
$$;

revoke all on function public.admin_list_posts() from public;
grant execute on function public.admin_list_posts() to authenticated;

-- ============================================================================
-- Po zagonu: author_email ni več berljiv prek javnega API-ja (anon in navadni
-- prijavljeni člani ga ne vidijo); admin nadzorna plošča ga še vedno prikaže
-- prek admin_list_posts().
-- ============================================================================
