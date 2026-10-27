// /feed.xml — the main feed: the club's latest published posts across every
// category (vzponi, novice, izleti, dogodki, trening). This is the single URL
// to hand to an aggregator like slo-alp.com if they only want one.
//
// Only public posts appear — see functions/_rss.js for why that is guaranteed.
import { sbSelect, renderRss, rssResponse, errorResponse, toText, BLOG_COLS } from "./_rss.js";

const CAT_LABEL = {
  climbs: "Vzponi",
  news: "Novice",
  trips: "Izleti",
  events: "Tabori in dogodki",
  training: "Trening",
};

export async function onRequest({ request, env }) {
  try {
    const origin = new URL(request.url).origin;
    const posts = await sbSelect(
      env,
      "BlogPost",
      `select=${BLOG_COLS}&status=eq.published&deleted_at=is.null` +
        `&order=created_date.desc&limit=50`
    );

    const items = posts.map((p) => ({
      title: p.title,
      link: `${origin}/post/${p.id}`,
      guid: `${origin}/post/${p.id}`,
      date: p.created_date,
      category: CAT_LABEL[p.category] || p.category,
      description: toText(p.summary),
    }));

    return rssResponse(
      renderRss({
        title: "AK Vertikala — novice",
        description: "Najnovejše objave Alpinističnega kluba Vertikala.",
        siteUrl: origin,
        selfUrl: request.url,
        items,
      })
    );
  } catch (e) {
    return errorResponse(e);
  }
}
