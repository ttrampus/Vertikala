-- ============================================================================
-- Vertikala — obvezna dvostopenjska prijava (MFA/AAL2) za skrbniška dejanja
-- ============================================================================
-- ⚠️  ZAŽENITE ŠELE, KO STE NA SVOJEM ADMIN RAČUNU USPEŠNO NASTAVILI MFA
--     (odprite /admin in dokončajte nastavitev s QR kodo). Šele takrat ima
--     vaša seja raven "aal2".
--
-- Zakaj ločena datoteka: odjemalčeva zaščita (AdminMfaGate) ščiti le UI —
-- napadalec z geslom bi lahko klical API mimo nje. Ta skripta zahteva aal2
-- na ravni baze za občutljiva skrbniška pisanja (spremembe vlog, povabila),
-- kar velja tudi za neposredne API klice.
--
-- IZHOD V SILI: SQL Editor (service_role) obide RLS, zato lahko te spremembe
-- kadarkoli razveljavite tukaj, tudi če se v aplikaciji izključite.
-- ============================================================================


-- Admin + preverjena MFA v tej seji.
create or replace function public.is_admin_mfa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
     and coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

revoke all on function public.is_admin_mfa() from public;
grant execute on function public.is_admin_mfa() to authenticated;


-- ── Povabila: upravljanje zahteva aal2 ─────────────────────────────────────
drop policy if exists "Admins can create invitations" on public.invitations;
drop policy if exists "Admins can update invitations" on public.invitations;
drop policy if exists "Admins can delete invitations" on public.invitations;

create policy "Admins can create invitations"
  on public.invitations for insert to authenticated
  with check (public.is_admin_mfa());
create policy "Admins can update invitations"
  on public.invitations for update to authenticated
  using (public.is_admin_mfa()) with check (public.is_admin_mfa());
create policy "Admins can delete invitations"
  on public.invitations for delete to authenticated
  using (public.is_admin_mfa());


-- ── Spremembe vlog: zahtevaj aal2 ──────────────────────────────────────────
-- Nadgradnja guard_profile_role iz security_fixes.sql: poleg lastništva in
-- admina zahteva še preverjeno MFA za spremembo vloge iz aplikacije.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not distinct from old.role
     and new.is_owner is not distinct from old.is_owner then
    return new;
  end if;

  if auth.uid() is null then           -- strežniški izhod v sili (SQL Editor)
    return new;
  end if;

  if new.is_owner is distinct from old.is_owner then
    raise exception 'Zastavice lastnika ni mogoče spremeniti iz aplikacije.';
  end if;

  if not public.is_admin_mfa() then
    raise exception 'Za spreminjanje vlog je potrebna dvostopenjska prijava (admin + MFA).';
  end if;

  if old.is_owner then
    raise exception 'Lastniku ni mogoče odvzeti pravic.';
  end if;

  return new;
end;
$$;

-- ============================================================================
-- Razveljavitev (če se izključite): v SQL Editorju zamenjajte is_admin_mfa()
-- nazaj z is_admin() v zgornjih politikah in v guard_profile_role.
-- ============================================================================
