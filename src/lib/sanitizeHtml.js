import DOMPurify from "dompurify";

// One sanitizer for every place post HTML is turned back into live DOM: the
// post page (PostDetail) and the editor's RawHtmlNode (imported WordPress
// galleries and bare embeds). Before, the post page sanitized but the editor
// did not, so a member could store `<div class="gallery"><img onerror=…>` or a
// crafted <iframe> and run script in an admin's browser when they opened the
// post to edit it.
//
// What is kept: the imported gallery markup (div.gallery / dl / dt / dd / img),
// figures, captions, and iframes/videos that the editor itself produces
// (YouTube embeds, uploaded <video>). Everything else that could run code or
// hijack the page is dropped.

// Hosts whose iframes are allowed. Everything the editor can insert is a
// YouTube embed; Vimeo is permitted for older imported embeds. Anything else
// (javascript:, srcdoc, data:, an attacker's domain) is removed.
const ALLOWED_IFRAME_HOSTS = new Set([
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "www.youtube.com",
  "youtube.com",
  "player.vimeo.com",
]);

// CSS properties that let an element cover the page (a full-screen invisible
// link over a phishing target). Legitimate figures/rows only use display,
// width, margin, float, border-radius — never positioning — so stripping these
// is safe and kills the overlay trick.
const UNSAFE_STYLE_PROPS = new Set([
  "position", "z-index", "inset", "top", "right", "bottom", "left",
]);

const CONFIG = {
  ADD_TAGS: ["iframe"],
  // The editor's nodes carry these; keep them so saved posts still render.
  ADD_ATTR: [
    "allow", "allowfullscreen", "frameborder", "src", "width", "height",
    "data-type", "data-wrap", "data-video-type", "data-youtube-id", "controls",
  ],
  // srcdoc is an iframe script vector; never allow it.
  FORBID_ATTR: ["srcdoc"],
};

// Remove positioning from an inline style string, keeping the rest.
function cleanStyle(style) {
  return style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => !UNSAFE_STYLE_PROPS.has(d.split(":")[0].trim().toLowerCase()))
    .join("; ");
}

// DOMPurify already strips on* handlers, javascript: URLs and unknown tags.
// This second pass enforces the iframe host allowlist and the style rules,
// which DOMPurify's defaults do not cover.
export function sanitizePostHtml(html) {
  if (!html || typeof html !== "string") return "";
  const clean = DOMPurify.sanitize(html, CONFIG);

  const tpl = document.createElement("template");
  tpl.innerHTML = clean;

  for (const frame of [...tpl.content.querySelectorAll("iframe")]) {
    let ok = false;
    try {
      const u = new URL(frame.getAttribute("src") || "", window.location.origin);
      ok = u.protocol === "https:" && ALLOWED_IFRAME_HOSTS.has(u.host);
    } catch {
      ok = false;
    }
    if (!ok) frame.remove();
  }

  for (const el of [...tpl.content.querySelectorAll("[style]")]) {
    const cleaned = cleanStyle(el.getAttribute("style") || "");
    if (cleaned) el.setAttribute("style", cleaned);
    else el.removeAttribute("style");
  }

  return tpl.innerHTML;
}
