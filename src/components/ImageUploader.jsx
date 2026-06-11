import { useState, useEffect, useCallback, useRef } from "react";
import { uploadToSupabase } from "@/lib/uploadToSupabase";
import { Loader2, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per image

const uploadImageToSupabase = (file) => uploadToSupabase(file, "gallery");

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const touchStartX = useRef(null);

  const prev = useCallback(() => setCurrent((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) delta < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/96 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <span className="text-white/50 text-sm tabular-nums">{current + 1} / {images.length}</span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
        {images.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <img
          key={current}
          src={images[current]}
          alt={`Photo ${current + 1}`}
          className="max-h-full max-w-full object-contain rounded-lg select-none"
          style={{ maxHeight: "calc(100vh - 160px)" }}
          draggable={false}
        />

        {images.length > 1 && (
          <button
            onClick={next}
            className="absolute right-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 py-5 flex-shrink-0">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${i === current ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/30 hover:bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ImageUploader component ──────────────────────────────────────────────
export default function ImageUploader({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter((f) => {
      if (!f.type.startsWith("image/")) { alert(`${f.name} is not an image.`); return false; }
      if (f.size > MAX_FILE_SIZE) { alert(`${f.name} exceeds 10MB.`); return false; }
      return true;
    });
    if (!validFiles.length) return;

    setUploading(true);
    try {
      const urls = await Promise.all(validFiles.map(uploadImageToSupabase));
      onChange([...images, ...urls]);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (i) => {
    const next = images.filter((_, idx) => idx !== i);
    onChange(next);
  };

  // ── Thumbnail grid layout ──────────────────────────────────────────────────
  // 1 image: full width. 2: half each. 3+: 3-col grid.
  const gridClass =
    images.length === 0 ? "" :
    images.length === 1 ? "grid-cols-1" :
    images.length === 2 ? "grid-cols-2" :
    "grid-cols-3";

  return (
    <div className="space-y-3">
      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className={`grid gap-2 ${gridClass}`}>
          {images.map((url, i) => (
            <div
              key={url + i}
              className="relative group rounded-xl overflow-hidden bg-muted cursor-pointer"
              style={{ aspectRatio: "4/3" }}
              onClick={() => setLightboxIndex(i)}
            >
              <img
                src={url}
                alt={`Gallery image ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
              {/* Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload drop zone */}
      <label
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors py-6 bg-muted/20 hover:bg-muted/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Click or drag to add photos
            </span>
            <span className="text-xs text-muted-foreground/60">Max 10MB per image</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}