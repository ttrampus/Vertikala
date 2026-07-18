import { useState } from "react";
import Lightbox from "./Lightbox";
import CardImage from "./CardImage";
import { thumbUrl } from "@/lib/thumbs";

export default function ImageGallery({ images = [] }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (!images.length) return null;

  // Variable scale layout
  const getSpan = (idx) => {
    const pattern = [2, 1, 1, 2, 1, 1, 1, 2];
    return pattern[idx % pattern.length];
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((url, idx) => (
          <div
            key={idx}
            className={`cursor-pointer rounded-xl overflow-hidden ${
              getSpan(idx) === 2 ? "col-span-2" : "col-span-1"
            }`}
            onClick={() => setLightboxIdx(idx)}
          >
            {/* Grid cells show the card thumb; the lightbox opens the original. */}
            <CardImage
              src={thumbUrl(url)}
              fallbackSrc={url}
              alt={`Photo ${idx + 1}`}
              className="w-full h-48 md:h-64"
              imgClassName="hover:scale-105"
              imgStyle={{ transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </div>
        ))}
      </div>

      <Lightbox images={images} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
    </>
  );
}
