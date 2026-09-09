// Default content for the Alpine school page. This is the same text the page
// used to hard-code, kept here on purpose: the page renders from these values
// until an admin saves an edit, and falls back to them if Supabase is
// unreachable — so the page can never come up blank.
//
// Saved content is one JSONB row in site_content ('alpine-school'), merged
// OVER these defaults, so a field added here later still has a value on a row
// that was saved before it existed.

export const DEFAULT_SCHOOL = {
  hero: {
    eyebrow: "Program 2026",
    title: "Alpinistična",
    titleAccent: "šola",
    subtitle: "Celovit program za vse, ki želijo varno in odgovorno stopiti v svet alpinizma.",
    image: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1600&q=80",
    ctaLabel: "Prijavi se →",
    ctaEmail: "gregor.trampus@siol.net",
  },
  stats: [
    { val: "6", label: "Modulov" },
    { val: "Mar", label: "Pričetek" },
    { val: "∞", label: "Pustolovščin" },
    { val: "PZS", label: "Akreditacija" },
  ],
  about: {
    title: "O šoli",
    paragraphs: [
      "V mesecu marcu pričenjamo z novo sezono alpinistične šole! Na uvodnem sestanku boste dobili vse informacije o poteku šole, načrtu dela in spoznali inštruktorje.",
      "Prihodnja alpinistična šola bo omogočala tudi program „Skalni plezalci“, ki je pod okriljem Komisije za alpinizem PZS.",
    ],
  },
  meeting: {
    title: "Uvodni sestanek",
    // ISO date: the weekday and the dd/mm/yyyy rendering are derived, so this
    // can never drift out of the site's date format again.
    date: "2026-03-05",
    venue: "Klubski prostori v Tacnu",
    address: "Pločanska 8, 1000 Ljubljana",
    note: "Število udeležencev bo omejeno.",
  },
  modulesTitle: "Program šole",
  modules: [
    { title: "Osnove alpinizma", desc: "Oprema in priprava, zgodovina alpinizma, orientacija.", weeks: "2 tedna" },
    { title: "Skalno plezanje", desc: "Tehnika plezanja, postavljanje varovalnih točk, vodenje smeri.", weeks: "3 tedne" },
    { title: "Ledeno plezanje", desc: "Tehnika s cepin in dereze, varovanje na ledu in snegu.", weeks: "2 tedna" },
    { title: "Visokogorje", desc: "Bivouac tehnika, navigacija, reševanje v slabi vidljivosti.", weeks: "2 tedna" },
    { title: "Praktični vzponi", desc: "Skupinski vzponi pod mentorstvom izkušenih alpinistov.", weeks: "3 tedne" },
  ],
  instructorsTitle: "Inštruktorji",
  instructors: [
    { name: "Gregor Trampuš", role: "Glavni inštruktor" },
    { name: "Ana Kovač", role: "Inštruktorica plezanja" },
    { name: "Marko Štefan", role: "Zimska tehnika" },
  ],
  sidebar: {
    contactTitle: "Kontakt",
    email: "gregor.trampus@siol.net",
    phone: "041 377 159",
    address: "Pločanska 8, Tacen, Ljubljana",
    accreditationTitle: "Akreditacija",
    accreditationText: "Program „Skalni plezalci“ pod okriljem Komisije za alpinizem PZS.",
    noticeTitle: "⚠ Omejeno število mest",
    noticeText: "Prijavite se čim prej — število udeležencev je omejeno.",
  },
};

// Initials for the instructor avatars are derived, never typed: one less
// field to fill in, and they can't disagree with the name.
export function initialsFrom(name) {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

// Shallow-merge per section: a saved section replaces the default one field at
// a time, while arrays (modules, instructors, stats) are taken whole so a
// deleted row actually disappears instead of reappearing from the defaults.
export function mergeSchoolContent(saved) {
  if (!saved || typeof saved !== "object") return DEFAULT_SCHOOL;
  const out = { ...DEFAULT_SCHOOL };
  for (const [key, def] of Object.entries(DEFAULT_SCHOOL)) {
    const val = saved[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(def)) out[key] = Array.isArray(val) ? val : def;
    else if (def && typeof def === "object") out[key] = { ...def, ...val };
    else out[key] = val;
  }
  return out;
}
