import { useState, useRef } from "react";
import { X } from "lucide-react";
import { normName, coClimbersOf } from "@/lib/ascentPeople";

// Predlogi imen pri vpisu vzpona: člani (iz profilov) in imena, ki so že
// vpisana pri vzponih. Izbran predlog se vpiše natanko tako, kot je zapisan,
// da se "Moji vzponi", osebni izvoz in opozorilo o podvojenem vzponu ujamejo.
// Vpisati je še vedno mogoče katerokoli ime — partner ni nujno član.

// Ujemanje z začetkom imena ali priimka, brez velikih črk in šumnikov:
// "kri" najde "Krištof Perc", "perc" tudi.
function matches(suggestions, text, skip) {
  const q = normName(text);
  if (!q) return [];
  return suggestions
    .filter((s) => !skip(s.name))
    .filter((s) => { const n = normName(s.name); return n.startsWith(q) || n.includes(" " + q); })
    .slice(0, 6);
}

function SuggestionList({ items, active, onPick, onHover, theme }) {
  if (!items.length) return null;
  return (
    <div
      role="listbox"
      style={{
        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
        background: theme.isDark ? "#1a1a1a" : "#fff", border: `1px solid ${theme.border}`,
        borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: "4px",
      }}
    >
      {/* mousedown, ne click: klik bi polje najprej zameglil in seznam zaprl */}
      {items.map((s, i) => (
        <div
          key={s.name}
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => { e.preventDefault(); onPick(s.name); }}
          onMouseEnter={() => onHover(i)}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px",
            padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: "14px", color: theme.text,
            background: i === active ? (theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
          }}
        >
          <span>{s.name}</span>
          {s.member && (
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: theme.textLow }}>Član</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Puščici izbirata, Enter vpiše izbrani predlog, Escape seznam zapre.
// Vrne true, če je tipko porabil seznam.
function listKeys(e, items, active, setActive, pick, close) {
  if (!items.length) return false;
  if (e.key === "ArrowDown") setActive((active + 1) % items.length);
  else if (e.key === "ArrowUp") setActive((active - 1 + items.length) % items.length);
  else if (e.key === "Enter") pick(items[active].name);
  else if (e.key === "Escape") close();
  else return false;
  e.preventDefault();
  return true;
}

/** Eno ime (Plezalec). */
export function NameField({ value, onChange, suggestions, theme, style, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Predlog, ki je natanko že vpisan, nima kaj ponuditi; "gregor trampus"
  // pa ostane v seznamu, da se lahko zamenja s pravilnim zapisom.
  const items = open ? matches(suggestions, value, (name) => name === value) : [];
  const pick = (name) => { onChange(name); setOpen(false); };

  return (
    <div style={{ position: "relative" }}>
      <input
        required={required}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => listKeys(e, items, active, setActive, pick, () => setOpen(false))}
        onBlur={() => setOpen(false)}
        style={style}
      />
      <SuggestionList items={items} active={active} onPick={pick} onHover={setActive} theme={theme} />
    </div>
  );
}

/** Več imen kot oznake (Soplezalec); shrani se kot "Ime Priimek, Ime Priimek". */
export function NamesField({ value, onChange, suggestions, theme, style, placeholder }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Natipkano ime, ki še ni oznaka, je že del vrednosti (na koncu). Tako se
  // shrani, tudi če kdo takoj klikne Shrani, polje pa se ob odhodu ne
  // spremeni — sicer bi nova oznaka lahko skočila v novo vrstico, gumb
  // Shrani bi se med klikom premaknil in klik bi zgrešil.
  const pending = text.trim() && value.endsWith(text) ? text : "";
  const names = coClimbersOf({ co_climber: pending ? value.slice(0, -pending.length) : value });
  const chosen = (name) => names.some((n) => normName(n) === normName(name));
  const items = open ? matches(suggestions, text, chosen) : [];

  const emit = (list, typed) => {
    setText(typed);
    onChange([...list, ...(typed.trim() ? [typed] : [])].join(", "));
  };
  const add = (...raw) => {
    const fresh = raw.map((n) => n.trim()).filter((n) => n && !chosen(n));
    emit([...names, ...fresh], "");
    setOpen(false);
  };
  const remove = (i) => emit(names.filter((_, j) => j !== i), text);

  const onKeyDown = (e) => {
    if (listKeys(e, items, active, setActive, add, () => setOpen(false))) return;
    if ((e.key === "Enter" || e.key === ",") && text.trim()) { e.preventDefault(); add(text); }
    else if (e.key === "Enter") e.preventDefault(); // prazen Enter ne odda obrazca po nesreči
    else if (e.key === "Backspace" && !text && names.length) remove(names.length - 1);
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{ ...style, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", padding: "6px 8px", cursor: "text", minHeight: "42px" }}
      >
        {names.map((n, i) => (
          <span
            key={n + i}
            style={{
              display: "inline-flex", alignItems: "center", gap: "2px", padding: "3px 4px 3px 10px",
              borderRadius: "999px", background: "rgba(232,80,26,0.1)", color: theme.text,
              fontFamily: "'Inter', sans-serif", fontSize: "13px", lineHeight: 1.4,
            }}
          >
            {n}
            <button
              type="button"
              aria-label={`Odstrani ${n}`}
              onClick={(e) => { e.stopPropagation(); remove(i); }}
              style={{ display: "flex", background: "none", border: "none", padding: "2px", cursor: "pointer", color: theme.textLow, borderRadius: "999px" }}
            ><X size={12} /></button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          autoComplete="off"
          placeholder={names.length ? "" : placeholder}
          onChange={(e) => {
            // Prilepljeno "Ana Novak, Žak Kos" postane dve oznaki; zadnji del ostane za tipkanje.
            const parts = e.target.value.split(",");
            const fresh = parts.slice(0, -1).map((n) => n.trim()).filter((n) => n && !chosen(n));
            emit([...names, ...fresh], parts.at(-1).trimStart());
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          style={{ flex: 1, minWidth: "120px", border: "none", outline: "none", background: "transparent", color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: "14px", padding: "4px 2px" }}
        />
      </div>
      <SuggestionList items={items} active={active} onPick={add} onHover={setActive} theme={theme} />
    </div>
  );
}
