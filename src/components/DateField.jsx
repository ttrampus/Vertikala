import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { sl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { formatDate, toDate } from "@/lib/dates";

// A native <input type="date"> renders in the BROWSER's locale, not the
// page's — a member running an English browser sees mm/dd/yyyy however the
// site is written, and nothing in CSS or the `lang` attribute changes that.
// This field keeps the same ISO "YYYY-MM-DD" value in state (so every caller
// and the database are untouched) but always shows and accepts dd/mm/llll.

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const toIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Parse what the user typed. Accepts d/M/yyyy in any padding, tolerates "."
// and "-" as separators (the other habits people have), and takes a bare
// "18092007" so the date can be typed without reaching for a separator key.
function parseTyped(text) {
  const t = text.trim();
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/) || t.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const date = new Date(y, mo - 1, d, 12);
  // Rejects 31/02/2026 and friends: JS would roll them over to March.
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export default function DateField({ value, onChange, style, className, required, id, disabled }) {
  const [text, setText] = useState(() => (ISO.test(value || "") ? formatDate(value) : ""));
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Follow the value when the parent changes it (opening an edit form,
  // resetting after save) — but never while the user is mid-typing.
  useEffect(() => {
    const next = ISO.test(value || "") ? formatDate(value) : "";
    setText((cur) => (parseTyped(cur) && toIso(parseTyped(cur)) === value ? cur : next));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Deliberately no input mask: re-writing the text mid-typing fights the
  // caret (and broke "18092007" as soon as the first slash went in). Accept
  // what is typed, parse it, and tidy the display on blur instead.
  const handleType = (e) => {
    const raw = e.target.value.replace(/[^\d./-]/g, "").slice(0, 10);
    setText(raw);
    if (raw === "") { onChange(""); return; }
    const parsed = parseTyped(raw);
    if (parsed) onChange(toIso(parsed));
  };

  // Tidy up on blur: a valid date is re-printed padded, anything unparseable
  // is dropped back to the last value the parent actually holds.
  const handleBlur = () => {
    const parsed = parseTyped(text);
    if (parsed) setText(formatDate(toIso(parsed)));
    else setText(ISO.test(value || "") ? formatDate(value) : "");
  };

  const selected = ISO.test(value || "") ? toDate(value) : undefined;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/llll"
        value={text}
        onChange={handleType}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        style={style ? { ...style, paddingRight: "38px" } : undefined}
        className={className}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="Izberi datum"
        style={{
          position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", padding: "4px", cursor: disabled ? "default" : "pointer",
          display: "flex", opacity: 0.6, color: "inherit",
        }}
      >
        <CalendarIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute z-[300] mt-1 rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{ top: "100%", left: 0 }}
        >
          <Calendar
            mode="single"
            locale={sl}
            defaultMonth={selected}
            selected={selected}
            onSelect={(d) => { if (d) { onChange(toIso(d)); setText(formatDate(toIso(d))); } setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}
