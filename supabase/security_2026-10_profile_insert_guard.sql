-- ============================================================================
-- Vertikala — blokiraj stopnjevanje pravic ob USTVARJANJU profila (kritično)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- TEŽAVA
-- Profil si vsak uporabnik ustvari sam iz brskalnika (CompleteProfile.jsx,
-- AcceptInvite.jsx). Pravilnik INSERT dovoli samo id = auth.uid(), stolpci
-- role, is_owner in mfa_exempt pa so bili nezaščiteni: povabljeni uporabnik,
-- ki profila še ni ustvaril, je lahko poslal
--   insert into profile(id, display_name, role, is_owner, mfa_exempt)
--   values (auth.uid(), 'x', 'admin', true, true)
-- in postal lastnik, skrbnik in izvzet iz MFA. guard_profile_role() je tekel
-- samo ob UPDATE, zato INSERT ni preverjal nihče in sprememba se tudi ni
-- zapisala v audit_log.
--
-- POPRAVEK
-- Sprožilec BEFORE INSERT vsili varne privzete vrednosti za vsak profil, ki
-- nastane iz aplikacije (auth.uid() ni null). Strežniški izhod v sili prek SQL
-- Editorja (auth.uid() je null) sme vrednosti še vedno nastaviti — tako kot pri
-- obstoječem guard_profile_role(). Pravico do kasnejše spremembe vloge še
-- naprej varuje obstoječi sprožilec BEFORE UPDATE (samo lastnik + MFA).
-- ============================================================================

create or replace function public.guard_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Strežnik (SQL Editor / service_role): auth.uid() je null — brez omejitev,
  -- da ostane mogoč začetni zagon lastnika/skrbnika.
  if auth.uid() is null then
    return new;
  end if;

  -- Vsak profil, ki nastane iz aplikacije, je navaden član. Vlogo lahko potem
  -- dvigne samo lastnik z MFA (guard_profile_role na UPDATE).
  new.role       := 'user';
  new.is_owner   := false;
  new.mfa_exempt := false;
  return new;
end;
$$;

drop trigger if exists profile_guard_insert on public.profile;
create trigger profile_guard_insert
  before insert on public.profile
  for each row execute function public.guard_profile_insert();

-- ── Preverjanje (po zagonu) ────────────────────────────────────────────────
-- Noben član ne sme biti skrbnik/lastnik/izvzet, ki ga niste nastavili vi:
--   select id, display_name, role, is_owner, mfa_exempt, created_date
--   from public.profile
--   where role = 'admin' or is_owner or mfa_exempt
--   order by created_date;
