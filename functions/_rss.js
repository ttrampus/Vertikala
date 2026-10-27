// Shared helpers for the public RSS feeds (functions/feed*.js).
//
// A file whose name starts with "_" is not a route — Cloudflare Pages skips it
// when mapping URLs to functions — so this module only ever runs when one of
// the feed routes imports it.
//
// The feeds are generated at request time from Supabase's public REST API,
// using the SAME anon key the browser already ships. That matters for safety:
// row-level security hides member-only (is_public = false) posts from anon, so
// the feed physically cannot leak internal content — it sees exactly what a
// logged-out visitor sees on the site. (Verified: of 587 published posts anon
// can read, all are public; private ones return zero rows.)

// Both values are already public — the URL is in the site's CSP header and the
// anon key ships in the JS bundle. Prefer the Pages env vars when configured,
// fall back to the known public values so the feed works without extra setup.
const SUPABASE_URL = (env) =>
  env.VITE_SUPABASE_URL || "https://wkzgrvrvhmygfaobsbvb.supabase.co";
const ANON_KEY = (env) =>
  env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndremdydnJ2aG15Z2Zhb2JzYnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTYwMDcsImV4cCI6MjA5MTEzMjAwN30.jXq8v6Po1MoZSWuuFVwfrRsdH5uPH6hZtTvvz4_yDZk";

// GET a Supabase REST query. `query` is the part after the table name.
export async function sbSelect(env, table, query) {
  const key = ANON_KEY(env);
  const res = await fetch(`${SUPABASE_URL(env)}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase ${table} ${res.status}`);
  return res.json();
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
// Strip control characters that are illegal in XML 1.0 even when escaped
// (everything below 0x20 except tab/newline/carriage-return). This is the one
// place all text passes through, so a stray control char in a title or summary
// can never produce a broken feed.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
export const xmlEscape = (s) =>
  String(s ?? "")
    .replace(CONTROL, "")
    .replace(/[&<>"']/g, (c) => ESC[c]);

// Reduce stored HTML/markup to a plain-text blurb for <description>.
export const toText = (s) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const rfc822 = (d) => {
  const t = new Date(d);
  return isNaN(t) ? new Date().toUTCString() : t.toUTCString();
};

// Build an RSS 2.0 document. `items` are already sorted newest-first.
// item: { title, link, guid, date, description, category? }
export function renderRss({ title, description, siteUrl, selfUrl, items }) {
  const now = new Date().toUTCString();
  const entries = items
    .map(
      (it) => `    <item>
      <title>${xmlEscape(it.title)}</title>
      <link>${xmlEscape(it.link)}</link>
      <guid isPermaLink="true">${xmlEscape(it.guid || it.link)}</guid>
      <pubDate>${rfc822(it.date)}</pubDate>${
        it.category
          ? `\n      <category>${xmlEscape(it.category)}</category>`
          : ""
      }
      <description>${xmlEscape(it.description || "")}</description>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${xmlEscape(siteUrl)}</link>
    <atom:link href="${xmlEscape(selfUrl)}" rel="self" type="application/rss+xml"/>
    <description>${xmlEscape(description)}</description>
    <language>sl</language>
    <lastBuildDate>${now}</lastBuildDate>
${entries}
  </channel>
</rss>
`;
}

// Standard response wrapper: correct content type + a short edge cache so
// slo-alp.com (and any reader) gets a fresh feed without hammering Supabase.
export function rssResponse(xml) {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Browser 15 min; Cloudflare edge 30 min; serve stale up to 1 day if
      // Supabase is briefly unreachable.
      "Cache-Control":
        "public, max-age=900, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}

export function errorResponse(e) {
  return new Response(`Feed temporarily unavailable\n${e?.message || e}`, {
    status: 502,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const BLOG_COLS =
  "id,title,summary,category,created_date,author_name";

// The "Tabori in dogodki" live in their own table (`camps`), not in BlogPost.
// Both the main feed and the dogodki feed list them, so the mapping lives here.
// Each item is dated by when it was PUBLISHED (created_at), not by when the
// event happens — an announcement should appear the day it goes up, and a
// future event date as <pubDate> would make some readers hide it.
export async function getCampItems(env, origin) {
  const camps = await sbSelect(
    env,
    "camps",
    "select=id,title,summary,location,created_at&order=created_at.desc&limit=50"
  );
  return camps.map((c) => ({
    title: c.title,
    link: `${origin}/tabori-in-dogodki?tabor=${c.id}`,
    guid: `${origin}/tabori-in-dogodki?tabor=${c.id}`,
    date: c.created_at,
    category: "Tabori in dogodki",
    description: toText([c.location, c.summary].filter(Boolean).join(" — ")),
  }));
}
