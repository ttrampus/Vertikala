-- ============================================================================
-- Vertikala — javna/samo-za-člane vidnost objav
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Doda stolpec is_public na BlogPost (privzeto true, torej obstoječe objave
-- ostanejo javne kot doslej) in RESTRICTIVE politiko, ki jo Postgres pri RLS
-- vedno IN-druži z obstoječimi (permissivnimi) SELECT politikami — zato
-- omejitev velja NE GLEDE NA to, kakšna SELECT politika je že nastavljena v
-- nadzorni plošči (npr. status = 'published'). Avtorju/adminu, ki je
-- prijavljen, to ničesar ne zapre — spodnji pogoj je zanj vedno izpolnjen.
--
-- Pravilo: zasebno objavo (is_public = false) vidi samo prijavljen član
-- (kateri koli, ne le avtor ali admin) — anonimni obiskovalci je ne vidijo.
-- ============================================================================

alter table public."BlogPost" add column if not exists is_public boolean not null default true;

drop policy if exists "hide private posts from anon" on public."BlogPost";
create policy "hide private posts from anon"
  on public."BlogPost" as restrictive for select
  to public
  using (is_public = true or auth.uid() is not null);

-- ============================================================================
-- Po zagonu: zasebne objave (is_public = false) so vidne samo prijavljenim
-- članom; javne objave (privzeto, obstoječe objave) ostanejo vidne vsem.
-- ============================================================================
