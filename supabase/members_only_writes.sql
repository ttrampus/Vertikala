-- ============================================================================
-- Vertikala — samo povabljeni člani lahko karkoli zapišejo
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- TEŽAVA
-- Registracija je opisana kot "samo na povabilo", a to doslej ni bilo nikjer
-- uveljavljeno: ključ anon je javno v JS paketu, zato si je lahko kdorkoli z
-- enim zahtevkom na /auth/v1/signup ustvaril potrjen račun (preverjeno — testni
-- račun je bil ustvarjen in takoj izbrisan). Enako pot odpira tudi prijava z
-- Googlom. Tak račun ni imel vrstice v "profile", a je vseeno dobil vlogo
-- authenticated — in politike, ki preverjajo samo "je prijavljen", so mu
-- dovolile pisati (objava, vzpon, komentar, všeček).
--
-- PRVI IN GLAVNI POPRAVEK JE V NADZORNI PLOŠČI (te datoteke ne nadomesti):
--   Authentication → Sign In / Providers → Email    → izklopite "Enable sign-ups"
--   Authentication → Sign In / Providers → Google   → izklopite (ali omejite)
-- Povabila delujejo naprej: inviteUserByEmail() je skrbniški klic s service
-- role in gre mimo tega stikala.
--
-- KAJ NAREDI TA DATOTEKA (obramba v globino)
-- Uvede is_member() — "ima vrstico v profile", torej je resnično član kluba,
-- ne le imetnik računa — in jo zahteva pri vsakem pisanju. Tudi če kdo račun
-- kako drugače dobi, ne more ničesar objaviti ali spremeniti.
--
-- NAMENOMA NE DOTAKNEMO TABELE "profile":
-- povabljeni član ob zaključku registracije (CompleteProfile.jsx) svojo vrstico
-- v "profile" šele ustvari — takrat is_member() še vrne false. Restriktivna
-- politika nad "profile" bi torej onemogočila prav zaključek povabila.
-- Prav tako ne omejujemo branja (SELECT): vsebina je javna in jo bere že anon.
-- ============================================================================

-- ── 1) Je prijavljeni uporabnik res član? ──────────────────────────────────
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.profile where id = auth.uid()); $$;

revoke all on function public.is_member() from public;
grant execute on function public.is_member() to anon, authenticated;


-- ── 2) Restriktivne politike: veljajo POVRH obstoječih ─────────────────────
-- Restriktivna politika se z obstoječimi permisivnimi sešteje z AND, zato jih
-- ni treba poznati ali spreminjati — nobena obstoječa pravica se ne razširi,
-- le doda se pogoj "mora biti član". Samo pisanje, branje ostane nedotaknjeno.
do $$
declare
  t text;
  tables text[] := array[
    'ascents', 'camps', 'site_content', 'trip_signups', 'comments', 'likes', '"BlogPost"'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "members only: insert" on public.%s', t);
    execute format('drop policy if exists "members only: update" on public.%s', t);
    execute format('drop policy if exists "members only: delete" on public.%s', t);

    execute format(
      'create policy "members only: insert" on public.%s as restrictive
         for insert to authenticated with check (public.is_member())', t);
    execute format(
      'create policy "members only: update" on public.%s as restrictive
         for update to authenticated using (public.is_member()) with check (public.is_member())', t);
    execute format(
      'create policy "members only: delete" on public.%s as restrictive
         for delete to authenticated using (public.is_member())', t);
  end loop;
end $$;


-- ── 3) SECURITY DEFINER funkcije gredo mimo RLS — pogoj mora biti v njih ───
-- Restriktivne politike zgoraj na add_comment()/toggle_like() ne vplivajo, ker
-- se izvajata s pravicami lastnika. Zato isto preverjanje dodamo v funkciji.
-- Telo je sicer nespremenjeno (glej add_post_comments.sql, toggle_post_likes.sql).
create or replace function public.add_comment(p_post_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_name text;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Za komentiranje se morate prijaviti.';
  end if;
  if not public.is_member() then
    raise exception 'Komentirajo lahko samo člani kluba.';
  end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'Komentar ne sme biti prazen.';
  end if;

  select u.email into v_email from auth.users u where u.id = auth.uid();
  select coalesce(pr.display_name, v_email) into v_author_name
  from public.profile pr where pr.id = auth.uid();

  insert into public.comments (post_id, content, author_id, author_name, author_email)
  values (p_post_id, trim(p_content), auth.uid(), coalesce(v_author_name, v_email), v_email);

  update public."BlogPost" set comments_count = coalesce(comments_count, 0) + 1 where id = p_post_id;
end;
$$;

revoke all on function public.add_comment(uuid, text) from public;
grant execute on function public.add_comment(uuid, text) to authenticated;

create or replace function public.toggle_like(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected int;
begin
  if auth.uid() is null or not public.is_member() then
    return null;
  end if;

  delete from public.likes where post_id = p_post_id and user_id = auth.uid();
  get diagnostics v_affected = row_count;

  if v_affected > 0 then
    update public."BlogPost" set likes_count = greatest(coalesce(likes_count, 0) - 1, 0) where id = p_post_id;
    return false;
  end if;

  insert into public.likes (post_id, user_id) values (p_post_id, auth.uid())
    on conflict (post_id, user_id) do nothing;
  get diagnostics v_affected = row_count;

  if v_affected > 0 then
    update public."BlogPost" set likes_count = coalesce(likes_count, 0) + 1 where id = p_post_id;
  end if;
  return true;
end;
$$;

revoke all on function public.toggle_like(uuid) from public;
grant execute on function public.toggle_like(uuid) to authenticated;


-- ============================================================================
-- Po zagonu preverite (vsi štirje člani imajo vrstico v profile, zato zanje
-- ni nobene spremembe):
--   • uredite objavo, dodajte vzpon, komentirajte — mora delovati kot prej;
--   • povabite testni naslov in dokončajte registracijo — mora delovati,
--     ker "profile" namenoma ni omejen.
-- ============================================================================
