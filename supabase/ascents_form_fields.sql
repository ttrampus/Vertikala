-- ============================================================================
-- Vertikala — vzponi: vsa polja klubskega obrazca "Pregled alpinističnih vzponov"
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- ZAKAJ
-- Izvoz v Excel mora biti enak klubskemu obrazcu, ki ga člani oddajajo za
-- vsako leto posebej (stolpci ZAP.ŠT. … Skupno št. vzponov). Doslej je stran
-- hranila le del teh polj; spodnji stolpci dodajo manjkajoče. Na strani se
-- ne prikazujejo — samo v obrazcu za vnos in v izvozu.
--
-- Stolpec obrazca          → stolpec v tabeli
--   ŠIRŠA LOKACIJA         → region         (npr. KSA, Julijske alpe)
--   OŽJA LOKACIJA          → location       (že obstaja)
--   VRSTA VZPONA           → ascent_type    Prosto | Tehnični vzpon | Turni smuk | Pristop
--   VRSTA SMERI            → route_type     Skala | Sneg | Led | Kombinirano
--   TIP VZPONA             → conditions     K (kopni) | Z (zimski) | ZR (zimske razmere)
--   MESTO V NAVEZI         → rope_position  I (izmenično) | 1 (prvi) | 2 (drugi) | N (nenavezan)
--   ČAS VZPONA             → duration       prosto besedilo, npr. '5h30min'
--   KOMENTAR               → notes          (že obstaja)
--
-- Vsi so neobvezni (NULL), zato obstoječih vzponov ni treba popravljati.
-- Pravice: tabela ascents jih podeljuje za celo tabelo, RLS pa po vrsticah,
-- zato novi stolpci ne potrebujejo dodatnih GRANT-ov.
-- ============================================================================

alter table public.ascents
  add column if not exists region        text,
  add column if not exists ascent_type   text,
  add column if not exists route_type    text,
  add column if not exists conditions    text,
  add column if not exists rope_position text,
  add column if not exists duration      text;

-- Varovalke: samo vrednosti s spustnih seznamov obrazca (enake kot v
-- klubski Excel predlogi), da izvoz ostane berljiv za ostale v klubu.
alter table public.ascents drop constraint if exists ascents_ascent_type_check;
alter table public.ascents add constraint ascents_ascent_type_check
  check (ascent_type is null or ascent_type in ('Prosto', 'Tehnični vzpon', 'Turni smuk', 'Pristop'));

alter table public.ascents drop constraint if exists ascents_route_type_check;
alter table public.ascents add constraint ascents_route_type_check
  check (route_type is null or route_type in ('Skala', 'Sneg', 'Led', 'Kombinirano'));

alter table public.ascents drop constraint if exists ascents_conditions_check;
alter table public.ascents add constraint ascents_conditions_check
  check (conditions is null or conditions in ('K', 'Z', 'ZR'));

alter table public.ascents drop constraint if exists ascents_rope_position_check;
alter table public.ascents add constraint ascents_rope_position_check
  check (rope_position is null or rope_position in ('I', '1', '2', 'N'));
