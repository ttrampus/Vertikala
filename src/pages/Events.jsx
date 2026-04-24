import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Search, X, Calendar, ArrowRight, Heart, MessageCircle } from "lucide-react";
import moment from "moment";
import TagBadge from "../components/TagBadge";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("BlogPost")
        .select("*")
        .eq("status", "published")
        .eq("category", "events")
        .order("created_date", { ascending: false });

      if (!alive) return;
      if (error) { console.error(error); setLoading(false); return; }
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
    return () => { alive = false; };
  }, []);

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    return (
      !search ||
      e.title?.toLowerCase().includes(q) ||
      e.summary?.toLowerCase().includes(q) ||
      e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const upcoming = filtered.slice(0, 1)[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="relative h-[240px] md:h-[340px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-black" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(168,85,247,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(251,146,60,0.1) 0%, transparent 50%)"
        }} />
        <div className="absolute inset-0 flex flex-col justify-end px-6 lg:px-16 pb-8">
          <p className="text-[10px] font-inter font-semibold tracking-[0.25em] uppercase text-white/50 mb-1">Alpinistični klub</p>
          <h1 className="font-inter font-black text-4xl md:text-5xl tracking-[-0.04em] leading-none text-white">
            Dogodki &amp; <span className="text-primary">Prireditve</span>
          </h1>
          <p className="font-serif text-white/60 text-sm mt-2">
            Vse kar se dogaja v klubu — ture, predavanja, srečanja in več.
          </p>
        </div>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-3 border-b border-border bg-muted/40 divide-x divide-border">
        {[
          { n: events.length, l: "Dogodki" },
          { n: events.filter(e => moment(e.created_date).isAfter(moment().subtract(30, 'days'))).length, l: "Ta mesec" },
          { n: new Set(events.map(e => e.author_name || e.created_by)).size, l: "Organizatorji" },
        ].map(({ n, l }) => (
          <div key={l} className="flex flex-col items-center justify-center py-2.5">
            <span className="font-inter font-bold text-base leading-none">{n}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{l}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-6 lg:px-16 py-3 flex items-center gap-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Išči dogodke..."
            className="pl-8 pr-7 py-1.5 text-sm font-inter bg-muted/50 border border-border rounded-full focus:outline-none focus:ring-1 focus:ring-primary w-48"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        {search && (
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{filtered.length}</span> rezultatov
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <p className="font-inter font-black text-7xl text-muted/40 mb-3">—</p>
          <p className="font-serif text-muted-foreground">Ni najdenih dogodkov.</p>
        </div>
      ) : (
        <>
          {/* Featured upcoming event */}
          {upcoming && !search && (
            <section className="px-6 lg:px-16 py-8 border-b border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">Naslednji dogodek</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Link to={`/post/${upcoming.id}`} className="group grid lg:grid-cols-[1fr_360px] gap-8 items-start">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <TagBadge tag="events" />
                    <span className="text-xs text-muted-foreground font-inter flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {moment(upcoming.created_date).format("DD. MM. YYYY")}
                    </span>
                  </div>
                  <h2 className="font-inter font-black text-3xl lg:text-4xl tracking-[-0.03em] leading-tight mb-4 group-hover:text-primary transition-colors">
                    {upcoming.title}
                  </h2>
                  {upcoming.summary && (
                    <p className="font-serif text-muted-foreground text-base leading-relaxed mb-6 max-w-xl line-clamp-3">
                      {upcoming.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="font-inter font-semibold text-sm">{upcoming.author_name || "Klub"}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Heart className="h-3 w-3" />{upcoming.likes_count || 0}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <MessageCircle className="h-3 w-3" />{upcoming.comments_count || 0}
                    </span>
                    <span className="ml-auto flex items-center gap-1 font-inter font-bold text-primary text-xs uppercase tracking-wide">
                      Preberi <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
                {upcoming.featured_image ? (
                  <div className="overflow-hidden rounded-xl aspect-[4/3] order-first lg:order-last">
                    <img src={upcoming.featured_image} alt={upcoming.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="hidden lg:flex overflow-hidden rounded-xl aspect-[4/3] bg-gradient-to-br from-purple-500/10 to-muted items-center justify-center order-first lg:order-last">
                    <Calendar className="h-16 w-16 text-purple-500/20" />
                  </div>
                )}
              </Link>
            </section>
          )}

          {/* Rest of events */}
          {(search ? filtered : rest).length > 0 && (
            <section className="border-b border-border">
              {!search && (
                <div className="flex items-center gap-3 px-6 lg:px-16 py-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">Vsi dogodki</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-border border-t border-border">
                {(search ? filtered : rest).map((event, i) => (
                  <Link
                    key={event.id}
                    to={`/post/${event.id}`}
                    className="group p-5 flex flex-col gap-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-inter font-black text-2xl text-muted-foreground/20 leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {event.featured_image && (
                      <div className="overflow-hidden rounded-lg aspect-[16/9]">
                        <img src={event.featured_image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-inter flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {moment(event.created_date).format("DD. MM. YYYY")}
                      </span>
                    </div>
                    <h3 className="font-inter font-bold text-sm leading-snug tracking-tight group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    {event.summary && (
                      <p className="font-serif text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                        {event.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2.5 mt-auto pt-1 text-[10px] text-muted-foreground">
                      <span className="font-inter font-medium text-foreground/70">{event.author_name || "Klub"}</span>
                      <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{event.likes_count || 0}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{event.comments_count || 0}</span>
                      <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

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