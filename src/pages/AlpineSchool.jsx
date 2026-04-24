import { Check, Mail, Phone, MapPin, Calendar, ArrowRight } from "lucide-react";

const SCHOOL_IMAGE = "https://media.base44.com/images/public/69dbd4180b1b66b19635d3a4/7a4c30aa2_generated_eee97573.png";

const TOPICS = [
  { title: "Oprema & priprava", desc: "Oprema in priprava na turo, zgodovina alpinizma, orientacija" },
  { title: "Varnost", desc: "Prva pomoč, nevarnosti v gorah, izrazoslovje, vreme" },
  { title: "Vrvna tehnika", desc: "Vozli, sidrišča, samoreševanje, reševanje soplezalca" },
  { title: "Plezanje", desc: "Športno plezanje, plezanje zaledenelih slapov, turna smuka" },
  { title: "Zimska tehnika", desc: "Sneg, led in plazovi" },
  { title: "Etika", desc: "Etika in varstvo narave" },
];

const INSTRUCTORS = [
  { name: "Gregor Trampuš", role: "Glavni inštruktor", initials: "GT" },
  { name: "Ana Kovač", role: "Inštruktorica plezanja", initials: "AK" },
  { name: "Marko Štefan", role: "Zimska tehnika", initials: "MŠ" },
];

export default function AlpineSchool() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div className="relative h-[320px] md:h-[460px] overflow-hidden">
        <img src={SCHOOL_IMAGE} alt="Alpine school" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/75" />
        <div className="absolute inset-0 flex flex-col justify-end px-6 lg:px-16 pb-8">
          <p className="text-[10px] font-inter font-semibold tracking-[0.25em] uppercase text-white/50 mb-1">Program 2025</p>
          <h1 className="font-inter font-black text-4xl md:text-5xl tracking-[-0.04em] leading-none text-white drop-shadow-lg">
            Alpinistična <span className="text-primary">šola</span>
          </h1>
          <p className="font-serif text-white/70 text-sm mt-2 max-w-lg">
            Celovit program za vse, ki želijo varno in odgovorno stopiti v svet alpinizma.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 border-b border-border bg-muted/40 divide-x divide-border">
        {[
          { n: "6", l: "Modulov" },
          { n: "Mar", l: "Začetek" },
          { n: "∞", l: "Pustolovščin" },
          { n: "PZS", l: "Akreditacija" },
        ].map(({ n, l }) => (
          <div key={l} className="flex flex-col items-center justify-center py-2.5">
            <span className="font-inter font-bold text-base leading-none">{n}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{l}</span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="px-6 lg:px-16 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10 border-b border-border">

        {/* Left: description */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">O šoli</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="font-serif text-base leading-relaxed text-foreground/80">
            V mesecu marcu pričenjamo z novo sezono alpinistične šole! Na uvodnem sestanku boste dobili vse informacije o poteku šole, načrtu dela in spoznali inštruktorje.
          </p>
          <p className="font-serif text-sm leading-relaxed text-muted-foreground">
            Prihodnja alpinistična šola bo omogočala tudi program <span className="font-semibold text-foreground">"Skalni plezalec"</span>, ki je že pod okriljem Komisije za alpinizem PZS. Praktično vsa poglavja boste spoznali v teoriji kot tudi v praksi. Število udeležencev bo omejeno.
          </p>

          {/* Intro meeting card */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-orange-200 bg-orange-500/5">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="font-inter font-semibold text-sm">Uvodni sestanek</p>
              <p className="text-xs text-muted-foreground mt-0.5">Četrtek, 06.03.2025 · Klubski prostori v Tacnu</p>
              <p className="text-xs text-muted-foreground">Pločanska 8, 1000 Ljubljana</p>
            </div>
          </div>
        </div>

        {/* Right: contact + info */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <p className="font-inter font-semibold text-sm">Kontakt</p>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span>gregor.trampus@siol.net</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>041-377-159</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Pločanska 8, Tacen, Ljubljana</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-primary font-inter font-semibold">Akreditacija</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Program "Skalni plezalec" pod okriljem Komisije za alpinizem PZS.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-orange-500 font-inter font-semibold">Omejeno število mest</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Prijavite se čim prej — število udeležencev je omejeno.
            </p>
          </div>
        </div>
      </div>

      {/* Topics */}
      <div className="px-6 lg:px-16 py-10 border-b border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">Teme šole</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOPICS.map((topic, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="font-inter font-semibold text-sm">{topic.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{topic.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructors */}
      <div className="px-6 lg:px-16 py-10 border-b border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">Inštruktorji</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {INSTRUCTORS.map((inst) => (
            <div key={inst.name} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {inst.initials}
              </div>
              <div>
                <p className="font-inter font-semibold text-sm">{inst.name}</p>
                <p className="text-xs text-muted-foreground">{inst.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <footer className="px-6 lg:px-16 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <h2 className="font-inter font-black text-xl tracking-tighter">
          AK<span className="text-orange-500">Vertikala</span>
        </h2>
        <p className="text-xs text-muted-foreground font-inter">
          © {new Date().getFullYear()} Alpine Club · All rights reserved.
        </p>
      </footer>
    </div>
  );
}