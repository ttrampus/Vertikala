-- ============================================================================
-- Vertikala — imena članov za predloge pri vpisu vzpona
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- ZAKAJ
-- Plezalec in soplezalec se vpisujeta ročno, zato se isto ime piše na več
-- načinov ("Krištof" / "Krištof Perc") in "Moji vzponi", izvoz ter opozorilo
-- o podvojenem vzponu ne povežejo s pravim članom. Obrazec zato med
-- tipkanjem predlaga imena članov, ki se vpišejo natanko tako kot v profilu.
--
-- KAJ VRNE
-- Samo prikazna imena, nič drugega iz profila (vloga, nastavitve …). Vrstico
-- profila sme član še vedno brati le svojo — ta funkcija to pravilo namenoma
-- obide (security definer), a samo za stolpec display_name in samo za
-- prijavljene člane. Anonimni obiskovalci je ne morejo klicati.
-- ============================================================================

create or replace function public.member_names()
returns table (display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select trim(p.display_name)
  from public.profile p
  where public.is_member()
    and coalesce(trim(p.display_name), '') <> ''
  order by 1;
$$;

revoke all on function public.member_names() from public, anon;
grant execute on function public.member_names() to authenticated;
