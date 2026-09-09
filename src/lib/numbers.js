// Slovene writes decimals with a comma ("4,5 h") and groups thousands with a
// dot, but only from five digits up ("2864 m", "12.500 m") — which is exactly
// what Intl's "min2" grouping does. Every number shown to a member goes
// through here; JS's own toString would print "4.5".

const nf = new Intl.NumberFormat("sl-SI", { useGrouping: "min2", maximumFractionDigits: 2 });

/** 4.5 → "4,5"; 12500 → "12.500"; 2864 → "2864". */
export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : parseDecimal(value);
  if (n === null || Number.isNaN(n)) return "";
  return nf.format(n);
}

/**
 * Read a number a member typed. Accepts the Slovene "4,5" as well as "4.5",
 * because a keyboard's numeric pad gives a dot and people use both.
 * Returns null when there is no number in the text.
 */
export function parseDecimal(text) {
  if (typeof text === "number") return Number.isNaN(text) ? null : text;
  if (!text) return null;
  const cleaned = String(text).trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}
