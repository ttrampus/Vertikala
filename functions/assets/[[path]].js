// Guards the hashed build assets against Cloudflare Pages' SPA fallback.
//
// Pages answers a request for a file that doesn't exist with index.html and
// status 200. Under /assets/ that is poison: on 2026-09-13 a browser asked for
// vendor-motion-*.js in the seconds while a deploy was going live, got the HTML
// page instead, and — because /assets/* was marked "immutable, cache 1 year" —
// Cloudflare's edge and the browser both kept that HTML as the script. Every
// visitor served from that cache saw a white page (the module failed with a
// MIME type error), which is why it hit some devices/networks and not others.
//
// Here a missing asset becomes a real 404 that nothing may cache, so the next
// request (or the app's automatic reload) fetches the real file. Only files
// that actually exist get the long immutable cache.
export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  const type = res.headers.get("content-type") || "";

  if (res.ok && type.includes("text/html")) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const out = new Response(res.body, res);
  out.headers.set(
    "Cache-Control",
    res.ok ? "public, max-age=31536000, immutable" : "no-store"
  );
  return out;
}
