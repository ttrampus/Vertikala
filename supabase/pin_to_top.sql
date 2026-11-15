-- "Pripni na vrh" / pin-to-top for home-page posts.
--
-- A pinned post sorts above every unpinned one on the homepage, regardless of
-- its date; among several pinned posts the most recently pinned is highest.
--   pinned_at    = WHEN it was pinned (null = not pinned)
--   pinned_until = optional auto-expiry; null = pin stays until unpinned.
-- A pin is "active" when pinned_at is set AND (pinned_until is null OR still in
-- the future). Expiry is evaluated at READ time (the homepage ignores a pin
-- whose pinned_until has passed), so no scheduled job is needed and an expired
-- post falls straight back into normal by-date order. The stale timestamps are
-- harmless; they are overwritten the next time the post is pinned or unpinned.
--
-- Only admins OR the owner may pin/unpin or change the expiry. The frontend
-- hides the control from everyone else, but the rule is ALSO enforced
-- server-side here (a BEFORE trigger), consistent with the other `*_guard_*`
-- protections — a non-privileged PATCH can never touch these columns even by
-- crafting the request directly against the API.

alter table "BlogPost" add column if not exists pinned_at    timestamptz;
alter table "BlogPost" add column if not exists pinned_until timestamptz;
-- Whether the public "Aktualno" badge is shown on a pinned post. The pin still
-- lifts the post to the top when this is false; it just hides the label.
alter table "BlogPost" add column if not exists pinned_badge boolean not null default true;

-- Only pinned rows are indexed (partial): that is all the home ordering and the
-- "what is currently pinned" dashboard lookup ever scan.
create index if not exists blogpost_pinned_idx
  on "BlogPost" (pinned_at desc) where pinned_at is not null;

create or replace function public.blogpost_guard_pin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  may_pin boolean := public.is_admin() or public.is_owner();
begin
  -- is_admin()/is_owner() read the request's JWT, so they are correct here too.
  if tg_op = 'UPDATE'
     and (new.pinned_at    is distinct from old.pinned_at
       or new.pinned_until is distinct from old.pinned_until
       or new.pinned_badge is distinct from old.pinned_badge)
     and not may_pin then
    raise exception 'Only an admin or the owner can pin or unpin posts';
  end if;
  if tg_op = 'INSERT'
     and (new.pinned_at is not null or new.pinned_until is not null)
     and not may_pin then
    -- Silently drop an attempt to create an already-pinned post rather than
    -- failing the whole insert.
    new.pinned_at := null;
    new.pinned_until := null;
    new.pinned_badge := true;
  end if;
  return new;
end;
$$;

drop trigger if exists blogpost_guard_pin on "BlogPost";
create trigger blogpost_guard_pin
  before insert or update on "BlogPost"
  for each row execute function public.blogpost_guard_pin();

-- BlogPost uses COLUMN-LEVEL grants (select('*') errors here), so new columns
-- are invisible to the API until granted. The homepage reads pinning as anon;
-- the editor writes it as an authenticated admin/owner (the trigger above is
-- what actually restricts WHO may write — the grant only exposes the column).
grant select (pinned_at, pinned_until, pinned_badge) on "BlogPost" to anon, authenticated;
grant update (pinned_at, pinned_until, pinned_badge) on "BlogPost" to authenticated;

-- Make PostgREST pick up the new columns immediately.
notify pgrst, 'reload schema';
