import { useState } from "react";
import Lightbox from "./Lightbox";

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
            className={`cursor-pointer overflow-hidden rounded-xl ${
              getSpan(idx) === 2 ? "col-span-2" : "col-span-1"
            }`}
            onClick={() => setLightboxIdx(idx)}
          >
            <img
              src={url}
              alt={`Photo ${idx + 1}`}
              loading="lazy"
              decoding="async"
              className="w-full h-48 md:h-64 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}
      </div>

      <Lightbox images={images} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
    </>
  );
}
