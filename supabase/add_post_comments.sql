-- ============================================================================
-- Vertikala — pravilno štetje komentarjev + zaščita pred lažnim imenom
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Ista težava kot pri ogledih/všečkih: BlogPost ima samo EN UPDATE policy
-- ("Authors can update own posts", auth.uid() = created_by_id), zato je
-- CommentSection.jsx-ov neposredni `update({ comments_count: newCount })`
-- doslej deloval samo, ko je avtor komentiral svojo lastno objavo. Komentar
-- sam se je pravilno shranil (comments ima svojo pravilno INSERT politiko),
-- a števec na BlogPost.comments_count se za komentarje drugih članov ni
-- posodobil. Poleg tega je odjemalec računal novo število kot
-- `comments.length + 1` iz TRENUTNO naloženega seznama (omejenega na 100) —
-- netočno tudi samo po sebi, neodvisno od RLS.
--
-- Rešitev: en sam add_comment() klic namesto insert() + ločen update().
-- Funkcija:
--   • prišteje +1 SAMO ob dejansko uspešnem vstavljanju komentarja — šteje
--     ni mogoče napihniti brez dejanskega objavljanja komentarjev;
--   • avtorjevo ime prebere iz profila NA STREŽNIKU (namesto da bi zaupala
--     imenu, ki ga pošlje odjemalec) — prej bi lahko kdorkoli komentiral
--     pod poljubnim imenom (npr. "Predsednik kluba"), ne le pod svojim.
-- ============================================================================

-- Poravnaj obstoječi comments_count z dejanskim številom vrstic — glede na
-- zgornjo težavo je bil za marsikatero objavo netočen.
update public."BlogPost" p
set comments_count = coalesce((select count(*) from public.comments c where c.post_id = p.id), 0);

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

-- ============================================================================
-- Po zagonu: CommentSection.jsx mora klicati rpc("add_comment", ...) namesto
-- insert() na "comments" + ločen update() na BlogPost.
-- ============================================================================
