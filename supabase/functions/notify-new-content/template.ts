// Besedilo in HTML obvestila o novi objavi ali novem taboru. Samo oblikovanje,
// brez baze in pošiljanja — da se da predogled izrisati tudi izven Supabase.
//
// E-poštni odjemalci (Gmail, Outlook) ne podpirajo flexboxa, <style> v glavi
// pa marsikateri odstrani, zato so tu tabele in slogi v vrstici.

// Velikost je neobvezna: brez nje se slika raztegne čez vso širino.
export interface EmailImage {
  url: string;
  width?: number;
  height?: number;
}

export interface PostForEmail {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  image: EmailImage | null;
  category: string | null;
  is_public: boolean | null;
  created_date: string;
  author: string;
}

export interface CampForEmail {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  date_from: string | null;
  date_to: string | null;
  image: EmailImage | null;
}

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  climbs: "Vzponi",
  trips: "Izleti",
  events: "Tabori in dogodki",
  training: "Trening",
  news: "Novice",
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// "2026-09-30" ali časovni žig → "30. 9. 2026", kot se piše v slovenščini.
function slDate(value: string | null): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

function dateRange(from: string | null, to: string | null): string {
  if (!from) return "";
  if (!to || to === from) return slDate(from);
  return `${slDate(from)} – ${slDate(to)}`;
}

// Kratek odlomek iz HTML vsebine, kadar povzetek ni vpisan: brez oznak, na
// meji besede, največ ~280 znakov.
export function excerpt(html: string | null, max = 280): string {
  if (!html) return "";
  const text = html
    .replace(/<(br|\/p|\/h[1-6]|\/li)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : max).replace(/[,.;:–-]+$/, "") + " …";
}

// Slika v okvirju 504 × 320: široka zasede vso širino, pokončna je nižja in
// na sredini. Atributa width/height upošteva tudi Outlook; na ozkem zaslonu
// jo max-width:100% in height:auto sorazmerno pomanjšata.
const IMG_W = 504;
const IMG_H = 320;

function imageRow(img: EmailImage | null, href: string): string {
  if (!img) return "";
  let w = IMG_W, h: number | null = null;
  if (img.width && img.height) {
    const scale = Math.min(IMG_W / img.width, IMG_H / img.height);
    w = Math.round(img.width * scale);
    h = Math.round(img.height * scale);
  }
  const size = h ? `width="${w}" height="${h}"` : `width="${w}"`;
  return `<tr><td align="center" style="padding:10px 28px 0;"><a href="${esc(href)}"><img src="${esc(img.url)}" alt="" ${size} style="width:${w}px;max-width:100%;height:auto;border-radius:8px;display:block;border:0;"></a></td></tr>`;
}

function layout(o: {
  preheader: string;
  kicker: string;
  title: string;
  meta: string[];
  body: string;
  note?: string;
  image: EmailImage | null;
  button: { label: string; url: string };
  siteUrl: string;
}): string {
  const meta = o.meta.filter(Boolean).map(esc).join(" &nbsp;·&nbsp; ");
  return `<!doctype html>
<html lang="sl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ed;font-family:Helvetica,Arial,sans-serif;color:#141414;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ed;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:22px 28px 6px;">
          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#E8501A;font-weight:700;">AK Vertikala &nbsp;·&nbsp; ${esc(o.kicker)}</div>
        </td></tr>
        ${imageRow(o.image, o.button.url)}
        <tr><td style="padding:18px 28px 0;">
          <h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;color:#141414;">${esc(o.title)}</h1>
          ${meta ? `<div style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#777;">${meta}</div>` : ""}
          ${o.body ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">${esc(o.body)}</p>` : ""}
          ${o.note ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#8a5a00;background:#fff6e5;border-radius:6px;padding:8px 12px;">${esc(o.note)}</p>` : ""}
          <a href="${esc(o.button.url)}" style="display:inline-block;background:#E8501A;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;padding:12px 22px;border-radius:6px;">${esc(o.button.label)}</a>
        </td></tr>
        <tr><td style="padding:26px 28px 24px;">
          <hr style="border:none;border-top:1px solid #e8e3dd;margin:0 0 12px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#999;">
            Samodejno obvestilo ob novi objavi na <a href="${esc(o.siteUrl)}" style="color:#999;">${esc(o.siteUrl.replace(/^https?:\/\//, ""))}</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function renderPostEmail(post: PostForEmail, siteUrl: string): Email {
  const url = `${siteUrl}/post/${post.id}`;
  const category = CATEGORY_LABELS[post.category ?? ""] ?? "Objava";
  const body = post.summary?.trim() || excerpt(post.content);
  const note = post.is_public === false ? "Objava je vidna samo članom — za branje se prijavite na strani." : undefined;
  const html = layout({
    preheader: body || post.title,
    kicker: category,
    title: post.title,
    meta: [`Avtor: ${post.author}`, slDate(post.created_date)],
    body,
    note,
    image: post.image,
    button: { label: "Preberi objavo", url },
    siteUrl,
  });
  const text = [
    `Nova objava na strani AK Vertikala (${category})`,
    "",
    post.title,
    `Avtor: ${post.author} · ${slDate(post.created_date)}`,
    "",
    body,
    note ?? "",
    "",
    `Preberi objavo: ${url}`,
  ].filter((l, i, a) => l || a[i - 1]).join("\n");
  return { subject: `Nova objava: ${post.title}`, html, text };
}

export function renderCampEmail(camp: CampForEmail, siteUrl: string): Email {
  const url = `${siteUrl}/tabori-in-dogodki?tabor=${camp.id}`;
  const when = dateRange(camp.date_from, camp.date_to);
  const body = camp.summary?.trim() || excerpt(camp.description);
  const html = layout({
    preheader: body || camp.title,
    kicker: "Tabori in dogodki",
    title: camp.title,
    meta: [when, camp.location ?? ""],
    body,
    image: camp.image,
    button: { label: "Podrobnosti", url },
    siteUrl,
  });
  const text = [
    "Nov tabor ali dogodek na strani AK Vertikala",
    "",
    camp.title,
    [when, camp.location].filter(Boolean).join(" · "),
    "",
    body,
    "",
    `Podrobnosti: ${url}`,
  ].filter((l, i, a) => l || a[i - 1]).join("\n");
  return { subject: `Tabori in dogodki: ${camp.title}`, html, text };
}
