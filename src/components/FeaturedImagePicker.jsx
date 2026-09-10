import { useRef, useState } from "react";
import { Loader2, Upload, X, Crosshair } from "lucide-react";
import CardImage from "./CardImage";

// Naslovna slika objave: nalaganje, odstranitev in nastavitev žarišča.
//
// Kartice in glava objave imajo stalno obliko, slike pa ne, zato se vse, kar
// štrli čez okvir, odreže. Žarišče (CSS object-position) pove, katera točka
// slike mora ostati vidna — pri pokončni fotografiji običajno zgoraj, da glave
// ne odpadejo. Brez žarišča se reže od sredine, kar je dosedanje vedenje.
//
// Predogledi spodaj so isti CardImage kot na strani, v razmerjih pravih okvirov,
// da je izrez viden že med urejanjem in ne šele po objavi.

const CENTER = "50% 50%";

// Razmerja pravih okvirov na strani: izpostavljena kartica (Domov), kartica v
// mreži (Domov, Vzponi) in glava objave. Če se okvir na strani spremeni,
// popravite tudi tukaj, sicer predogled laže. Tabori podajo svoja razmerja
// prek "previews".
const POST_PREVIEWS = [
  { label: "Izpostavljeno", ratio: 603 / 349 },
  { label: "Kartica", ratio: 337 / 180 },
  { label: "Glava objave", ratio: 700 / 320 },
];

const parse = (v) => {
  const m = /^(\d{1,3})% (\d{1,3})%$/.exec(v || "");
  return m ? { x: +m[1], y: +m[2] } : { x: 50, y: 50 };
};

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

export default function FeaturedImagePicker({
  value,
  focus,
  onFocusChange,
  onRemove,
  onUpload,
  uploading = false,
  previews = POST_PREVIEWS,
}) {
  const [ratio, setRatio] = useState(null);
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef(null);
  const point = parse(focus);

  // Okvir dobi razmerje slike, da se slika vanj natanko prilega — šele tako
  // klik pade tja, kamor uporabnik cilja.
  const boxStyle = ratio
    ? { aspectRatio: String(ratio), maxWidth: `min(100%, calc(420px * ${ratio}))` }
    : { aspectRatio: "16 / 9" };

  const setFromEvent = (e) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    onFocusChange(
      `${clamp(((e.clientX - r.left) / r.width) * 100)}% ${clamp(((e.clientY - r.top) / r.height) * 100)}%`
    );
  };

  const nudge = (e) => {
    const step = e.shiftKey ? 10 : 2;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onFocusChange(`${clamp(point.x + d[0])}% ${clamp(point.y + d[1])}%`);
  };

  if (!value) {
    return (
      <label className="flex flex-col items-center justify-center aspect-[16/9] max-w-2xl rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
        {uploading ? (
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Kliknite za nalaganje naslovne slike</span>
          </>
        )}
        <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={uploading} />
      </label>
    );
  }

  return (
    <div className="max-w-2xl">
      <div
        ref={boxRef}
        role="button"
        tabIndex={0}
        aria-label="Žarišče naslovne slike — kliknite točko, ki mora ostati vidna"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); setFromEvent(e); }}
        onPointerMove={(e) => dragging && setFromEvent(e)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={nudge}
        className="relative rounded-xl overflow-hidden bg-muted cursor-crosshair touch-none select-none focus:outline-none focus:ring-2 focus:ring-primary/60"
        style={boxStyle}
      >
        <img
          src={value}
          alt="Naslovna slika"
          onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Križec sedi na izbrani točki; prstan je viden na svetli in temni sliki. */}
        <div
          className="absolute pointer-events-none"
          style={{ left: `${point.x}%`, top: `${point.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <div className="h-7 w-7 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.45)] bg-white/10 backdrop-blur-[1px]" />
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
          aria-label="Odstrani naslovno sliko"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-inter">
        <span className="flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5" />
          Kliknite ali povlecite po sliki: izbrana točka ostane vidna, ko se slika obreže.
        </span>
        {focus && focus !== CENTER && (
          <button
            type="button"
            onClick={() => onFocusChange(CENTER)}
            className="text-primary hover:underline whitespace-nowrap"
          >
            Na sredino
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {previews.map((p) => (
          <div key={p.label}>
            {/* Napis nad sliko: okvirji imajo različna razmerja, zato bi se
                napisi pod njimi lovili vsak na svoji višini. */}
            <div className="mb-1.5 text-[11px] text-muted-foreground font-inter">{p.label}</div>
            <CardImage
              src={value}
              focus={focus}
              eager
              className="rounded-lg border border-border"
              style={{ aspectRatio: String(p.ratio) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
