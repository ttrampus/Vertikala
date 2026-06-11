#!/usr/bin/env node
/**
 * WordPress → Supabase importer for AK Vertikala.
 *
 * Pulls every published post from https://vertikala.com (WP REST API),
 * re-hosts its images into Supabase Storage (so the new site no longer
 * depends on the old WordPress server), and inserts a row into BlogPost.
 *
 * SAFE TO RE-RUN: each post is tagged with its WordPress id (`wp_id`);
 * already-imported posts are skipped. Images are stored at a deterministic,
 * content-hashed path, so a re-run overwrites rather than duplicates.
 *
 * ── PREREQUISITES ──────────────────────────────────────────────────────────
 * 1. Add a tracking column once (Supabase SQL editor):
 *
 *      alter table public."BlogPost" add column if not exists wp_id bigint;
 *      create unique index if not exists blogpost_wp_id_uidx
 *        on public."BlogPost" (wp_id) where wp_id is not null;
 *
 * 2. Provide credentials. The script reads SUPABASE URL from my-app/.env.local
 *    (VITE_SUPABASE_URL) and needs the SERVICE-ROLE key (bypasses RLS to write).
 *    Put it in the environment (never commit it):
 *
 *      export SUPABASE_SERVICE_ROLE_KEY="eyJ...your service_role secret..."
 *
 * ── USAGE ──────────────────────────────────────────────────────────────────
 *   node scripts/import-wp.mjs --dry-run        # preview, writes nothing
 *   node scripts/import-wp.mjs --dry-run --limit 3
 *   node scripts/import-wp.mjs --limit 10       # real import of first 10
 *   node scripts/import-wp.mjs                   # full import (all 579)
 *
 * Flags:
 *   --dry-run     Don't upload images or insert rows; just report.
 *   --limit N     Only process the N most recent posts (for testing).
 *   --no-images   Skip image re-hosting (keep original WordPress URLs).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// ── config ──────────────────────────────────────────────────────────────────
const WP_BASE = "https://vertikala.com";
const BUCKET = "blog-images";
const WP_HOST_RE = /(^|\.)vertikala\.com$/i;

// Uncategorized → climbs (per migration decision: it's a climbing club and the
// uncategorized posts sampled were ascent reports).
const CAT_MAP = {
  233: "climbs",   // Vzponi in ture
  1:   "climbs",   // Uncategorized
  3:   "news",     // Obvestila
  227: "news",     // Obvestila alpinistične šole
  245: "trips",    // kam gremo
  244: "training", // otroška plezalna šola
  557: "training", // Alpinistična šola
};
const DEFAULT_CATEGORY = "climbs";

// ── args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const NO_IMAGES = args.includes("--no-images");
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? parseInt(args[i + 1], 10) : Infinity;
})();

// ── env loader (parse my-app/.env.local) ─────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const isPlaceholder = (v) => !v || /\byour\b|\.\.\./i.test(v); // e.g. "eyJ...your service_role secret..."
function loadEnv() {
  const out = { ...process.env };
  try {
    const txt = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      // .env.local fills in anything unset — and overrides a leftover
      // placeholder env var (a common copy-paste mistake).
      if (!(k in out) || isPlaceholder(out[k])) out[k] = v;
    }
  } catch { /* no .env.local — rely on process.env */ }
  return out;
}
const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) { console.error("✗ Missing VITE_SUPABASE_URL (in .env.local)"); process.exit(1); }
if (!DRY_RUN && !SERVICE_KEY) {
  console.error("✗ Missing SUPABASE_SERVICE_ROLE_KEY. Set it in the environment, or use --dry-run.");
  process.exit(1);
}
// A dry run never touches Supabase, so it never needs (or validates) the key.
const sb = (SERVICE_KEY && !DRY_RUN) ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }) : null;

