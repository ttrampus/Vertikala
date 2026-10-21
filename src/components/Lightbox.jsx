import { useState, useEffect, useRef } from "react";
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

  // Swipe left/right on a phone to change photo.
  const touchX = useRef(null);
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null || images.length < 2) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) > 50) (delta < 0 ? next : prev)();
  };

  // Round dark buttons stay visible over bright photos and the site header.
  const btn = "absolute z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center"
          onClick={onClose}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button type="button" aria-label="Zapri" className={`${btn} right-4`}
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <X className="h-6 w-6" />
          </button>
          {images.length > 1 && (
            <>
              <button type="button" aria-label="Prejšnja slika"
                className={`${btn} left-3 top-1/2 -translate-y-1/2`}
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button type="button" aria-label="Naslednja slika"
                className={`${btn} right-3 top-1/2 -translate-y-1/2`}
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight className="h-7 w-7" />
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
            <div className="absolute bottom-4 text-white/60 text-sm font-sans">
              {idx + 1} / {images.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
