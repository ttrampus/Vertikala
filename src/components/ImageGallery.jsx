import { useLayoutEffect, useRef, useState } from "react";
import Lightbox from "./Lightbox";
import { thumbUrl, thumbFallback } from "@/lib/thumbs";
import { justifyRows, galleryRowHeight } from "@/lib/justify";

const GAP = 12; // matches gap-3

export default function ImageGallery({ images = [] }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [ratios, setRatios] = useState({}); // index -> natural width / height, as each photo loads
  const [width, setWidth] = useState(0);
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!images.length) return null;

  const setRatio = (idx, r) => setRatios((prev) => (prev[idx] === r ? prev : { ...prev, [idx]: r }));
  const measure = (idx, img) => setRatio(idx, img.naturalWidth / img.naturalHeight);

  // Justified rows (see lib/justify.js): each photo whole, rows full width, no
  // holes. Until a photo loads it counts as 4:3 and shows a shimmer.
  const ratioOf = (idx) => ratios[idx] || 4 / 3;
  const rows = width
    ? justifyRows(images.map((_, i) => ratioOf(i)), width - 1, { targetHeight: galleryRowHeight(width), gap: GAP })
    : [];

  return (
    <>
      <div ref={ref} className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.items[0]} className="flex justify-center gap-3">
            {row.items.map((idx) => (
              <div
                key={idx}
                className="relative shrink-0 cursor-pointer rounded-xl overflow-hidden"
                style={{ width: ratioOf(idx) * row.height, height: row.height }}
                onClick={() => setLightboxIdx(idx)}
              >
                {!ratios[idx] && <div className="img-shimmer" aria-hidden="true" />}
                {/* Cells show the thumb (same shape, smaller); the lightbox opens the original. */}
                <img
                  src={thumbUrl(images[idx])}
                  alt={`Photo ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  ref={(el) => { if (el?.complete && el.naturalWidth > 0) measure(idx, el); }}
                  onLoad={(e) => measure(idx, e.currentTarget)}
                  onError={(e) => {
                    if (e.currentTarget.src !== images[idx]) thumbFallback(e, images[idx]);
                    else setRatio(idx, 4 / 3); // nothing else to try — stop the shimmer
                  }}
                  className={`w-full h-full object-cover transition-[opacity,transform] duration-500 hover:scale-105 ${ratios[idx] ? "opacity-100" : "opacity-0"}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <Lightbox images={images} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
    </>
  );
}
