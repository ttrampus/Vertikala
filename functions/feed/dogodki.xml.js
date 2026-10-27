// /feed/dogodki.xml — events ("Tabori in dogodki").
//
// Two sources are merged, both dated by when they were published:
//   • the `camps` table (the Tabori/dogodki), and
//   • BlogPost posts in the "events" category (event write-ups).
//
// Every event appears from the moment it is posted — including ones still to
// come, because a camp is announced in advance and that announcement is public
// (the same rows the site shows on its Tabori page). No past/future filtering.
import { sbSelect, renderRss, rssResponse, errorResponse, toText, getCampItems, BLOG_COLS } from "../_rss.js";

export async function onRequest({ request, env }) {
  try {
    const origin = new URL(request.url).origin;

    const [campItems, posts] = await Promise.all([
      getCampItems(env, origin),
      sbSelect(
        env,
        "BlogPost",
        `select=${BLOG_COLS}&status=eq.published&deleted_at=is.null` +
          `&category=eq.events&order=created_date.desc&limit=50`
      ),
    ]);

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
        description: "Tabori in dogodki Alpinističnega kluba Vertikala.",
        siteUrl: origin,
        selfUrl: request.url,
        items,
      })
    );
  } catch (e) {
    return errorResponse(e);
  }
}
