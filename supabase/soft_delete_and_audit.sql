-- ============================================================================
-- Vertikala — mehko brisanje (soft delete) + dnevnik dejanj (audit log)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
-- Zahteva funkcijo public.is_admin() iz security_fixes.sql (zaženite tisto prej).
--
-- Namen: če je admin račun zlorabljen in nekdo pobriše/pokvari objave,
--   • mehko brisanje pomeni, da vrstice in slike NISO uničene — le skrite,
--     zato je obnovitev en klik (brez povrnitve celotne baze);
--   • dnevnik dejanj zabeleži KDO je kaj izbrisal/obnovil in KDAJ ter kdo je
--     komu spremenil vlogo — da je incident viden in obvladljiv.
-- ============================================================================


-- ── 1) Mehko brisanje objav ────────────────────────────────────────────────
-- Namesto trajnega izbrisa vrstice nastavimo deleted_at. Objava izgine iz
-- javnih seznamov (odjemalec filtrira deleted_at IS NULL), a ostane v bazi za
-- obnovitev. Slike se NE brišejo, dokler objava ni trajno izbrisana iz koša.
alter table public.BlogPost add column if not exists deleted_at timestamptz;

create index if not exists blogpost_not_deleted_idx
  on public.BlogPost (created_date desc)
  where deleted_at is null;


-- ── 2) Dnevnik dejanj (audit log) ──────────────────────────────────────────
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,                 -- kdo je izvedel dejanje (NULL = strežnik/SQL)
  action     text not null,        -- npr. post_deleted, post_restored, role_change
  table_name text not null,
  row_id     text,
  summary    text,                 -- berljiv opis (naslov objave / ime člana)
  details    jsonb,                -- dodatni podatki (npr. {"from":"admin","to":"user"})
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Bere samo admin; nihče ne piše neposredno (vpisujejo le SECURITY DEFINER sprožilci).
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

drop policy if exists "admins read audit log" on public.audit_log;
create policy "admins read audit log"
  on public.audit_log for select to authenticated
  using (public.is_admin());


-- ── 3) Sprožilec: beleži brisanje/obnovitev/trajni izbris objav ────────────
create or replace function public.audit_blogpost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log(actor_id, action, table_name, row_id, summary, details)
    values (auth.uid(), 'post_purged', 'BlogPost', old.id::text, old.title,
            jsonb_build_object('title', old.title, 'category', old.category));
    return old;

  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.audit_log(actor_id, action, table_name, row_id, summary, details)
      values (auth.uid(), 'post_deleted', 'BlogPost', new.id::text, new.title,
              jsonb_build_object('title', new.title, 'category', new.category));
    elsif old.deleted_at is not null and new.deleted_at is null then
      insert into public.audit_log(actor_id, action, table_name, row_id, summary, details)
      values (auth.uid(), 'post_restored', 'BlogPost', new.id::text, new.title,
              jsonb_build_object('title', new.title));
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists audit_blogpost on public.BlogPost;
create trigger audit_blogpost
  after update or delete on public.BlogPost
  for each row execute function public.audit_blogpost();


-- ── 4) Sprožilec: beleži spremembe vlog ────────────────────────────────────
create or replace function public.audit_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log(actor_id, action, table_name, row_id, summary, details)
    values (auth.uid(), 'role_change', 'profile', new.id::text, new.display_name,
            jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;

drop trigger if exists audit_profile_role on public.profile;
create trigger audit_profile_role
  after update on public.profile
  for each row execute function public.audit_profile_role();

-- ============================================================================
-- Po zagonu: brisanje objav postane obnovljivo (koš v Admin nadzorni plošči),
-- vsa brisanja/obnovitve in spremembe vlog pa se beležijo v audit_log
-- (bere jih samo admin).
-- ============================================================================
