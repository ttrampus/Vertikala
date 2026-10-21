import { useRef, useState } from "react";
import { Loader2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadToSupabase } from "@/lib/uploadToSupabase";
import { useBackdropClose } from "@/lib/useBackdropClose";
import { useSortableGrid } from "@/lib/useSortableGrid";

// ── Side-by-side modal ────────────────────────────────────────────────────────
// Picks 2–4 photos for an imageRow and inserts it, or, given `pos`, edits the
// row already at that position: swap, add, remove or reorder its photos.
// Each slot is { k } when empty, { k, file, preview } for a newly picked
// photo, or { k, url, preview } for one already in the row; `k` is a key that
// survives reordering.
export default function SideBySideModal({ editor, onClose, pos = null }) {
  const existing = pos === null ? null : editor.state.doc.nodeAt(pos);
  const nextKey = useRef(0);
  const slot = (fields = {}) => ({ k: nextKey.current++, ...fields });
  const [slots, setSlots] = useState(() =>
    existing ? existing.attrs.urls.map((url) => slot({ url, preview: url })) : [slot(), slot()]);
  const [uploading, setUploading] = useState(false);
  const [gap, setGap] = useState(String(existing?.attrs.gap ?? 8));
  const { gridRef, tileProps, tileStyle, dragIndex, floating } =
    useSortableGrid(slots, setSlots, (i) => slots[i]?.preview);

  const pick = (i) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlots(slots.map((s, j) => (j === i ? { k: s.k, file, preview: URL.createObjectURL(file) } : s)));
  };
  const addSlot = () => { if (slots.length < 4) setSlots([...slots, slot()]); };
  const removeSlot = (i) => setSlots(slots.filter((_, j) => j !== i));
  const filled = slots.filter((s) => s.preview);

  const save = async () => {
    if (filled.length < 2) return alert("Izberite vsaj 2 sliki.");
    setUploading(true);
    try {
      const urls = await Promise.all(filled.map((s) => s.url ?? uploadToSupabase(s.file, "inline")));
      const attrs = { urls, gap: parseInt(gap, 10) };
      if (existing) {
        editor.chain().focus().command(({ tr }) => {
          if (tr.doc.nodeAt(pos)?.type.name !== "imageRow") return false;
          tr.setNodeMarkup(pos, null, attrs);
          return true;
        }).run();
      } else {
        editor.chain().focus().insertContent({ type: "imageRow", attrs }).run();
      }
      onClose();
    } catch (err) {
      alert(`Nalaganje ni uspelo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const backdrop = useBackdropClose(onClose);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      {...backdrop}>
      <div className="bg-background rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-border">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-base">{existing ? "Uredi slike drug ob drugem" : "Slike drug ob drugem"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Izberite 2–4 slike za vrstico. Povlecite sliko na novo mesto, da spremenite vrstni red.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex" aria-label="Zapri"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>

        <div ref={gridRef} className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${slots.length}, 1fr)` }}>
          {slots.map((s, i) => (
            <div key={s.k} {...tileProps(i)} style={tileStyle(i)}
              className={`relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary ${dragIndex === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
              <label className={`flex flex-col items-center justify-center overflow-hidden rounded-xl ${s.preview ? "" : "cursor-pointer"} ${dragIndex === i ? "opacity-30" : ""}`}
                style={{ aspectRatio: "4/3", border: s.preview ? "none" : "2px dashed hsl(var(--border))", background: s.preview ? "none" : "hsl(var(--muted))" }}>
                {s.preview
                  ? <img src={s.preview} className="w-full h-full object-cover" alt="" draggable={false} />
                  : <div className="text-center text-muted-foreground"><ImageIcon size={20} className="mx-auto mb-1" /><span className="text-xs">Slika {i + 1}</span></div>}
                <input type="file" accept="image/*" onChange={pick(i)} className="hidden" />
              </label>
              {slots.length > 2 && (
                <button type="button" onClick={() => removeSlot(i)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80" aria-label="Odstrani"><X className="h-3 w-3" aria-hidden="true" /></button>
              )}
            </div>
          ))}
        </div>
        {floating}

        <div className="flex items-center gap-3 mb-5">
          {slots.length < 4 && (
            <button onClick={addSlot} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">+ Dodaj stolpec</button>
          )}
          <label className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
            Razmik:
            <select value={gap} onChange={(e) => setGap(e.target.value)}
              className="border border-border rounded-md px-2 py-1 text-xs bg-background">
              <option value="4">Tesno</option>
              <option value="8">Normalno</option>
              <option value="16">Široko</option>
              <option value="24">Zelo široko</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Prekliči</Button>
          <Button size="sm" onClick={save} disabled={uploading || filled.length < 2} className="gap-2">
            {uploading && <Loader2 size={13} className="animate-spin" />}
            {uploading ? "Nalagam…" : existing ? "Shrani" : "Vstavi slike"}
          </Button>
        </div>
      </div>
    </div>
  );
}
