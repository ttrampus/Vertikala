import { useState } from "react";
import { thumbFallback } from "@/lib/thumbs";

// Card image that fades in over a soft shimmer instead of popping into an
// empty gray box. Renders its own wrapper (give it a size via className or
// style); overlays like gradients and category chips go in as children.
// `fallbackSrc` swaps in the original file if the thumb is missing.
export default function CardImage({
  src,
  fallbackSrc,
  alt = "",
  eager = false,
  className = "",
  style,
  imgClassName = "",
  imgStyle,
  children,
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", ...style }}>
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
        className={imgClassName}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.5s ease",
          ...imgStyle,
        }}
      />
      {children}
    </div>
  );
}
