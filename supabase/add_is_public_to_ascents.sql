-- ============================================================================
-- Vertikala — javna/samo-za-člane vidnost vzponov
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Doda stolpec is_public na ascents (privzeto true, torej obstoječi vnosi
-- ostanejo javni kot doslej) in RESTRICTIVE politiko, ki jo Postgres pri RLS
-- vedno IN-druži z obstoječimi (permissivnimi) SELECT politikami — zato
-- omejitev velja NE GLEDE NA to, kakšna SELECT politika je že nastavljena v
-- nadzorni plošči (glej opombo v add_ascents_update_policy.sql: politike
-- select/insert/delete na ascents niso sledene v tem repozitoriju).
--
-- Pravilo: zaseben vnos (is_public = false) vidi samo prijavljen član
-- (kateri koli, ne le lastnik ali admin) — anonimni obiskovalci ga ne vidijo.
-- ============================================================================

alter table public.ascents add column if not exists is_public boolean not null default true;

drop policy if exists "hide private ascents from anon" on public.ascents;
create policy "hide private ascents from anon"
  on public.ascents as restrictive for select
  to public
  using (is_public = true or auth.uid() is not null);

-- ============================================================================
-- Po zagonu: zasebni vzponi (is_public = false) so vidni samo prijavljenim
-- članom; javni vzponi (privzeto, obstoječi vnosi) ostanejo vidni vsem.
-- ============================================================================
