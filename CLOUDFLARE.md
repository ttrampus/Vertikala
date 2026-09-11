# Moving vertikala.com to Cloudflare (recommended route)

The site already runs on Cloudflare Pages (`vertikala.pages.dev`). Pointing
the real domain at it is less work than uploading builds to Hitrost, and
deploys become `git push` instead of zip-and-extract.

Hitrost stays in the picture for **email only** — the mailbox
`krj01@vertikala.com` keeps living there. That is the whole risk of this
migration: the mail records must survive the nameserver change.

## Current DNS (captured 2026-09-11, before any change)

| Type | Name | Value |
|---|---|---|
| NS | vertikala.com | dns1.hitrost.net, dns2.hitrost.net |
| A | vertikala.com | 91.185.211.101 |
| A | www | 91.185.211.101 |
| MX | vertikala.com | 10 mail.vertikala.com |
| A | **mail** | **91.185.211.101** |
| TXT | vertikala.com | `v=spf1 a mx ip4:91.185.211.0/24 ip4:185.69.148.0/22 ~all` |
| TXT | x._domainkey | `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7fwx1b8WE13ra7xk1fKYoHLIYaecYLNPdGOiot4ltHEee...` (get the full value from DirectAdmin) |
| TXT | _dmarc | `v=DMARC1; p=none` |

No autodiscover record exists.

## Steps

1. **Add the site to Cloudflare** (Add a Site -> vertikala.com -> Free plan).
   Cloudflare scans the existing zone and imports the records above.
   **Check every row against the table before continuing** — the scan misses
   records that are not guessable, and the DKIM TXT is long enough to get
   truncated. Copy the full DKIM value from DirectAdmin -> E-Mail Accounts.

2. **`mail.vertikala.com` must be grey-cloud (DNS-only), not orange.**
   This is the one mistake that breaks email. Proxying it would publish
   Cloudflare's IPs for the mail host and mail would stop being delivered.
   Same for any other mail-related hostname.

3. **Change the nameservers at the registrar** to the two Cloudflare gives you.
   Propagation is usually under an hour. Email keeps flowing throughout as
   long as step 2 is right.

4. **Attach the domain to Pages**: Pages project -> Custom domains ->
   "Set up a custom domain" -> `vertikala.com`, then again for `www`.
   Cloudflare creates the CNAME and issues the certificate automatically.
   This replaces the old root A record to 91.185.211.101.

5. **Supabase**: Authentication -> URL Configuration -> Site URL
   `https://vertikala.com`, and add `https://vertikala.com/**` to Redirect
   URLs. Keep the pages.dev entry as a fallback.

6. **Deploy**: push to the branch the Pages project builds from. The build
   output now includes `_redirects` (578 old WordPress permalinks -> new post
   URLs) and `_headers` (immutable asset caching, no-cache HTML).

7. **Verify**:
   - `https://vertikala.com/` loads, `/vzponi` survives a hard refresh
   - `https://vertikala.com/zimsko-upanje` 301s to `/post/...`
   - send a test email to `krj01@vertikala.com` **and** send one out from it
   - `curl -I https://vertikala.com/` -> `Cache-Control: no-cache`

## SPF note

The SPF record's `a` mechanism authorises whatever the root A record points
at. After the move that becomes Cloudflare, not the mail server — harmless,
because `mx` and the explicit `ip4:91.185.211.0/24` still cover the real
sender. No change needed, but don't "tidy" those out of the record.

## Hitrost afterwards

Keep the hosting plan — it is running the mailbox. The WordPress files under
`domains/vertikala.com/public_html/` stop being reachable once DNS moves, so
there is no urgency to delete them; take a backup and leave them as a safety
net. `public_html/accusim/` is a placeholder (`<html>tralala</html>`) and
`accusim.eu` does not resolve — nothing to preserve there.

## If you go the Hitrost route instead

See DEPLOY.md. It is a working plan and the `.htaccess` in `public/` carries
the same 578 redirects in Apache form. It is just more manual: every deploy
is a zip upload, and LiteSpeed caching needs watching.
