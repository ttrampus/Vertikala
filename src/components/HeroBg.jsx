import { useEffect, useState } from "react";

// Hero background photo that fades in over a dark base + shimmer instead of
// leaving a gray band while it loads. Drop-in replacement for the
// absolute-positioned background-image div the hero pages use. Pass `bgRef` /
// `bgStyle` to reach the image layer itself (Home's scroll parallax).
export default function HeroBg({ src, position = "center", zIndex, bgRef, bgStyle }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true); // keep the dark base, stop shimmering
    img.src = src;
    if (img.complete && img.naturalWidth > 0) setLoaded(true);
    return () => { img.onload = img.onerror = null; };
  }, [src]);

  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, zIndex, overflow: "hidden", background: "#15181c" }}
    >
      {!loaded && <div className="hero-shimmer" />}
      <div
        ref={bgRef}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('${src}')`,
          backgroundSize: "cover",
          backgroundPosition: position,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.8s ease",
          ...bgStyle,
        }}
      />
    </div>
  );
}
