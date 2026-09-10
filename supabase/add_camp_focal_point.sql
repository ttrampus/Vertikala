-- ============================================================================
-- Vertikala — žarišče slike tabora (focal point)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Isto kot add_focal_point.sql, le za tabore: kartica tabora in glava
-- podrobnosti imata stalno obliko, slika pa ne, zato se odreže tisto, kar
-- štrli čez okvir. Stolpec pove, katera točka slike mora ostati vidna.
-- NULL pomeni sredino, torej dosedanje vedenje.
--
-- Za razliko od tabele "BlogPost" tu pravice niso podeljene po stolpcih
-- (stran bere camps s "select *"), zato dodatnih GRANT stavkov ni treba.
-- ============================================================================

alter table public.camps
  add column if not exists focal_point text;

comment on column public.camps.focal_point is
  'CSS object-position slike tabora, npr. ''50% 25%''. NULL = sredina.';

alter table public.camps
  drop constraint if exists camps_focal_point_format;

alter table public.camps
  add constraint camps_focal_point_format
  check (focal_point is null or focal_point ~ '^\d{1,3}% \d{1,3}%$');