// ── helpers ─────────────────────────────────────────────────────────────────
const stripTags = (s) => (s || "").replace(/<[^>]+>/g, "");
const decode = (s) => (s || "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;/g, "'")
  .replace(/&nbsp;/g, " ").replace(/&hellip;/g, "…").replace(/&#8211;|&#8212;/g, "–");

const MAX_IMG_WIDTH = 1600; // re-host a web-sized variant, not the multi-MB original

// foo-150x150.jpg -> foo.jpg  (strip WP's size suffix to get the original key)
const dethumb = (url) => url.replace(/-\d+x\d+(\.\w{2,5})(\?|#|$)/i, "$1$2");

// Map of original-image URL -> best web-sized variant (<= MAX_IMG_WIDTH),
// built from the WordPress media library so gallery thumbnails can be upgraded
// to their ~1024px version instead of the 150px crop shown in the post.
const mediaMap = new Map();
async function prefetchMedia() {
  let page = 1, count = 0;
  for (;;) {
    const url = `${WP_BASE}/wp-json/wp/v2/media?per_page=100&page=${page}&_fields=source_url,media_details`;
    const res = await fetch(url);
    if (res.status === 400 || !res.ok) break;
    const items = await res.json();
    if (!items.length) break;
    for (const m of items) {
      const full = m.source_url;
      if (!full) continue;
      const sizes = m.media_details?.sizes || {};
      let chosen = null, chosenW = 0;
      for (const k of Object.keys(sizes)) {
        const s = sizes[k];
        if (s?.source_url && s.width && s.width <= MAX_IMG_WIDTH && s.width > chosenW) {
          chosen = s.source_url; chosenW = s.width;
        }
      }
      mediaMap.set(full, chosen || full);
      count++;
    }
    page++;
  }
  console.log(`  media library: ${count} images indexed (web-sized variants).`);
}

// Choose the URL to re-host for one <img>: prefer the media-library web-sized
// variant; else the largest srcset entry <= cap; else plain src.
function pickImageUrl(tag) {
  const srcM = tag.match(/\bsrc=["']([^"']+)["']/i);
  const src = srcM ? srcM[1] : null;
  if (src) {
    const full = dethumb(src);
    if (mediaMap.has(full)) return mediaMap.get(full);
  }
  const ssM = tag.match(/\bsrcset=["']([^"']+)["']/i);
  const cands = ssM
    ? ssM[1].split(",").map((s) => {
        const [url, w] = s.trim().split(/\s+/);
        return { url, w: w && w.endsWith("w") ? parseInt(w) : 0 };
      }).filter((c) => c.url && c.w)
      .sort((a, b) => a.w - b.w)
    : [];
  let chosen = null;
  for (const c of cands) if (c.w <= MAX_IMG_WIDTH) chosen = c.url; // largest under cap
  if (!chosen && cands.length) chosen = cands[cands.length - 1].url;
  return chosen || src;
}

function mapCategory(catIds = []) {
  for (const id of catIds) if (CAT_MAP[id]) return CAT_MAP[id];
  return DEFAULT_CATEGORY;
}

async function wpGetPage(page) {
  const url = `${WP_BASE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=1&orderby=date&order=desc`;
  const res = await fetch(url);
  if (res.status === 400) return []; // past last page
  if (!res.ok) throw new Error(`WP API ${res.status} on page ${page}`);
  return res.json();
}

const imgCache = new Map(); // source URL -> public Supabase URL
async function rehostImage(url) {
  if (imgCache.has(url)) return imgCache.get(url);

  let host;
  try { host = new URL(url).host; } catch { return null; }
  if (!WP_HOST_RE.test(host)) return null; // only re-host images from the old site

  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";

  const base = decodeURIComponent(new URL(url).pathname.split("/").pop() || "image")
    .replace(/[^\w.\-]/g, "_");
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  const path = `imported/${hash}-${base}`;

  const { error } = await sb.storage.from(BUCKET).upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`upload: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  imgCache.set(url, data.publicUrl);
  return data.publicUrl;
}

// Convert <div class="wp-caption"> (WP standalone image-with-caption) to
// <figure data-type="figure"><img/><figcaption/></figure> so the new site
// renders captions using the same styling as the FigureNode editor extension.
// Must be called AFTER processContentImages so img src URLs are already updated.
function convertWpCaptions(html) {
  return html.replace(
    /<div[^>]+class="[^"]*wp-caption[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, inner) => {
      const imgMatch = inner.match(/<img\b[^>]*>/i);
      if (!imgMatch) return _; // no img found — leave as-is
      const imgTag = imgMatch[0];
      const capMatch = inner.match(/<p[^>]*wp-caption-text[^>]*>([\s\S]*?)<\/p>/i);
      const caption = capMatch
        ? capMatch[1].replace(/<[^>]+>/g, "").trim()
        : "";
      const figcap = caption ? `<figcaption>${caption}</figcaption>` : "<figcaption></figcaption>";
      return `<figure data-type="figure" style="margin:20px 0;text-align:center;">${imgTag}${figcap}</figure>`;
    }
  );
}

// Rewrite every <img> to a re-hosted, web-sized URL; strip srcset/sizes so the
// browser can't fall back to the old domain; and unwrap the <a> "attachment"
// links WordPress puts around images (they point back to the old site).
// Returns { html, firstImage }.
async function processContentImages(htmlIn, wpid) {
  let html = htmlIn;
  let firstImage = null;
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  for (const tag of tags) {
    const pick = pickImageUrl(tag);
    if (!pick) continue;
    let newUrl = null;
    if (!NO_IMAGES && !DRY_RUN) {
      try { newUrl = await rehostImage(pick); }
      catch (e) { console.warn(`   ! image kept (rehost failed): ${pick.slice(0, 80)} — ${e.message}`); }
    } else {
      newUrl = pick; // dry-run / no-images: just preview the chosen URL
    }
    const finalUrl = newUrl || pick;
    if (!firstImage) firstImage = finalUrl;
    const newTag = tag
      .replace(/\bsrc=["'][^"']*["']/i, `src="${finalUrl}"`)
      .replace(/\s+srcset=["'][^"']*["']/i, "")
      .replace(/\s+sizes=["'][^"']*["']/i, "");
    html = html.split(tag).join(newTag);
  }
  // Unwrap <a href="...vertikala.com...">…</a> (image/attachment links) — keep
  // the inner content (the image), drop the dead link to the old site.
  html = html.replace(/<a\b[^>]*href=["'][^"']*vertikala\.com[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1");
  return { html, firstImage };
}

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nWordPress → Supabase import  ${DRY_RUN ? "(DRY RUN — nothing written)" : ""}`);
  console.log(`  source: ${WP_BASE}   target: ${SUPABASE_URL}`);
  console.log(`  images: ${NO_IMAGES ? "kept on old server" : DRY_RUN ? "preview only" : "re-hosted to Supabase Storage"}\n`);

  if (!NO_IMAGES) await prefetchMedia();

  // existing wp_ids (for idempotent re-runs)
  let existing = new Set();
  if (sb) {
    const { data, error } = await sb.from("BlogPost").select("wp_id").not("wp_id", "is", null);
    if (error) {
      console.error(`✗ Could not read existing wp_id values — did you add the column? ${error.message}`);
      process.exit(1);
    }
    existing = new Set((data || []).map((r) => r.wp_id));
    console.log(`  ${existing.size} posts already imported (will skip).\n`);
  }

  let page = 1, processed = 0, inserted = 0, skipped = 0, failed = 0;
  while (processed < LIMIT) {
    const posts = await wpGetPage(page);
    if (!posts.length) break;
    for (const p of posts) {
      if (processed >= LIMIT) break;
      processed++;
      if (existing.has(p.id)) { skipped++; continue; }

      try {
        const title = decode(p.title?.rendered || "").trim() || "(brez naslova)";
        const summary = decode(stripTags(p.excerpt?.rendered || "")).trim().slice(0, 500) || null;
        const author = (p._embedded?.author?.[0]?.name) || null;
        const category = mapCategory(p.categories || []);
        const terms = p._embedded?.["wp:term"]?.flat() || [];
        const tags = terms.filter((t) => t?.taxonomy === "post_tag").map((t) => t.name);

        const { html: rawHtml, firstImage } = await processContentImages(p.content?.rendered || "", p.id);
        const html = convertWpCaptions(rawHtml);

        const row = {
          wp_id: p.id,
          title,
          content: html,
          summary,
          author_name: author,
          author_email: null,
          created_by: author,
          created_by_id: null,                 // keep WP author name; don't reassign ownership
          category,
          status: "published",
          created_date: p.date_gmt ? `${p.date_gmt}Z` : p.date,
          featured_image: firstImage || null,
          tags: tags.length ? tags : null,
          is_sample: false,
        };

        if (DRY_RUN) {
          console.log(`  [preview] #${p.id}  ${category.padEnd(8)}  ${title.slice(0, 60)}  img=${firstImage ? "yes" : "no"}`);
        } else {
          const { error } = await sb.from("BlogPost").insert(row);
          if (error) throw new Error(error.message);
          inserted++;
          console.log(`  ✓ #${p.id}  ${category.padEnd(8)}  ${title.slice(0, 60)}`);
        }
      } catch (e) {
        failed++;
        console.error(`  ✗ #${p.id}  ${e.message}`);
      }
    }
    page++;
  }

  console.log(`\nDone. processed=${processed} inserted=${inserted} skipped=${skipped} failed=${failed}`);
  if (DRY_RUN) console.log("This was a dry run — re-run without --dry-run to write.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
