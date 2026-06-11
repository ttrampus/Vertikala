import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Fullscreen image overlay. Controlled by the parent: pass `index` (number to
// open at that image, null to close) and `onClose`; navigation is internal.
export default function Lightbox({ images = [], index = null, onClose }) {
  const [idx, setIdx] = useState(index);

  useEffect(() => { setIdx(index); }, [index]);

  const open = index !== null && idx !== null && images.length > 0;
  const prev = () => setIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  const next = () => setIdx((i) => (i < images.length - 1 ? i + 1 : 0));

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={onClose}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white z-10" onClick={onClose}>
            <X className="h-8 w-8" />
          </button>
          {images.length > 1 && (
            <>
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
            </>
          )}
          <motion.img
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            src={images[idx]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 text-white/60 text-sm font-inter">
              {idx + 1} / {images.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
