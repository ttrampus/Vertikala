// /feed/dogodki.xml — events ("Tabori in dogodki").
//
// Two sources are merged:
//   • the `camps` table (the Tabori/dogodki with real dates), and
//   • BlogPost posts in the "events" category (event write-ups).
//
// Per the slo-alp.com request, this public feed carries only events that have
// already started or happened. Upcoming camps (date_from in the future) are
// the club's internal "napovednik" and are left out — change the UPCOMING
// filter below if you ever want them published too.
import { sbSelect, renderRss, rssResponse, errorResponse, toText, BLOG_COLS } from "../_rss.js";

export async function onRequest({ request, env }) {
  try {
    const origin = new URL(request.url).origin;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [camps, posts] = await Promise.all([
      sbSelect(
        env,
        "camps",
        `select=id,title,summary,location,date_from,date_to` +
          `&date_from=lte.${today}&order=date_from.desc&limit=50`
      ),
      sbSelect(
        env,
        "BlogPost",
        `select=${BLOG_COLS}&status=eq.published&deleted_at=is.null` +
          `&category=eq.events&order=created_date.desc&limit=50`
      ),
    ]);

    const campItems = camps.map((c) => ({
      title: c.title,
      link: `${origin}/tabori-in-dogodki?tabor=${c.id}`,
      guid: `${origin}/tabori-in-dogodki?tabor=${c.id}`,
      date: c.date_from,
      category: "Tabori in dogodki",
      description: toText([c.location, c.summary].filter(Boolean).join(" — ")),
    }));

    const postItems = posts.map((p) => ({
      title: p.title,
      link: `${origin}/post/${p.id}`,
      guid: `${origin}/post/${p.id}`,
      date: p.created_date,
      category: "Tabori in dogodki",
      description: toText(p.summary),
    }));

    const items = [...campItems, ...postItems]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);

    return rssResponse(
      renderRss({
        title: "AK Vertikala — tabori in dogodki",
        description: "Pretekli tabori in dogodki Alpinističnega kluba Vertikala.",
        siteUrl: origin,
        selfUrl: request.url,
        items,
      })
    );
  } catch (e) {
    return errorResponse(e);
  }
}
