// One-off backfill: create a card-sized thumb (thumbs/<flat-path>.jpg, max
// 720px, JPEG q75) for every featured image already in the blog-images bucket.
// New uploads make their own thumb client-side (src/lib/uploadToSupabase.js);
// this covers the posts that existed before that.
//
//   SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL from .env, then:
//   node scripts/generate-thumbs.mjs
import sharp from "sharp";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const h = { Authorization: `Bearer ${key}`, apikey: key };

const PUBLIC_MARKER = "/storage/v1/object/public/blog-images/";
const THUMB_MAX = 720;

const storagePath = (u) => {
  if (typeof u !== "string") return null;
  const i = u.indexOf(PUBLIC_MARKER);
  return i < 0 ? null : u.slice(i + PUBLIC_MARKER.length).split(/[?#]/)[0] || null;
};
const thumbPath = (p) => "thumbs/" + p.replace(/\//g, "__").replace(/\.\w+$/, "") + ".jpg";

// Featured images of every post, trash included (restored posts need thumbs too)
const paths = new Set();
for (let off = 0; ; off += 200) {
  const res = await fetch(`${url}/rest/v1/BlogPost?select=featured_image&limit=200&offset=${off}`, { headers: h });
  const rows = await res.json();
  for (const r of rows) { const p = storagePath(r.featured_image); if (p) paths.add(p); }
  if (rows.length < 200) break;
}
console.log(`${paths.size} featured images in storage`);

let made = 0, skipped = 0, failed = 0;
for (const p of paths) {
  if (/\.(gif|svg)$/i.test(p)) { skipped++; continue; }
  try {
    const enc = p.split("/").map(encodeURIComponent).join("/");
    const orig = await fetch(`${url}/storage/v1/object/blog-images/${enc}`, { headers: h });
    if (!orig.ok) { console.warn(`fetch ${p}: HTTP ${orig.status}`); failed++; continue; }
    const buf = Buffer.from(await orig.arrayBuffer());
    const thumb = await sharp(buf)
      .rotate() // honor EXIF orientation
      .resize(THUMB_MAX, THUMB_MAX, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    const dest = thumbPath(p).split("/").map(encodeURIComponent).join("/");
    const up = await fetch(`${url}/storage/v1/object/blog-images/${dest}`, {
      method: "POST",
      headers: { ...h, "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: thumb,
    });
    if (!up.ok) { console.warn(`upload ${p}: HTTP ${up.status} ${await up.text()}`); failed++; continue; }
    made++;
    if (made % 100 === 0) console.log(`  ${made} done…`);
  } catch (e) {
    console.warn(`${p}: ${e.message}`);
    failed++;
  }
}
console.log(`thumbs created: ${made}, skipped (gif/svg): ${skipped}, failed: ${failed}`);
