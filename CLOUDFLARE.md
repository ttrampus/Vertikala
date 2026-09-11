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

# www: resolved

`www.vertikala.com` briefly served the OLD Hitrost site on 2026-09-11 as a
mitigation, and has since been returned to Pages. Both hostnames are live on
the new site.

## What happened, so the same trap is avoidable

After the nameserver switch, `vertikala.com` got a certificate but
`www.vertikala.com` sat at `pending`, so browsers hit a full security
interstitial on www. The mitigation was to point www back at Hitrost
(91.185.211.101), which still holds a valid certificate for that hostname —
visitors got the old-but-working site instead of a security warning.

That mitigation was also what kept www broken. **A Pages custom domain can
only validate while its DNS points at Pages.** Moving www away took it out of
Pages' reach and flipped it to `deactivated`; it could never have issued a
certificate in that state. The zone's Universal SSL wildcard is a red herring
here — the apex was served by a *Pages-issued* certificate (Google Trust
Services) all along, not by Universal SSL.

The fix was to put www back (`CNAME www -> vertikala.pages.dev`, proxied) and
PATCH the existing Pages domain to re-trigger validation. Note POST fails with
error 8000018 once the domain exists — even deactivated — so retrying an add
is not the way back. It went active in about five minutes.

## Final state

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | vertikala.com | vertikala.pages.dev | proxied |
| CNAME | www | vertikala.pages.dev | proxied |
| A | mail | 91.185.211.101 | DNS-only |
| A | ftp | 91.185.211.101 | DNS-only |
| MX / SPF / DKIM / DMARC | | unchanged from the old zone | DNS-only |

Both Pages domains `active`, each with its own Google Trust Services
certificate. Mail was never interrupted.

## Still open

The zone's Universal SSL pack (`vertikala.com`, `*.vertikala.com`) remains
`pending_validation`. It is redundant while both hostnames carry Pages
certificates, but it would matter for any future subdomain — worth checking
again in a day or two.

## Verifying www is really on the new site

    curl -sI https://www.vertikala.com/zimsko-upanje/    # 301 -> /post/<uuid>

The redirect exists only on the new site, so a WordPress page here means www
is back on Hitrost.
