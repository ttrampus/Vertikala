-- ============================================================================
-- Vertikala — ne razkrivaj role/is_owner/mfa_exempt čisto vsakomur
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Ugotovljeno v varnostnem pregledu: politika "Public can read profiles" ima
-- USING (true) za roles={public} — to pomeni, da lahko POPOLNOMA VSAK, tudi
-- neprijavljen obiskovalec, prek API-ja prebere role, is_owner in mfa_exempt
-- za VSAKEGA člana kluba (npr. profile?select=role,is_owner,mfa_exempt).
-- V praksi to pomeni, da lahko kdorkoli od zunaj ugotovi, kdo je admin/lastnik
-- IN kateri računi trenutno nimajo vklopljene MFA zahteve — slednje je
-- neposreden namig, kateri račun je najlažja tarča.
--
-- Aplikacija drugih uporabnikov role/is_owner/mfa_exempt nikoli ne prikazuje
-- (glej AdminDashboard.jsx, CommentSection.jsx, Home.jsx, PostDetail.jsx) —
-- javno je potrebno le ime in slika avtorja, lasten profil pa vsak uporabnik
-- seveda sme videti v celoti (za to app preverja isAdmin/isOwner).
--
-- Pristop: namesto USING(true) za celo tabelo dovolimo branje CELE vrstice
-- samo lastniku vrstice ali adminu (kot že velja za UPDATE), za javni prikaz
-- imena/slike avtorja drugih članov pa dodamo varen pogled (view) z zgolj
-- neobčutljivimi stolpci. Pogled NAMENOMA ni "security_invoker" — teče s
-- pravicami lastnika pogleda (torej vidi vse vrstice), a razkrije samo
-- stolpce, ki jih vsebuje: id, display_name, avatar_url, created_date.
-- ============================================================================

drop policy if exists "Public can read profiles" on public.profile;
drop policy if exists "own profile or admin can read full row" on public.profile;
create policy "own profile or admin can read full row"
  on public.profile for select
  to public
  using (auth.uid() = id or public.is_admin());

drop view if exists public.profile_public;
create view public.profile_public as
  select id, display_name, avatar_url, created_date
  from public.profile;

grant select on public.profile_public to anon, authenticated;

-- ============================================================================
-- Po zagonu:
--   • profile (osnovna tabela) — celotno vrstico (vključno z role/is_owner/
--     mfa_exempt) vidi samo lastnik te vrstice ali admin (AuthContext.jsx in
--     AdminDashboard.jsx uporabljata točno to, delujeta naprej brez sprememb).
--   • profile_public (nov pogled) — id/display_name/avatar_url/created_date
--     ostanejo javno vidni za VSE člane (za prikaz avtorja objave/komentarja
--     komurkoli drugemu). Home.jsx, PostDetail.jsx in CommentSection.jsx
--     morajo brati iz "profile_public", ne iz "profile" — glej spremljajoči
--     commit, ki to spremeni v kodi.
-- ============================================================================
