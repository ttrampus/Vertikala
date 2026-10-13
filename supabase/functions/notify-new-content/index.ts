// Pošlje e-pošto ob novi objavi ali novem taboru (klubu na
// akvertikala@googlegroups.com; med preizkušanjem na osebni naslov).
// Deploy:  npx supabase functions deploy notify-new-content
//
// KAKO DELUJE
// Sprožilca v bazi (supabase/new_content_emails.sql) ob objavi prispevka ali
// novem taboru dodata vrstico v content_notifications in pocukata to funkcijo.
// Funkcija zahtevi ne verjame ničesar: prevzame čakajoče vrstice iz baze,
// objavo še enkrat prebere (še objavljena, ne izbrisana), pošlje in zapiše
// izid. Kdor jo pokliče, sproži kvečjemu pošiljanje tega, kar je baza že
// postavila v vrsto, in vsako objavo le enkrat. Baza jo kliče z javnim
// anon ključem, ker ima funkcija vklopljeno preverjanje JWT.
// Kar se ne pošlje (npr. skrivnosti še niso nastavljene), ostane v vrsti in
// gre ob naslednjem klicu.
//
// POŠILJANJE: Resend (brezplačno do 3000 sporočil na mesec) prek SMTP na
// vratih 465 — Supabase vrata 25 in 587 zapira. Pošiljatelj je naslov
// @vertikala.com, ki ga Resend podpiše (DKIM) v imenu domene, zato Gmail ve,
// da sporočilo res prihaja od vertikala.com. Nov Gmail račun, ki je pošiljal
// s strežnikov Supabase, je pri preizkusu končal med vsiljeno pošto.
// Skrivnosti (Dashboard → Edge Functions → Secrets):
//   SMTP_HOST   smtp.resend.com
//   SMTP_USER   resend (dobesedno)
//   SMTP_PASS   ključ API iz Resenda (re_...)
//   MAIL_FROM   naslov pošiljatelja na preverjeni domeni, npr. obvestila@vertikala.com
//   NOTIFY_TO   prejemniki, ločeni z vejico
// Neobvezno: MAIL_FROM_NAME (AK Vertikala), SITE_URL (https://vertikala.com).
// Za Gmail: brez SMTP_HOST in MAIL_FROM, SMTP_USER je Gmail naslov,
// SMTP_PASS njegovo "geslo za aplikacije".
// Skupina akvertikala@googlegroups.com mora pošiljatelju dovoliti objavljanje,
// sicer sporočila tiho zavrže.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";
import { renderPostEmail, renderCampEmail, type Email, type EmailImage } from "./template.ts";
import { imageSize } from "./imageSize.ts";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://vertikala.com").replace(/\/$/, "");
const FROM_NAME = Deno.env.get("MAIL_FROM_NAME") ?? "AK Vertikala";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

interface Job { id: number; kind: "post" | "camp"; item_id: string }

// Velikost slike iz prvih 64 KB (za pokončne naslovne slike); če ne gre, gre
// slika v e-pošto brez velikosti.
async function measure(url: string | null): Promise<EmailImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-65535" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { url };
    return { url, ...(imageSize(new Uint8Array(await res.arrayBuffer())) ?? {}) };
  } catch {
    return { url };
  }
}

// null = ni več kaj poslati (odstranjeno iz objave, izbrisano).
async function postEmail(db: SupabaseClient, id: string): Promise<Email | null> {
  const { data: p } = await db.from("BlogPost")
    .select("id, title, summary, content, featured_image, category, is_public, created_date, status, deleted_at, author_name, created_by_id")
    .eq("id", id).maybeSingle();
  if (!p || p.status !== "published" || p.deleted_at) return null;
  let author: string | undefined = p.author_name?.trim();
  if (!author && p.created_by_id) {
    const { data } = await db.from("profile").select("display_name").eq("id", p.created_by_id).maybeSingle();
    author = data?.display_name?.trim();
  }
  return renderPostEmail({ ...p, author: author || "Član kluba", image: await measure(p.featured_image) }, SITE_URL);
}

async function campEmail(db: SupabaseClient, id: string): Promise<Email | null> {
  const { data: c } = await db.from("camps")
    .select("id, title, summary, description, location, date_from, date_to, image_url")
    .eq("id", id).maybeSingle();
  if (!c) return null;
  return renderCampEmail({ ...c, image: await measure(c.image_url) }, SITE_URL);
}

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const setJob = (id: number, fields: Record<string, unknown>) =>
    db.from("content_notifications").update(fields).eq("id", id);

  const { data: jobs, error } = await db.rpc("claim_content_notifications");
  if (error) return json({ error: error.message }, 500);
  if (!jobs?.length) return json({ processed: 0 });

  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  const to = (Deno.env.get("NOTIFY_TO") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!user || !pass || !to.length) {
    for (const job of jobs as Job[]) {
      await setJob(job.id, { status: "failed", last_error: "Skrivnosti SMTP_USER, SMTP_PASS ali NOTIFY_TO niso nastavljene." });
    }
    return json({ processed: 0, reason: "not_configured" });
  }

  const transport = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const results: Record<string, string> = {};
  for (const job of jobs as Job[]) {
    try {
      const email = job.kind === "post" ? await postEmail(db, job.item_id) : await campEmail(db, job.item_id);
      if (!email) {
        await setJob(job.id, { status: "skipped", last_error: "Ni več objavljeno ali je izbrisano." });
        results[job.item_id] = "skipped";
        continue;
      }
      await transport.sendMail({
        from: { name: FROM_NAME, address: Deno.env.get("MAIL_FROM") || user },
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      await setJob(job.id, { status: "sent", sent_at: new Date().toISOString(), recipients: to.join(", "), last_error: null });
      results[job.item_id] = "sent";
    } catch (err) {
      await setJob(job.id, { status: "failed", last_error: String((err as Error)?.message ?? err).slice(0, 500) });
      results[job.item_id] = "failed";
    }
  }
  return json({ processed: jobs.length, results });
});
