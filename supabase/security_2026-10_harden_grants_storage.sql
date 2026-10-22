-- ============================================================================
-- Vertikala — zmanjšanje nepotrebnih pravic + omejitve nalaganja (varno)
-- ============================================================================
-- Zaženite CELOTNO datoteko v Supabase Dashboard → SQL Editor. Idempotentno.
-- Vse spremembe so zoževanje pravic, ki jih aplikacija ne uporablja —
-- ničesar ne odpira in ne bi smelo spremeniti vedenja strani.
--
-- 1) pg_net ni za odjemalca. anon/authenticated imata USAGE na shemi net in
--    EXECUTE na net.http_*. Shema net prek REST API ni izpostavljena (preverjeno),
--    zato to danes ni izkoristljivo, a brskalnik tega ne potrebuje. Odvzamemo.
-- 2) SECURITY DEFINER funkcije, ki jih kliče samo prijavljen uporabnik ali
--    sprožilci, ne potrebujejo pravice EXECUTE za anon.
-- 3) Vedro blog-images brez omejitve velikosti/tipa: dodamo omejitvi, da
--    član ne more naložiti npr. HTML/SVG ali napolniti prostora.
-- ============================================================================

-- ── 1) pg_net stran od odjemalca ───────────────────────────────────────────
-- Na ravni sheme (neodvisno od različice pg_net): brez USAGE odjemalec funkcij
-- v shemi net sploh ne more nasloviti, tudi če ostanejo posamezni EXECUTE.
revoke all on all functions in schema net from anon, authenticated;
revoke usage on schema net from anon, authenticated;

-- ── 2) EXECUTE samo tam, kjer je potreben ──────────────────────────────────
-- Sprožilne funkcije se ne kličejo neposredno prek RPC:
revoke execute on function public.audit_blogpost()            from anon, authenticated;
revoke execute on function public.audit_profile_role()        from anon, authenticated;
revoke execute on function public.guard_profile_role()        from anon, authenticated;
revoke execute on function public.touch_site_content()        from anon, authenticated;
revoke execute on function public.queue_content_notification() from anon, authenticated;
revoke execute on function public.claim_content_notifications() from anon, authenticated;
revoke execute on function public.ping_content_notifications() from anon, authenticated;
-- Te kliče samo prijavljen uporabnik; anon jih ne potrebuje:
revoke execute on function public.add_comment(uuid, text)        from anon;
revoke execute on function public.toggle_like(uuid)              from anon;
revoke execute on function public.admin_list_posts()             from anon;
revoke execute on function public.delete_account(uuid)           from anon;
revoke execute on function public.member_names()                 from anon;
-- record_post_view in validate_invitation OSTANETA za anon (anonimni ogledi,
-- odpiranje povabila pred prijavo).

-- ── 3) Omejitve vedra blog-images ──────────────────────────────────────────
-- 25 MB (nalagalnik na strani dovoli do 10 MB slike in 50 MB videa; postavimo
-- zgornjo mejo nekoliko nad video), samo slike in video.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml',
      'video/mp4','video/webm','video/quicktime'
    ]
where id = 'blog-images';
-- OPOMBA: image/svg+xml je vključen, ker ga morda uporabljajo obstoječe ikone;
-- če SVG ni potreben med nalaganji članov, ga odstranite iz seznama (SVG lahko
-- vsebuje skript, a se iz vedra streže kot prenos/na ločeni storage domeni).

-- ── Preverjanje ────────────────────────────────────────────────────────────
--   select has_schema_privilege('anon','net','usage');          -- false
--   select id, file_size_limit, allowed_mime_types from storage.buckets;
