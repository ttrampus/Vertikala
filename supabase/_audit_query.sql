-- ============================================================================
-- Vertikala — read-only varnostni pregled (NIČESAR ne spremeni)
-- ============================================================================
-- Zaženite v Supabase Dashboard → SQL Editor. Vrne EN sam rezultat (ena
-- vrstica, en stolpec "report") z vsemi tremi razdelki združenimi v en
-- besedilni blok — Supabase-jev SQL editor sicer pri več "select" stavkih
-- naenkrat prikaže samo rezultat zadnjega, zato je bilo prejšnjič vidno le
-- razdelek 3. Kliknite na celico "report" in kopirajte celotno vsebino
-- (ali izvozite vrstico kot CSV) ter mi jo prilepite nazaj.

with rls as (
  select string_agg(
    format('%s: rls_enabled=%s rls_forced=%s', relname, relrowsecurity, relforcerowsecurity),
    E'\n' order by relname
  ) as txt
  from pg_class
  join pg_namespace on pg_namespace.oid = pg_class.relnamespace
  where pg_namespace.nspname = 'public' and relkind = 'r'
),
pol as (
  select string_agg(
    format('%s | %s | permissive=%s | roles=%s | cmd=%s | using=(%s) | with_check=(%s)',
      tablename, policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')),
    E'\n' order by tablename, policyname
  ) as txt
  from pg_policies
  where schemaname = 'public'
),
grants as (
  select string_agg(format('%s (%s): %s', table_name, grantee, columns), E'\n' order by table_name, grantee) as txt
  from (
    select table_name, grantee, string_agg(column_name, ', ' order by column_name) as columns
    from information_schema.role_column_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type = 'SELECT'
    group by table_name, grantee
  ) g
)
select format(
  E'=== 1) RLS enabled per table ===\n%s\n\n=== 2) RLS policies ===\n%s\n\n=== 3) Column SELECT grants ===\n%s',
  (select txt from rls), (select txt from pol), (select txt from grants)
) as report;
