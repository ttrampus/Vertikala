import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackdropClose } from "@/lib/useBackdropClose";
import { useSortableGrid } from "@/lib/useSortableGrid";

// The photo cells of an imported WordPress gallery (a RawHtmlNode's markup):
// its direct children that hold an <img>, the same ones lib/justify.js lays
// out on the post page. Empty for anything that isn't a gallery.
function galleryCells(root) {
  if (!root?.matches(".gallery, .wp-block-gallery")) return [];
  return [...root.children].filter((el) => el.querySelector("img"));
}

function parse(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content.firstElementChild;
}

// Photo URLs of a gallery's markup, in order; empty if it isn't a gallery.
export function gallerySources(html) {
  return galleryCells(parse(html)).map((el) => el.querySelector("img").getAttribute("src"));
}

// ── Gallery order modal ───────────────────────────────────────────────────────
// Reorders the photos of the imported gallery at `pos`. Only the cells move;
// the rest of the markup stays as it was.
export default function GalleryOrderModal({ editor, pos, onClose }) {
  const html = editor.state.doc.nodeAt(pos)?.attrs.html ?? "";
  const [sources] = useState(() => gallerySources(html));
  const [order, setOrder] = useState(() => sources.map((_, i) => i));
  const { gridRef, tileProps, tileStyle, placeOf, dragIndex, floating } =
    useSortableGrid(order, setOrder, (i) => sources[order[i]]);

  const save = () => {
    const root = parse(html);
    const cells = galleryCells(root);
    // Swap each cell for a marker, then fill the markers in the new order.
    const marks = cells.map((el) => { const m = document.createComment(""); el.replaceWith(m); return m; });
    marks.forEach((m, i) => m.replaceWith(cells[order[i]]));
    editor.chain().focus().command(({ tr }) => {
      if (tr.doc.nodeAt(pos)?.type.name !== "rawHtml") return false;
      tr.setNodeMarkup(pos, null, { html: root.outerHTML });
      return true;
    }).run();
    onClose();
  };

  const backdrop = useBackdropClose(onClose);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      {...backdrop}>
      <div className="bg-background rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-base">Vrstni red slik v galeriji</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Povlecite sliko na novo mesto.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex" aria-label="Zapri"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>

        <div ref={gridRef} className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-5">
          {order.map((orig, i) => (
            <div key={orig} {...tileProps(i)} style={{ aspectRatio: "4/3", ...tileStyle(i) }}
              aria-label={`Slika ${i + 1}`}
              className={`relative rounded-xl overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary ${dragIndex === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
              <img src={sources[orig]} alt="" draggable={false} className={`w-full h-full object-cover ${dragIndex === i ? "opacity-30" : ""}`} />
              <span className="absolute top-1.5 left-1.5 min-w-6 h-6 px-1.5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-medium tabular-nums pointer-events-none">
                {placeOf(i) + 1}
              </span>
            </div>
          ))}
        </div>
        {floating}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Prekliči</Button>
          <Button size="sm" onClick={save}>Shrani</Button>
        </div>
      </div>
    </div>
  );
}
