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

## Status: zone built, waiting on the nameserver switch

Zone `vertikala.com` = `ed555c1406590ebe9980b98fc21812fa`, status **pending**.
Everything below is already configured; nothing takes effect until the
registrar points at Cloudflare.

Cloudflare nameservers to set at the registrar:

    ada.ns.cloudflare.com
    dakota.ns.cloudflare.com

### Records created

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | vertikala.com | vertikala.pages.dev | proxied |
| CNAME | www | vertikala.pages.dev | proxied |
| A | mail | 91.185.211.101 | **DNS-only** |
| A | ftp | 91.185.211.101 | **DNS-only** |
| MX | @ | 10 mail.vertikala.com | — |
| TXT | @ | `v=spf1 a mx ip4:91.185.211.0/24 ip4:185.69.148.0/22 ~all` | — |
| TXT | x._domainkey | DKIM, 2048-bit RSA | — |
| TXT | _dmarc | `v=DMARC1; p=none` | — |

The DKIM record was reassembled from the two DNS TXT character-strings the old
zone published, then validated by parsing it as an RSA public key — it is the
same key, not a retyped approximation.

`mail` and `ftp` must stay DNS-only. Proxying either publishes Cloudflare's
IPs for a non-HTTP service and breaks it.

Probed for other hostnames before the switch (webmail, smtp, imap, pop, cpanel,
autoconfig, autodiscover, ns1/2, blog, shop, test, dev, staging, CAA, SRV) —
only `ftp` existed.

### Zone settings

SSL mode **Full (strict)**, Always Use HTTPS **on**, minimum TLS **1.2**.

### Pages

Custom domains `vertikala.com` and `www.vertikala.com` are attached to the
`vertikala` project, status `pending` — they validate and get certificates
automatically once the nameservers move.

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

---

# PENDING: revert www to the new site

**State as of 2026-09-11 ~13:50 UTC.** `www.vertikala.com` is temporarily
pointed at the OLD Hitrost server. This must be undone once the wildcard
certificate issues, or www keeps serving WordPress forever.

## Why

Cloudflare issued a certificate for the apex (`vertikala.com`) but the zone's
Universal SSL wildcard (`*.vertikala.com`) stayed `pending_validation` after
the nameserver switch. With www proxied through Cloudflare and no certificate
covering it, browsers got a full security interstitial
("Firefox can't create a secure connection").

Mitigation: point www back at Hitrost (91.185.211.101), which still holds a
valid GoGetSSL certificate for www.vertikala.com until 2026-12-24. Visitors
get the old-but-working site instead of a security warning.

The wildcard validates via zone-level TXT records (`_acme-challenge`), which
is independent of where www points — so this mitigation does not block it.

## How to tell it is ready

    echo | openssl s_client -connect 104.21.31.229:443 \
      -servername www.vertikala.com 2>/dev/null \
      | openssl x509 -noout -subject

Prints a subject => the edge can serve www over TLS. Empty/handshake failure
=> still pending. Or check the zone's SSL certificate packs for
`status: active` on the pack covering `*.vertikala.com`.

## The revert (two steps — DNS alone is not enough)

1. **DNS**: replace the temporary A record with the original CNAME.

   - delete: `A  www  91.185.211.101  (DNS only, ttl 60)`
   - create: `CNAME  www  vertikala.pages.dev  (PROXIED, ttl auto)`

2. **Pages**: the custom domain `www.vertikala.com` went to `deactivated`
   when the DNS moved away, so re-attach it:

       POST /accounts/{account_id}/pages/projects/vertikala/domains
            {"name": "www.vertikala.com"}

   (Dashboard: Pages -> vertikala -> Custom domains -> add www.vertikala.com.)

## Verify after reverting

    curl -sI https://www.vertikala.com/            # 200, server: cloudflare
    curl -sI https://www.vertikala.com/zimsko-upanje/   # 301 -> /post/<uuid>

Both must come from Cloudflare, not Hitrost. If the redirect does not fire,
www is still hitting the old server.

Zone id `ed555c1406590ebe9980b98fc21812fa`, Pages project `vertikala`.
