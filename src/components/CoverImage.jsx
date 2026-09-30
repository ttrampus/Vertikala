import { useState } from "react";

// Wide screens never get a frame taller than this: a portrait cover at its own
// shape ran a whole screen long before the article started. Wider photos still
// fill their frame exactly; a 4:3 one gets thin blurred strips at the sides.
const MIN_RATIO_WIDE = 3 / 2;

// A post's cover, never cropped. The frame takes the photo's own shape (on
// wide screens no taller than MIN_RATIO_WIDE, on phones no taller than 80vh);
// where the photo is narrower than its frame, a blurred copy of itself fills
// the sides instead of empty bars.
export default function CoverImage({ src, alt = "" }) {
  const [ratio, setRatio] = useState(null); // natural width / height, once loaded
  const loaded = ratio !== null;
  const measure = (el) => setRatio(el.naturalWidth / el.naturalHeight || MIN_RATIO_WIDE);
  const r = ratio ?? MIN_RATIO_WIDE;
  return (
    <div
      className="relative overflow-hidden rounded-xl w-full max-h-[80vh] aspect-[var(--cover-r)] sm:aspect-[var(--cover-r-wide)]"
      style={{ "--cover-r": r, "--cover-r-wide": Math.max(r, MIN_RATIO_WIDE) }}
    >
      {!loaded && <div className="img-shimmer" aria-hidden="true" />}
      {loaded && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-90"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        ref={(el) => { if (el?.complete && el.naturalWidth > 0 && !loaded) measure(el); }}
        onLoad={(e) => measure(e.currentTarget)}
        onError={() => setRatio(MIN_RATIO_WIDE)}
        className={`relative w-full h-full object-contain transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
