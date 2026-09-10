-- ============================================================================
-- Vertikala — žarišče naslovne slike (focal point)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- ZAKAJ
-- Kartice in glava objave imajo stalno obliko (širok pravokotnik), naslovne
-- slike pa ne — pokončna fotografija ali plakat se v širok okvir ne prilega.
-- Slika okvir vedno zapolni, odreže pa se tisto, kar štrli čez. Doslej se je
-- rezalo od sredine, zato so pokončnim fotografijam odpadle glave, plakatom
-- pa robovi z besedilom.
--
-- KAJ HRANI STOLPEC
-- CSS object-position, npr. '50% 25%' — točka na sliki, ki mora OSTATI vidna.
-- '0% 0%' je zgornji levi kot, '100% 100%' spodnji desni. NULL pomeni sredino
-- (torej natanko dosedanje vedenje), zato obstoječih objav ni treba popravljati
-- in se do prvega urejanja prav nič ne spremeni.
--
-- Točko se nastavi v urejevalniku objave s klikom na sliko.
-- ============================================================================

alter table public."BlogPost"
  add column if not exists focal_point text;

comment on column public."BlogPost".focal_point is
  'CSS object-position naslovne slike, npr. ''50% 25%''. NULL = sredina.';

-- Varovalka: samo dva odstotka, ločena s presledkom. Preprečuje, da bi se v
-- stolpec prikradlo poljubno besedilo, ki bi ga stran vstavila v CSS.
alter table public."BlogPost"
  drop constraint if exists blogpost_focal_point_format;

alter table public."BlogPost"
  add constraint blogpost_focal_point_format
  check (focal_point is null or focal_point ~ '^\d{1,3}% \d{1,3}%$');

-- Pravice po stolpcih
-- Tabela BlogPost pravice podeljuje po posameznih stolpcih, ne za celo tabelo,
-- zato nov stolpec sam po sebi ni viden nikomur: branje objav bi vrnilo napako
-- 42501 "permission denied" in stran bi ostala prazna. Podelitev je dodatna in
-- obstoječih pravic ne spreminja.
grant select (focal_point) on public."BlogPost" to anon, authenticated;
grant insert (focal_point), update (focal_point) on public."BlogPost" to authenticated;
