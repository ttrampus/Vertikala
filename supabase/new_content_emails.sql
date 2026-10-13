-- ============================================================================
-- Vertikala — e-pošta ob novi objavi in novem taboru
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
-- Pošilja funkcija supabase/functions/notify-new-content (Gmail, SMTP).
--
-- KAKO DELUJE
-- 1. Ko prispevek postane objavljen (nov ali iz osnutka — z urejevalnika ali
--    iz skrbniške plošče) ali ko je dodan tabor, sprožilec doda vrstico v
--    content_notifications in prek pg_net pocuka funkcijo.
-- 2. Funkcija prevzame čakajoče vrstice (claim_content_notifications), objavo
--    še enkrat prebere, pošlje in zapiše izid (sent / failed / skipped).
-- Vsaka objava ima v vrsti največ eno vrstico (unique), zato gre obvestilo
-- enkrat — tudi če jo kdo umakne v osnutek in znova objavi. Neuspelo
-- pošiljanje (npr. skrivnosti še niso nastavljene) se ponovi ob naslednjem
-- klicu, največ 5-krat.
--
-- Ročno ponovno pošiljanje / preizkus:
--   update public.content_notifications set status = 'pending', attempts = 0
--    where kind = 'post' and item_id = '<id objave>';
--   select public.ping_content_notifications();
-- ============================================================================

create extension if not exists pg_net;

create table if not exists public.content_notifications (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('post', 'camp')),
  item_id     text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts    int not null default 0,
  claimed_at  timestamptz,
  sent_at     timestamptz,
  recipients  text,
  last_error  text,
  created_at  timestamptz not null default now(),
  unique (kind, item_id)
);

-- Samo za funkcijo (service role) in spodnje security definer funkcije.
alter table public.content_notifications enable row level security;
revoke all on public.content_notifications from anon, authenticated;

-- Prevzem: vsako čakajočo vrstico dobi en sam klic funkcije (skip locked),
-- tudi če se dva sprožita hkrati. Obtičale ("sending" > 10 min) in neuspele
-- (po 2 min) se poskusijo znova.
create or replace function public.claim_content_notifications()
returns setof public.content_notifications
language sql
security definer
set search_path = public
as $$
  update public.content_notifications n
     set status = 'sending', attempts = n.attempts + 1, claimed_at = now()
   where n.id in (
     select id from public.content_notifications
      where attempts < 5
        and (status = 'pending'
          or (status = 'failed'  and claimed_at < now() - interval '2 minutes')
          or (status = 'sending' and claimed_at < now() - interval '10 minutes'))
      order by id
      limit 20
      for update skip locked)
  returning n.*;
$$;

revoke all on function public.claim_content_notifications() from public, anon, authenticated;
grant execute on function public.claim_content_notifications() to service_role;

-- Pocuka funkcijo. pg_net zahtevo pošlje šele po uspešni transakciji — če
-- se objava ne shrani, se ne sproži nič. Ključ je javni "anon" ključ strani
-- (je tudi v kodi spletne strani): funkcija ima vklopljeno preverjanje JWT,
-- vendar ji zaupanje ni potrebno — dela samo s tem, kar je v vrsti.
create or replace function public.ping_content_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://wkzgrvrvhmygfaobsbvb.supabase.co/functions/v1/notify-new-content',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndremdydnJ2aG15Z2Zhb2JzYnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTYwMDcsImV4cCI6MjA5MTEzMjAwN30.jXq8v6Po1MoZSWuuFVwfrRsdH5uPH6hZtTvvz4_yDZk'
    ),
    timeout_milliseconds := 30000
  );
end;
$$;

revoke all on function public.ping_content_notifications() from public, anon, authenticated;

create or replace function public.queue_content_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_argv[0] = 'post' then
    -- Samo ob prehodu v "objavljeno": nova objava ali osnutek, ki se objavi.
    if new.status is distinct from 'published' or new.deleted_at is not null then
      return null;
    end if;
    if tg_op = 'UPDATE' and old.status = 'published' and old.deleted_at is null then
      return null;
    end if;
  end if;

  insert into public.content_notifications (kind, item_id)
  values (tg_argv[0], new.id::text)
  on conflict (kind, item_id) do nothing;

  if found then
    perform public.ping_content_notifications();
  end if;
  return null;
end;
$$;

drop trigger if exists queue_post_notification on public."BlogPost";
create trigger queue_post_notification
  after insert or update of status, deleted_at on public."BlogPost"
  for each row execute function public.queue_content_notification('post');

drop trigger if exists queue_camp_notification on public.camps;
create trigger queue_camp_notification
  after insert on public.camps
  for each row execute function public.queue_content_notification('camp');

-- Kar je bilo objavljeno pred vklopom, se ne pošlje nikoli (niti ob ponovni
-- objavi iz osnutka) — obvestila so samo za novo vsebino.
insert into public.content_notifications (kind, item_id, status, last_error)
select 'post', id::text, 'skipped', 'Objavljeno pred vklopom obvestil.'
  from public."BlogPost" where status = 'published'
on conflict (kind, item_id) do nothing;

insert into public.content_notifications (kind, item_id, status, last_error)
select 'camp', id::text, 'skipped', 'Dodano pred vklopom obvestil.'
  from public.camps
on conflict (kind, item_id) do nothing;
