import { useEffect, useState } from "react";
import { formatNumber, parseDecimal } from "@/lib/numbers";

// <input type="number"> only accepts the decimal separator of the BROWSER's
// locale, so on an English browser a member simply cannot type "4,5" — the
// keystroke is swallowed. This is a text field instead: it takes a comma or a
// dot, hands the parent a real Number, and prints the value back in Slovene.
export default function DecimalField({ value, onChange, placeholder, className, style, id }) {
  const [text, setText] = useState(() => (value === "" || value === null || value === undefined ? "" : formatNumber(value)));

  // Follow the parent when it resets or loads a different post, but never
  // rewrite what is being typed (otherwise "4," collapses to "4" mid-entry).
  useEffect(() => {
    const incoming = value === "" || value === null || value === undefined ? "" : value;
    setText((cur) => (parseDecimal(cur) === (incoming === "" ? null : incoming) ? cur : incoming === "" ? "" : formatNumber(incoming)));
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d.,-]/g, "");
    setText(raw);
    if (raw.trim() === "") { onChange(""); return; }
    const n = parseDecimal(raw);
    if (n !== null) onChange(n);
  };

  // Reprint in Slovene once they leave the field; drop anything unparseable.
  const handleBlur = () => {
    const n = parseDecimal(text);
    setText(n === null ? "" : formatNumber(n));
    if (n === null && text.trim() !== "") onChange("");
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}
