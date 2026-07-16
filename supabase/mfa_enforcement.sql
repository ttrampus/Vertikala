-- ============================================================================
-- Vertikala — MFA na ravni baze (AAL2) + izjema za posamezen račun
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase SQL Editor. Idempotentno.
--
-- Kaj naredi:
--   • doda stolpec profile.mfa_exempt — "prepustnica", ki za posamezen račun
--     ZAČASNO izklopi zahtevo po MFA (tudi v UI). To je vaš izhod v sili
--     (npr. če izgubite telefon) IN način, da račun začasno uporablja nekdo
--     brez MFA;
--   • zahteva preverjeno MFA (AAL2) za občutljiva skrbniška dejanja (spremembe
--     vlog, upravljanje povabil) — razen za račune z mfa_exempt = true.
--
-- OPOMBA: TOTP je v Supabase že vklopljen (uspešno ste se registrirali z QR).
-- V Supabase ni treba ničesar dodatno vklapljati — "baza MFA" je ta skripta.
-- ============================================================================


-- ── 0) Prepustnica (mfa_exempt) ────────────────────────────────────────────
alter table public.profile add column if not exists mfa_exempt boolean not null default false;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ STIKALO: ZAČASNO IZKLOPI MFA ZA LASTNIKA (tim.trampus0@gmail.com)         │
-- │ Ta vrstica je AKTIVNA — po zagonu lahko račun uporablja druga oseba BREZ  │
-- │ MFA. Ko želite MFA spet VKLOPITI, zaženite spodnjo vrstico s false.       │
-- └──────────────────────────────────────────────────────────────────────────┘
update public.profile p set mfa_exempt = true
from auth.users u
where u.id = p.id and lower(u.email) = 'tim.trampus0@gmail.com';

-- PONOVEN VKLOP MFA za lastnika (zaženite, ko izjeme ne potrebujete več):
--   update public.profile p set mfa_exempt = false
--   from auth.users u
--   where u.id = p.id and lower(u.email) = 'tim.trampus0@gmail.com';


-- ── 1) Admin + (preverjena MFA ALI prepustnica) ────────────────────────────
create or replace function public.is_admin_mfa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
     and (
       coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
       or exists (select 1 from public.profile where id = auth.uid() and mfa_exempt = true)
     );
$$;

revoke all on function public.is_admin_mfa() from public;
grant execute on function public.is_admin_mfa() to authenticated;


-- ── 2) Povabila: upravljanje zahteva is_admin_mfa() ────────────────────────
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


-- ── 3) Spremembe vlog: zahtevaj is_admin_mfa() ─────────────────────────────
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
-- Po zagonu:
--   • Lastnikov račun (za zdaj) NE zahteva MFA → uporablja ga lahko druga oseba.
--   • Vsi drugi admini še vedno potrebujejo preverjeno MFA (UI + baza).
--   • Izhod v sili ob izgubi telefona: nastavite mfa_exempt = true za svoj račun.
-- ============================================================================
