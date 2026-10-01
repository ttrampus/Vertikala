import { useState } from "react";

// A post's cover, never cropped: shown at its own shape, and the height cap
// keeps a tall one on screen by narrowing it. Until it loads, a 3:2 shimmer
// holds the space.
export default function CoverImage({ src, alt = "" }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={loaded ? "" : "relative aspect-[3/2] rounded-xl overflow-hidden"}>
      {!loaded && <div className="img-shimmer" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        ref={(el) => { if (el?.complete && el.naturalWidth > 0) setLoaded(true); }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={loaded
          ? "block mx-auto w-auto h-auto max-w-full max-h-[80vh] rounded-xl transition-opacity duration-500"
          : "absolute inset-0 w-full h-full opacity-0"}
      />
    </div>
  );
}
