import { useState } from "react";
import { thumbFallback } from "@/lib/thumbs";

// An image shown at its own shape, never cropped — for the post page, where the
// whole photo or poster has to be visible whatever its format or the screen.
// (Cards crop to their frame instead; see CardImage.) It has no fixed size, so
// until it loads a shimmer box shaped by `placeholderClassName` holds the space.
// `fallbackSrc` swaps in the original file if the thumb is missing.
export default function WholeImage({
  src,
  fallbackSrc,
  alt = "",
  eager = false,
  className = "",
  placeholderClassName = "aspect-[3/2]",
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={loaded ? "" : `relative overflow-hidden ${placeholderClassName}`}>
      {!loaded && <div className="img-shimmer" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        ref={(el) => { if (el?.complete && el.naturalWidth > 0) setLoaded(true); }}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          if (fallbackSrc && e.currentTarget.src !== fallbackSrc) thumbFallback(e, fallbackSrc);
          else setLoaded(true); // nothing else to try — stop the shimmer
        }}
        className={loaded
          ? `block transition-[opacity,transform] duration-500 ${className}`
          : "absolute inset-0 w-full h-full opacity-0"}
      />
    </div>
  );
}
