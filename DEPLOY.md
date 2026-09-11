# Deploying Vertikala to shared hosting (Hitrost / DirectAdmin)

The app is a static Vite SPA. Nothing runs on the web host: it serves files,
and the browser talks to Supabase directly. Any plain Apache/LiteSpeed shared
hosting plan is enough — no Node.js on the server.

## 1. Build

```bash
npm run build                       # reads .env.local at BUILD time
cd dist && zip -r ~/vertikala-dist.zip . && cd ..
```

`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are compiled into the bundle,
so `.env.local` must be correct *before* building. The anon key is public by
design — row-level security is what protects the data.

## 2. Upload

Hitrost runs **DirectAdmin** (panel at `b10.hitrost.net:2222`), not cPanel.
The real document root is:

    /home/krj01/domains/vertikala.com/public_html/

The `public_html` at the top of your home directory is only a symlink to it.

File Manager -> navigate there -> Upload `vertikala-dist.zip` -> select it ->
Extract -> delete the zip. DirectAdmin's file manager shows dotfiles by
default, so confirm `.htaccess` is listed afterwards.

Over SFTP instead:

```bash
rsync -av dist/ krj01@b10.hitrost.net:domains/vertikala.com/public_html/
```

Note: no `--delete` here. See the cutover section — that directory has a
non-WordPress folder in it that must survive.

## 3. Supabase auth URLs (required, or invites break)

Supabase dashboard → Authentication → URL Configuration:

- **Site URL**: `https://<domain>`
- **Redirect URLs**: add `https://<domain>/**`

The app builds its redirect from `window.location.origin`
(`src/pages/Login.jsx`, `src/pages/AdminDashboard.jsx`), and Supabase rejects
any redirect target that is not allowlisted. Keep the old entry too while both
sites are live.

## 4. SSL

DirectAdmin -> SSL Certificates -> "Free & automatic certificate from
Let's Encrypt" for the domain. The
`.htaccess` already forces HTTPS, so the site is broken-looking until the
certificate exists.

## 5. Smoke test

- `https://<domain>/` loads
- hard-refresh a deep link, e.g. `/vzponi` — must load, not 404 (SPA fallback)
- log in, and run one invite end to end (checks the Supabase URL config)
- `curl -I https://<domain>/` → `Cache-Control: no-cache` on the HTML.
  If a LiteSpeed cache layer overrides it, stale-chunk recovery after a deploy
  stops working; disable LSCache for the domain in that case.

## What does not move

Supabase Postgres, Auth, Storage and the `invite-user` edge function stay in
Supabase's cloud. The SQL under `supabase/*.sql` is already applied there;
nothing needs re-running.

## Redeploying later

Repeat steps 1–2. Asset filenames are content-hashed, so old files in
`assets/` are harmless, but `rsync --delete` (or wiping `public_html/` before
extracting) keeps things tidy.

---

# Cutting over from the old WordPress site

The old site is WordPress at `https://www.vertikala.com`, on the same hosting
account. You are replacing the *web files*, not the account.

## Do these BEFORE deleting anything

1. **Full backup.** DirectAdmin -> Create/Restore Backups -> create a backup, then
   download it. Also MySQL Management -> export the WordPress database.
   Download both to your own machine. Do not rely on the host keeping one.
2. **The WP database: keep it.** Don't drop it. It costs nothing and it is the
   only copy of anything the import missed.
3. **Missing content — mostly handled.** "Prvi tabor na Češki koči
   (10.–12. 7. 2026)" (wp_id 8402) has now been imported via
   `node scripts/import-wp.mjs --limit 1`; it is live with all 6 images
   re-hosted to Supabase Storage. Two 2011 posts remain unimported and were
   judged not worth keeping (`vabilo-na-predavanje-dejana-ogrinca`,
   `dobrodosli-na-prenovljeni-spletni-strani`); they are the only entries with
   `"post_id": null` in `wp-redirect-map.json`.
4. **One still-hotlinked image.** Post *"Grapa čez Jame – Dolge stene"*
   (`95dd7715-f757-42ab-8db2-4293a6a2fc71`) still embeds
   `http://www.vertikala.com/wp-content/uploads/DSC_0601.jpg`. That file is on
   the old server and dies with it. Re-upload it through the post editor.
5. **Two body-text links** to old WP pages (`/alpinisticna-sola-2025/`,
   `/umetna-stena/`) — both are covered by the redirect rules below, so they
   keep working.

## What you do NOT touch

- **Email.** The single mailbox `krj01@vertikala.com` lives in `Maildir/`
  and `imap/` in the home directory, not in `public_html`. Clearing web files
  does not affect it. Leave MX records alone.
- **DNS records**, the domain registration, and any addon/subdomains with their
  own folders.
- The Supabase project — it is untouched by any of this.

## Old permalinks

578 old URLs like `/smid-virens-v-koglu/` are 301-redirected to
`/post/<uuid>` by rules baked into `public/.htaccess` (generated from the WP
REST API while the old site was still up; regenerating later is impossible).
Without them every existing inbound link and Google result lands on the new
site's 404 page.

## Do NOT wipe public_html wholesale

`domains/vertikala.com/public_html/` contains a folder that is **not**
WordPress:

    public_html/accusim/        <-- keep this, it is a separate project

(There is also a separate `domains/accusim.eu/` — unrelated to this deploy,
leave it alone.)

Delete only the WordPress files, by name:

    wp-admin/  wp-content/  wp-includes/
    wp-config.php  wp-load.php  wp-login.php  wp-settings.php
    wp-blog-header.php  wp-cron.php  wp-links-opml.php  wp-mail.php
    wp-signup.php  wp-trackback.php  wp-activate.php  wp-comments-post.php
    wp-config-sample.php  xmlrpc.php  index.php
    .htaccess  license.txt  readme.html

Anything else in there that you don't recognise: leave it and ask, rather than
deleting. `wp-config.php` holds the DB password — keep a copy in the backup.

## LiteSpeed cache

The account has an `lscache/` directory, so LiteSpeed caching is active. If
`curl -I https://vertikala.com/` does not return `Cache-Control: no-cache` on
the HTML after deploying, turn LSCache off for this domain in DirectAdmin.
A cached `index.html` breaks the stale-chunk recovery: members with an old tab
open get a white screen after a deploy instead of an automatic reload.

## Safe cutover order

1. Back up (above).
2. DirectAdmin -> Subdomain Management -> create `new.vertikala.com`. It
   lands at `domains/vertikala.com/public_html/new/`. Upload the build there
   and test everything. Add `https://new.vertikala.com/**` to the Supabase
   redirect URLs while testing.
3. When it looks right: delete the WordPress files listed above from
   `public_html/` (keeping `accusim/`), then extract the build there.
4. Remove the subdomain and its Supabase redirect entry once the root works
   — and delete `public_html/new/`, or the redirect rules there will shadow it.

If anything goes wrong, restore the Home Directory backup from step 1.
