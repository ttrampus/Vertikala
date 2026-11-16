-- "Pripni na vrh" / pin-to-top for camps (Tabori in dogodki), mirroring the
-- BlogPost pinning in pin_to_top.sql. Camps share the homepage feed with
-- BlogPost, so they need the same pin columns, guard and grants to be pinnable.
--
--   pinned_at    = WHEN it was pinned (null = not pinned)
--   pinned_until = optional auto-expiry; null = pin stays until unpinned.
--   pinned_badge = whether the public "Aktualno" badge shows (pin still lifts
--                  the item to the top when false; it just hides the label).
-- A pin is "active" when pinned_at is set AND (pinned_until is null OR still in
-- the future). Expiry is evaluated at READ time, so no scheduled job is needed.
--
-- Only admins OR the owner may pin/unpin or change the expiry — NOT a camp's
-- own creator (unlike editing the camp itself). The frontend hides the control
-- from everyone else; the rule is ALSO enforced server-side by the BEFORE
-- trigger here, so a crafted API request can never touch these columns.

alter table "camps" add column if not exists pinned_at    timestamptz;
alter table "camps" add column if not exists pinned_until timestamptz;
alter table "camps" add column if not exists pinned_badge boolean not null default true;

create index if not exists camps_pinned_idx
  on "camps" (pinned_at desc) where pinned_at is not null;

create or replace function public.camps_guard_pin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  may_pin boolean := public.is_admin() or public.is_owner();
begin
  if tg_op = 'UPDATE'
     and (new.pinned_at    is distinct from old.pinned_at
       or new.pinned_until is distinct from old.pinned_until
       or new.pinned_badge is distinct from old.pinned_badge)
     and not may_pin then
    raise exception 'Only an admin or the owner can pin or unpin camps';
  end if;
  if tg_op = 'INSERT'
     and (new.pinned_at is not null or new.pinned_until is not null)
     and not may_pin then
    new.pinned_at := null;
    new.pinned_until := null;
    new.pinned_badge := true;
  end if;
  return new;
end;
$$;

drop trigger if exists camps_guard_pin on "camps";
create trigger camps_guard_pin
  before insert or update on "camps"
  for each row execute function public.camps_guard_pin();

-- Expose the new columns to the API (explicit, to match pin_to_top.sql; the
-- guard trigger above is what restricts WHO may write them).
grant select (pinned_at, pinned_until, pinned_badge) on "camps" to anon, authenticated;
grant update (pinned_at, pinned_until, pinned_badge) on "camps" to authenticated;

notify pgrst, 'reload schema';
