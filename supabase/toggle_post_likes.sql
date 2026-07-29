-- ============================================================================
-- Vertikala — pravilno štetje všečkov (deluje za vse, ne le za avtorja)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Ista težava kot pri ogledih (glej track_post_views.sql): BlogPost ima samo
-- EN UPDATE policy — "Authors can update own posts" (auth.uid() =
-- created_by_id) — zato je LikeButton.jsx-ov neposredni
-- `update({ likes_count: newCount })` doslej deloval SAMO, če je avtor
-- všečkal svojo lastno objavo. Všečki DRUGIH članov so se v tabelo "likes"
-- pravilno zapisali (tista tabela ima svojo pravilno INSERT politiko), a
-- števec na BlogPost.likes_count se ni posodobil — zato je bilo prikazano
-- število všečkov doslej verjetno prenizko za marsikatero objavo.
--
-- Rešitev: en sam toggle_like() klic namesto ločenega insert/delete +
-- neposredni update štetja. Funkcija:
--   • sama ugotovi trenutno stanje v bazi (ne zaupa stanju, ki ga pošlje
--     odjemalec) in ga preklopi — brez tekmovalnih pogojev med zavihki;
--   • šteje spremeni SAMO za +1/-1 glede na dejansko vstavljeno/izbrisano
--     vrstico, nikoli na poljubno vrednost;
--   • doda unique omejitev na (post_id, user_id), da isti član ne more
--     pomotoma dvakrat všečkati iste objave (npr. dva hitra klika/zavihka).
-- ============================================================================

-- Odstrani morebitne podvojene všečke iz stare implementacije (dva hitra
-- klika bi lahko oba uspela, preden se je stanje "liked" osvežilo), sicer
-- spodnja unique omejitev ne bo šla skozi.
delete from public.likes a
using public.likes b
where a.ctid < b.ctid
  and a.post_id = b.post_id
  and a.user_id = b.user_id;

alter table public.likes drop constraint if exists likes_post_id_user_id_key;
alter table public.likes add constraint likes_post_id_user_id_key unique (post_id, user_id);

-- Poravnaj obstoječi likes_count z dejanskim številom vrstic v likes — glede
-- na zgornjo težavo je bil za marsikatero objavo prenizek.
update public."BlogPost" p
set likes_count = coalesce((select count(*) from public.likes l where l.post_id = p.id), 0);

create or replace function public.toggle_like(p_post_id uuid)
returns boolean  -- true = zdaj všečkano, false = zdaj odvšečkano, null = neprijavljen
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected int;
begin
  if auth.uid() is null then
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
-- Po zagonu: LikeButton.jsx mora klicati rpc("toggle_like", ...) namesto
-- ločenega insert/delete na "likes" + update() na BlogPost.
-- ============================================================================
