import { useState } from "react";
import Lightbox from "./Lightbox";
import WholeImage from "./WholeImage";
import { thumbUrl } from "@/lib/thumbs";

export default function ImageGallery({ images = [] }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (!images.length) return null;

  // Masonry columns, each photo at its own shape: a grid of fixed-height
  // cells cropped every portrait and panorama, which on a phone left little
  // of the picture. Columns fill top to bottom, so no cell has to match its
  // neighbour's height.
  return (
    <>
      <div className="columns-2 md:columns-3 gap-3">
        {images.map((url, idx) => (
          <div
            key={idx}
            className="mb-3 break-inside-avoid cursor-pointer rounded-xl overflow-hidden"
            onClick={() => setLightboxIdx(idx)}
          >
            {/* Cells show the thumb (same shape, smaller); the lightbox opens the original. */}
            <WholeImage
              src={thumbUrl(url)}
              fallbackSrc={url}
              alt={`Photo ${idx + 1}`}
              placeholderClassName="aspect-[4/3]"
              className="w-full h-auto hover:scale-105"
            />
          </div>
        ))}
      </div>

      <Lightbox images={images} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
    </>
  );
}
