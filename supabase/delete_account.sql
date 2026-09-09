-- ============================================================================
-- Vertikala — brisanje računov (član sam, skrbnik, lastnik)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Brisanje računa zahteva service role (auth.users ni dosegljiv iz brskalnika),
-- zato je tu ena SECURITY DEFINER funkcija, ki pravice preveri sama. Tako ni
-- treba postavljati nove edge funkcije — odjemalec kliče rpc('delete_account').
--
-- PRAVILA
--   • vsak član lahko izbriše SVOJ račun;
--   • skrbnik (admin) lahko briše samo navadne člane (role = 'user');
--   • lastnik (owner) lahko briše člane IN skrbnike;
--   • računa z zastavico lastnika NE more izbrisati nihče — niti lastnik sam.
--     To je namerna varovalka: klub tako ne more ostati brez lastnika, spletna
--     stran pa brez nekoga, ki lahko dodeljuje vloge. Če je res treba, se tak
--     račun odstrani ročno tukaj v SQL Editorju.
--
-- KAJ SE ZGODI Z VSEBINO
-- Vsebina kluba se OHRANI in se le odveže od računa (objave, vzponi, tabori,
-- komentarji), ker je to zgodovina društva in ne last posameznika. Izbrišejo se
-- samo osebne sledi: všečki, prijave na izlete in profil.
-- ============================================================================

create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_self boolean;
  v_target_role text;
  v_target_owner boolean;
begin
  if v_actor is null then
    raise exception 'Za brisanje računa morate biti prijavljeni.';
  end if;

  select role, coalesce(is_owner, false) into v_target_role, v_target_owner
  from public.profile where id = p_user_id;

  if not found then
    raise exception 'Uporabnik ne obstaja.';
  end if;

  -- Lastnika ne more izbrisati nihče, niti on sam.
  if v_target_owner then
    raise exception 'Računa lastnika ni mogoče izbrisati.';
  end if;

  v_is_self := (p_user_id = v_actor);

  if not v_is_self then
    if public.is_owner() then
      null;                                  -- lastnik: člane in skrbnike
    elsif public.is_admin() then
      if v_target_role = 'admin' then
        raise exception 'Skrbnik ne more izbrisati drugega skrbnika.';
      end if;
    else
      raise exception 'Nimate pravic za brisanje tega računa.';
    end if;
  end if;

  -- ── Vsebina kluba ostane, le odveže se od računa ────────────────────────
  -- POZOR: "BlogPost".created_by_id ni uuid ampak TEXT (ostanek uvoza iz
  -- prejšnjega sistema), zato je potreben izrecen ::text — brez njega Postgres
  -- javi "operator does not exist: text = uuid". Vse druge tabele imajo uuid.
  update public."BlogPost" set created_by_id = null where created_by_id = p_user_id::text;
  update public.ascents   set created_by_id = null where created_by_id = p_user_id;
  update public.camps     set created_by_id = null where created_by_id = p_user_id;
  update public.invitations set invited_by  = null where invited_by   = p_user_id;
  update public.audit_log set actor_id      = null where actor_id     = p_user_id;

  -- Komentarji ostanejo berljivi (ime se hrani v author_name), a se odvežejo
  -- od računa. Ker jih NE brišemo, comments_count ostane pravilen.
  update public.comments set author_id = null, author_email = null
  where author_id = p_user_id;

  -- ── Osebne sledi se odstranijo ──────────────────────────────────────────
  -- likes.user_id je NOT NULL, zato jih je treba izbrisati; števec popravimo
  -- za toliko, kolikor jih je ta član dejansko imel na posamezni objavi.
  update public."BlogPost" b
  set likes_count = greatest(coalesce(b.likes_count, 0) - sub.n, 0)
  from (select post_id, count(*) as n from public.likes
        where user_id = p_user_id group by post_id) sub
  where b.id = sub.post_id;

  delete from public.likes        where user_id = p_user_id;
  delete from public.trip_signups where user_id = p_user_id;
  delete from public.profile      where id      = p_user_id;
  delete from auth.users          where id      = p_user_id;
end;
$$;

revoke all on function public.delete_account(uuid) from public;
grant execute on function public.delete_account(uuid) to authenticated;
