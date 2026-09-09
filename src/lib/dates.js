import { format, formatDistanceToNow } from "date-fns";
import { sl } from "date-fns/locale";

// Dates are written day-first and numeric — "18/09/2007", never the US
// "Sep 18, 2007". Everything that renders a date goes through here so the
// whole site stays consistent; change the patterns below and every list,
// card, table and header follows.

// Postgres `date` columns arrive as bare "YYYY-MM-DD". `new Date()` reads
// those as UTC midnight, which renders as the previous day west of Greenwich
// and can shift by a day elsewhere too — anchoring at local noon avoids it.
// Timestamps (created_date, created_at) already carry a zone and pass through.
export function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  return new Date(value);
}

const safeFormat = (value, pattern) => {
  if (value === null || value === undefined || value === "") return "";
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, pattern, { locale: sl });
};

/** 18/09/2007 — the one date format used across the site. */
export const formatDate = (value) => safeFormat(value, "dd/MM/yyyy");

/** 18/09/2007 14:30 — where the time of day matters (admin, audit log). */
export const formatDateTime = (value) => safeFormat(value, "dd/MM/yyyy HH:mm");

/** pred 3 dnevi — relative, Slovene. */
export function formatRelativeDate(value) {
  if (!value) return "";
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true, locale: sl });
}
