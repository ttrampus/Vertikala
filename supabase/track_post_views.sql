-- ============================================================================
-- Vertikala — pravi štetje ogledov objav (brez napihovanja/spoofinga)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
--
-- Prejšnja implementacija (PostDetail.jsx) je ob vsakem nalaganju strani
-- poslala `update({ views_count: trenutno + 1 })` neposredno na BlogPost.
-- Dve težavi:
--   1) BlogPost ima samo EN UPDATE policy — "Authors can update own posts"
--      (auth.uid() = created_by_id, samo authenticated) — brez admin izjeme.
--      To pomeni, da je štetje dejansko delovalo SAMO, ko je avtor gledal
--      svojo lastno objavo prijavljen; za vse druge bralce (kar je večina
--      prometa) je RLS klic tiho zavrnil.
--   2) Tudi ko je delovalo, je šlo za surov zapis poljubnega števila — vsakdo
--      s pravico pisanja bi lahko nastavil views_count na karkoli, in brez
--      kakršnegakoli razločevanja med isto osebo, ki 50-krat osveži stran.
--
-- Rešitev: štetje gre izključno prek SECURITY DEFINER funkcije, ki:
--   • obide (namensko) zgornjo omejitev UPDATE politike — a lahko izključno
--     prišteje +1, nikoli ne zapiše poljubne vrednosti;
--   • en ogled na obiskovalca na objavo na dan šteje enkrat (prijavljeni prek
--     auth.uid(), anonimni prek naključnega ID-ja, ki si ga odjemalec zapomni
--     v localStorage) — osveževanje strani ne napihuje števca;
--   • tabela post_views nima NOBENE neposredne RLS politike za anon/
--     authenticated, torej je edina pot do zapisa prek funkcije spodaj.
-- ============================================================================

create table if not exists public.post_views (
  id         bigint generated always as identity primary key,
  post_id    uuid not null references public."BlogPost"(id) on delete cascade,
  viewer_key text not null,
  viewed_on  date not null default current_date,
  created_at timestamptz not null default now(),
  unique (post_id, viewer_key, viewed_on)
);

create index if not exists post_views_post_id_idx on public.post_views (post_id);

alter table public.post_views enable row level security;
revoke all on public.post_views from anon, authenticated;
-- Namenoma brez SELECT/INSERT/UPDATE/DELETE politik: edina pot do te tabele
-- je spodnja SECURITY DEFINER funkcija.

create or replace function public.record_post_view(p_post_id uuid, p_anon_key text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_key text;
  v_rows_inserted int;
begin
  -- Prijavljen uporabnik šteje po svojem računu (ne glede na napravo);
  -- anonimen obiskovalec po ID-ju, ki ga pošlje odjemalec (glej
  -- getAnonViewerId() v PostDetail.jsx). Brez ID-ja se ne šteje nič.
  if auth.uid() is not null then
    v_viewer_key := 'user:' || auth.uid()::text;
  elsif p_anon_key is not null and length(trim(p_anon_key)) > 0 then
    v_viewer_key := 'anon:' || p_anon_key;
  else
    return;
  end if;

  insert into public.post_views (post_id, viewer_key)
  values (p_post_id, v_viewer_key)
  on conflict (post_id, viewer_key, viewed_on) do nothing;

  get diagnostics v_rows_inserted = row_count;
  if v_rows_inserted > 0 then
    update public."BlogPost" set views_count = coalesce(views_count, 0) + 1 where id = p_post_id;
  end if;
end;
$$;

revoke all on function public.record_post_view(uuid, text) from public;
grant execute on function public.record_post_view(uuid, text) to anon, authenticated;

-- ============================================================================
-- Po zagonu: ogledi se štejejo za VSE bralce (ne samo za avtorja), enkrat na
-- obiskovalca na objavo na dan. PostDetail.jsx mora klicati
-- rpc("record_post_view", ...) namesto neposrednega update() na BlogPost.
-- ============================================================================
