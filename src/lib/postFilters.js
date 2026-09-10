// Iskanje, filtriranje in razvrščanje seznamov objav.
//
// Uporabljata ga nadzorna plošča skrbnika in stran „Moje objave“, da se v obeh
// obnašata enako — isti pomen iskanja, isti vrstni red, ista imena razvrstitev.

export const SORTS = [
  { value: "newest", label: "Najnovejše" },
  { value: "oldest", label: "Najstarejše" },
  { value: "title", label: "Naslov A–Ž" },
  { value: "title_desc", label: "Naslov Ž–A" },
  { value: "likes", label: "Največ všečkov" },
  { value: "views", label: "Največ ogledov" },
];

export const STATUSES = [
  { value: "published", label: "Objavljeno" },
  { value: "draft", label: "Osnutek" },
];

export const EMPTY_FILTERS = { q: "", category: "", status: "", sort: "newest" };

export const hasActiveFilters = (f) =>
  Boolean(f.q?.trim() || f.category || f.status) || f.sort !== EMPTY_FILTERS.sort;

const time = (p) => new Date(p.created_date || 0).getTime();
const num = (v) => Number(v) || 0;

// Slovenska abeceda: "č" se brez collatorja uvrsti za "z".
const collator = new Intl.Collator("sl", { sensitivity: "base", numeric: true });

const comparators = {
  newest: (a, b) => time(b) - time(a),
  oldest: (a, b) => time(a) - time(b),
  title: (a, b) => collator.compare(a.title || "", b.title || ""),
  title_desc: (a, b) => collator.compare(b.title || "", a.title || ""),
  likes: (a, b) => num(b.likes_count) - num(a.likes_count) || time(b) - time(a),
  views: (a, b) => num(b.views_count) - num(a.views_count) || time(b) - time(a),
};

// Iskanje teče čez tisto, kar je na vrstici tudi vidno: naslov, povzetek in
// avtorja. Skrbnik dobi še e-pošto avtorja, ker je na njegovem seznamu edina
// stvar, po kateri se da ločiti dva člana z istim imenom.
const haystack = (p) =>
  [p.title, p.summary, p.author_name, p.author_email, p.created_by]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function applyPostFilters(posts, filters) {
  const { q = "", category = "", status = "", sort = "newest" } = filters || {};
  const needle = q.trim().toLowerCase();

  const out = (posts || []).filter((p) => {
    if (category && p.category !== category) return false;
    if (status && p.status !== status) return false;
    if (needle && !haystack(p).includes(needle)) return false;
    return true;
  });

  // Vrne novo polje, izvirnega seznama ne premeša.
  return out.sort(comparators[sort] || comparators.newest);
}
