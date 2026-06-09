import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImageGallery({ images = [] }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (!images.length) return null;

  const openLightbox = (idx) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const prev = () => setLightboxIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  const next = () => setLightboxIdx((i) => (i < images.length - 1 ? i + 1 : 0));

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
            onClick={() => openLightbox(idx)}
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

      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button className="absolute top-4 right-4 text-white/80 hover:text-white z-10" onClick={closeLightbox}>
              <X className="h-8 w-8" />
            </button>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              <ChevronRight className="h-10 w-10" />
            </button>
            <motion.img
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={images[lightboxIdx]}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 text-white/60 text-sm font-inter">
              {lightboxIdx + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}