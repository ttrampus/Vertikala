import { useState } from "react";
import { uploadToSupabase } from "@/lib/uploadToSupabase";
import { useSortableGrid } from "@/lib/useSortableGrid";
import { Loader2, Upload, X } from "lucide-react";
import Lightbox from "./Lightbox";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per image

const uploadImageToSupabase = (file) => uploadToSupabase(file, "gallery");

// Stable React keys that survive a reorder; a repeated URL gets a suffix.
const tileKeys = (urls) => {
  const seen = {};
  return urls.map((u) => (seen[u] = (seen[u] || 0) + 1) > 1 ? `${u}#${seen[u]}` : u);
};

// ── Main ImageUploader component ──────────────────────────────────────────────
export default function ImageUploader({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  // Drag a photo to a new place; the post's gallery shows them in this order.
  const { gridRef, tileProps, tileStyle, placeOf, dragIndex, floating } =
    useSortableGrid(images, onChange, (i) => images[i]);

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter((f) => {
      if (!f.type.startsWith("image/")) { alert(`${f.name} ni slika.`); return false; }
      if (f.size > MAX_FILE_SIZE) { alert(`${f.name} presega 10 MB.`); return false; }
      return true;
    });
    if (!validFiles.length) return;

    setUploading(true);
    try {
      const urls = await Promise.all(validFiles.map(uploadImageToSupabase));
      onChange([...images, ...urls]);
    } catch (err) {
      alert(`Nalaganje ni uspelo: ${err.message}`);
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

  const keys = tileKeys(images);

  return (
    <div className="space-y-3">
      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div ref={gridRef} className={`grid gap-2 ${gridClass}`}>
          {images.map((url, i) => (
            <div
              key={keys[i]}
              {...tileProps(i)}
              aria-label={`Slika galerije ${i + 1}`}
              className={`relative group rounded-xl overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary ${dragIndex === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              style={{ aspectRatio: "4/3", ...tileStyle(i) }}
              onClick={() => setLightboxIndex(i)}
            >
              <img
                src={url}
                alt={`Slika galerije ${i + 1}`}
                draggable={false}
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${dragIndex === i ? "opacity-30" : ""}`}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
              {/* The photo's place in the gallery */}
              <span className="absolute top-2 left-2 min-w-6 h-6 px-1.5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-medium tabular-nums pointer-events-none">
                {placeOf(i) + 1}
              </span>
              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                aria-label="Odstrani sliko"
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Povlecite sliko na novo mesto (na telefonu jo najprej malo pridržite). V tem vrstnem redu bodo slike prikazane v objavi.
        </p>
      )}

      {floating}

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
              Kliknite ali povlecite za dodajanje fotografij
            </span>
            <span className="text-xs text-muted-foreground/60">Največ 10 MB na sliko</span>
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

      <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
    </div>
  );
}
