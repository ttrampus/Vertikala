const PUBLIC_MARKER = "/storage/v1/object/public/blog-images/";

// Card-sized JPEG variant of a storage image, stored flat under thumbs/
// (path slashes become "__", extension becomes .jpg). External URLs have no
// thumb and are returned unchanged. Callers should keep the original URL as
// an onError fallback — a thumb can be missing (pre-backfill posts, GIF/SVG).
export function thumbUrl(url) {
  if (typeof url !== "string") return url;
  const i = url.indexOf(PUBLIC_MARKER);
  if (i < 0) return url;
  const path = url.slice(i + PUBLIC_MARKER.length).split(/[?#]/)[0];
  if (!path || path.startsWith("thumbs/")) return url;
  return url.slice(0, i + PUBLIC_MARKER.length) + thumbPath(path);
}

// Bucket-relative thumb path for a bucket-relative original path.
export function thumbPath(path) {
  return "thumbs/" + path.replace(/\//g, "__").replace(/\.\w+$/, "") + ".jpg";
}

// Swap a failed thumb <img> back to the original image, once.
export function thumbFallback(e, originalUrl) {
  if (originalUrl && e.currentTarget.src !== originalUrl) e.currentTarget.src = originalUrl;
}
