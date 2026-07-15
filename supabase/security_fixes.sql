-- ============================================================================
-- Vertikala — varnostni popravki (Row Level Security)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor → New query.
-- Skripta je idempotentna (varno jo je pognati večkrat).
--
-- Ta različica je prilagojena OBSTOJEČIM politikam v vaši bazi (RLS je že
-- vklopljen na vseh tabelah). Popravi le tisto, kar dejansko pušča, in se
-- NE dotika politik, ki že delujejo pravilno.
--
-- Ugotovitve (potrjene na živi bazi):
--   1) invitations — politika "Public can read invitations" USING(true) je
--      omogočala vsem branje povabil in TOKENOV → prevzem računa.
--   2) comments.author_email — politika "Anyone can read comments" USING(true)
--      + stolpčna pravica sta razkrivala e-pošte članov.
--   3) profile — "Users can update own profile" nima WITH CHECK, zato lahko
--      član pri urejanju svojega profila nastavi role='admin' (dvig privilegijev).
--   4) is_admin() — verjetni vzrok, da gumb "Naredi admina" ne deluje: če
--      trenutna funkcija bere vlogo iz JWT (vedno 'authenticated'), vrne vedno
--      false. Spodaj jo nadomestimo s pravilno, ki bere tabelo profile.
-- ============================================================================


-- ── 0) Pravilna is_admin(): bere tabelo profile, ne JWT ────────────────────
-- SECURITY DEFINER prepreči rekurzijo RLS in zagotovi, da preverjanje res
-- prebere vlogo iz baze. Podpis ostaja is_admin() -> boolean, zato obstoječe
-- politike ("Admins can update any profile") delujejo naprej — le pravilno.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profile
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ============================================================================
-- 1) INVITATIONS — odstrani javno branje, validacija prek varne funkcije
-- ============================================================================
-- Odstrani TOČNO tisto politiko, ki pušča (ime iz vaše baze).
drop policy if exists "Public can read invitations" on public.invitations;
-- Po tem na invitations ni več nobene SELECT politike → anon/član tabele ne
-- more brati neposredno. Sprejem povabila zato teče prek spodnjih funkcij.

-- Preverjanje tokena BREZ razkritja tabele: vrne samo varna polja za točno
-- znani token (naštevanje ostalih povabil ni mogoče). Kliče AcceptInvite.jsx.
create or replace function public.validate_invitation(p_token text)
returns table (email text, expires_at timestamptz, used_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select email, expires_at, used_at
  from public.invitations
  where token::text = p_token
  limit 1;
$$;
revoke all on function public.validate_invitation(text) from public;
grant execute on function public.validate_invitation(text) to anon, authenticated;

-- Označi povabilo kot uporabljeno (kliče prijavljen uporabnik po registraciji).
create or replace function public.mark_invitation_used(p_token text)
returns void
language sql
security definer
volatile
set search_path = public
as $$
  update public.invitations
  set used_at = now()
  where token::text = p_token
    and used_at is null
    and expires_at > now();
$$;
revoke all on function public.mark_invitation_used(text) from public;
grant execute on function public.mark_invitation_used(text) to authenticated;

-- (Utrjevanje) Ustvarjanje/brisanje/urejanje povabil naj bo samo za admine.
-- Trenutno lahko to počne KATERIKOLI prijavljen član (USING true). Pošiljanje
-- povabil v UI teče prek edge funkcije s service_role (obide RLS), sprejem pa
-- prek zgornje SECURITY DEFINER funkcije — zato ožitev na admine ničesar ne zlomi.
drop policy if exists "Authenticated users can create invitations" on public.invitations;
drop policy if exists "Authenticated users can update invitations" on public.invitations;
drop policy if exists "Authenticated users can delete invitations" on public.invitations;

create policy "Admins can create invitations"
  on public.invitations for insert to authenticated
  with check (public.is_admin());
create policy "Admins can update invitations"
  on public.invitations for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete invitations"
  on public.invitations for delete to authenticated
  using (public.is_admin());


-- ============================================================================
-- 2) COMMENTS — skrij e-poštne naslove avtorjev pred branjem
-- ============================================================================
-- Politiko "Anyone can read comments" pustimo (komentarji SO javni), a stolpec
-- author_email umaknemo iz dosega javnega API-ja. E-pošta ostane shranjena in
-- vidna adminu v Dashboardu (service_role obide stolpčne pravice).
-- Odjemalec (CommentSection.jsx) bere samo potrebne stolpce.
revoke select (author_email) on public.comments from anon, authenticated;


-- ============================================================================
-- 3) PROFILE — prepreči samostojni dvig v admina
-- ============================================================================
-- Politiki puščamo pri miru — "Users can update own profile" in
-- "Admins can update any profile" sta v redu. Manjka pa zaščita stolpca role:
-- ker "Users can update own profile" nima WITH CHECK, lahko član pri urejanju
-- svojega profila nastavi tudi role='admin'. Sprožilec to prepreči za vse
-- razen adminov (in s tem NE ovira gumba "Naredi admina").
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Samo administrator lahko spremeni vlogo uporabnika.';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_guard_role on public.profile;
create trigger profile_guard_role
  before update on public.profile
  for each row
  execute function public.guard_profile_role();

-- ============================================================================
-- Po zagonu:
--   • Povabila/tokeni niso več javno berljivi (validacija prek funkcije).
--   • Povabila lahko upravljajo le admini.
--   • E-pošte v komentarjih niso več javno berljive.
--   • Član si ne more sam dodeliti admina.
--   • Gumb "Naredi admina" deluje (pravilna is_admin()).
-- ============================================================================
