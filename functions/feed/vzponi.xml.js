// /feed/vzponi.xml — only the "Vzponi" posts (BlogPost category = climbs):
// the long-form climb reports and stories. (The structured ascent records in
// the `ascents` table are terse log entries without a narrative, so they are
// deliberately left out of the feed.)
import { sbSelect, renderRss, rssResponse, errorResponse, toText, BLOG_COLS } from "../_rss.js";

export async function onRequest({ request, env }) {
  try {
    const origin = new URL(request.url).origin;
    const posts = await sbSelect(
      env,
      "BlogPost",
      `select=${BLOG_COLS}&status=eq.published&deleted_at=is.null` +
        `&category=eq.climbs&order=created_date.desc&limit=50`
    );

    const items = posts.map((p) => ({
      title: p.title,
      link: `${origin}/post/${p.id}`,
      guid: `${origin}/post/${p.id}`,
      date: p.created_date,
      category: "Vzponi",
      description: toText(p.summary),
    }));

    return rssResponse(
      renderRss({
        title: "AK Vertikala — vzponi",
        description: "Vzponi in alpinistične zgodbe Alpinističnega kluba Vertikala.",
        siteUrl: origin,
        selfUrl: request.url,
        items,
      })
    );
  } catch (e) {
    return errorResponse(e);
  }
}
