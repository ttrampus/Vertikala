import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";
import {
  Loader2,
  Search,
  X,
  Heart,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import moment from "moment";
import TagBadge from "../components/TagBadge";

const CATEGORIES = ["climbs", "trips", "events", "gear", "training", "news"];

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      setLoading(true);

      try {
        const [postsRes, eventsRes] = await Promise.all([
          supabase
            .from("BlogPost")
            .select("*")
            .eq("status", "published")
            .order("created_date", { ascending: false }),

          supabase
            .from("BlogPost")
            .select("*")
            .eq("status", "published")
            .eq("category", "events")
            .order("created_date", { ascending: false }),
        ]);

        if (!alive) return;

        if (postsRes.error || eventsRes.error) {
          console.error(postsRes.error || eventsRes.error);
          setLoading(false);
          return;
        }

        const allPosts = postsRes.data || [];

        setPosts(allPosts);
        setEvents(eventsRes.data || []);

        const counts = {};
        allPosts.forEach((p) => {
          const name = p.author_name || p.created_by || "Member";
          counts[name] = (counts[name] || 0) + 1;
        });

        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([name, count]) => ({ name, count }));

        if (alive) {
          setLeaderboard(sorted);
          setLoading(false);
        }
      } catch (err) {
        console.error("Home fetch failed:", err);
        if (alive) setLoading(false);
      }
    };

    fetchData();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = posts.filter((post) => {
    const q = search.toLowerCase();

    const matchSearch =
      !search ||
      post.title?.toLowerCase().includes(q) ||
      post.summary?.toLowerCase().includes(q) ||
      post.author_name?.toLowerCase().includes(q) ||
      post.tags?.some((t) => t.toLowerCase().includes(q));

    return matchSearch && (!category || post.category === category);
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);
  const maxCount = leaderboard[0]?.count || 1;

  return (
    <div className="min-h-screen bg-background">

      {/* ── MASTHEAD ── */}
      <header className="relative h-[320px] md:h-[480px] overflow-hidden">
  <img
    src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80"
    alt="Alpine mountains"
    className="w-full h-full object-cover"
  />
  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
  <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
    <p className="text-[10px] font-inter font-semibold tracking-[0.25em] uppercase text-white/70 mb-3">Est. 2020</p>
    <h1 className="font-inter font-black text-5xl md:text-7xl lg:text-8xl tracking-[-0.04em] leading-none drop-shadow-xl">
      AK<span className="text-primary">Vertikala</span>
    </h1>
    <p className="font-serif text-white/80 text-base md:text-lg mt-4 max-w-md leading-relaxed">
      Stories from the summit — climbers, explorers &amp; mountain lovers.
    </p>
  </div>
</header>

      {/* ── STATS BAR ── */}
     <div className="grid grid-cols-4 border-b border-border bg-muted/40 divide-x divide-border">
  {[
    { n: posts.length, l: "Dispatches" },
    { n: leaderboard.length, l: "Contributors" },
    { n: events.length > 0 ? events.length : "—", l: "Events" },
    { n: new Set(posts.map(p => p.category)).size, l: "Categories" },
  ].map(({ n, l }) => (
    <div key={l} className="flex flex-col items-center justify-center py-2.5">
      <span className="font-inter font-bold text-base leading-none">{n}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{l}</span>
    </div>
  ))}
</div>

      {/* ── SEARCH + FILTER ── */}
<div className="px-6 lg:px-16 pt-7 pb-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search posts..."
      className="pl-9 pr-8 py-2.5 text-sm font-inter bg-muted/50 border border-border rounded-full focus:outline-none focus:ring-1 focus:ring-primary w-60"
    />
    {search && (
      <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    )}
  </div>

  <div className="flex items-center gap-3 flex-wrap">
    <button
      onClick={() => setCategory("")}
      className={`px-5 py-2 text-sm font-inter font-medium rounded-full border transition-colors whitespace-nowrap ${
        !category ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-primary"
      }`}
    >All</button>
    {CATEGORIES.map((cat) => (
      <button
        key={cat}
        onClick={() => setCategory(category === cat ? "" : cat)}
        className={`rounded-full transition-all whitespace-nowrap ${
          category === cat ? "opacity-100 scale-105" : "opacity-50 hover:opacity-80"
        }`}
      >
        <TagBadge tag={cat} />
      </button>
    ))}
  </div>
</div>



      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <p className="font-inter font-black text-7xl text-muted/40 mb-3">404</p>
          <p className="font-serif text-muted-foreground">No posts match your search.</p>
        </div>
      ) : (
        <>
          {/* ── FEATURED ── */}
          {featured && !search && !category && (
            <section className="px-6 lg:px-16 py-8 border-b border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">Featured dispatch</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Link to={`/post/${featured.id}`} className="group grid lg:grid-cols-[1fr_360px] gap-8 items-start">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    {featured.category && <TagBadge tag={featured.category} />}
                    <span className="text-xs text-muted-foreground font-inter">
                      {moment(featured.created_date).format("MMM D, YYYY")}
                    </span>
                  </div>
                  <h2 className="font-inter font-black text-3xl lg:text-4xl tracking-[-0.03em] leading-tight mb-4 group-hover:text-primary transition-colors">
                    {featured.title}
                  </h2>
                  {featured.summary && (
                    <p className="font-serif text-muted-foreground text-base leading-relaxed mb-6 max-w-xl line-clamp-3">
                      {featured.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-inter font-semibold text-sm">{featured.author_name || "Member"}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Heart className="h-3 w-3" />{featured.likes_count || 0}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <MessageCircle className="h-3 w-3" />{featured.comments_count || 0}
                    </span>
                    <span className="ml-auto flex items-center gap-1 font-inter font-bold text-primary text-xs uppercase tracking-wide">
                      Read <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
                {featured.featured_image ? (
                  <div className="overflow-hidden rounded-xl aspect-[4/3] order-first lg:order-last">
                    <img src={featured.featured_image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="hidden lg:flex overflow-hidden rounded-xl aspect-[4/3] bg-gradient-to-br from-primary/10 to-muted items-center justify-center order-first lg:order-last">
                    <span className="font-inter font-black text-6xl text-primary/10">AK</span>
                  </div>
                )}
              </Link>
            </section>
          )}

          {/* ── POSTS GRID ── */}
          <section className="border-b border-border">
            {(!search && !category) && (
              <div className="flex items-center gap-3 px-6 lg:px-16 py-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">Latest dispatches</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            {(search || category) && (
              <p className="font-inter text-sm text-muted-foreground px-6 lg:px-16 pt-4 pb-2">
                <span className="font-bold text-foreground">{filtered.length}</span> posts found
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-border border-t border-border">
              {(search || category ? filtered : rest).map((post, i) => (
                <Link key={post.id} to={`/post/${post.id}`} className="group p-5 flex flex-col gap-2.5 hover:bg-accent transition-colors duration-200">
                  <span className="font-inter font-black text-2xl text-muted-foreground/20 leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {post.featured_image && (
                    <div className="overflow-hidden rounded-lg aspect-[16/9]">
                      <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {post.category && <TagBadge tag={post.category} small />}
                    <span className="text-[10px] text-muted-foreground font-inter">{moment(post.created_date).format("MMM D")}</span>
                  </div>
                  <h3 className="font-inter font-bold text-sm leading-snug tracking-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  {post.summary && (
                    <p className="font-serif text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                      {post.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2.5 mt-auto pt-1 text-[10px] text-muted-foreground">
                    <span className="font-inter font-medium text-foreground/70">{post.author_name || "Member"}</span>
                    <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{post.likes_count || 0}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{post.comments_count || 0}</span>
                    <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── UPCOMING EVENTS ── */}
          {events.length > 0 && !search && !category && (
            <section className="px-6 lg:px-16 py-6 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">Upcoming events</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {events.map((ev) => (
                  <Link key={ev.id} to={`/post/${ev.id}`} className="group p-3.5 border border-border border-l-2 border-l-orange-500 rounded-lg hover:bg-muted/30 transition-colors">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      {moment(ev.created_date).format("MMM D, YYYY")}
                    </p>
                    <p className="font-inter font-bold text-sm leading-snug group-hover:text-primary transition-colors">{ev.title}</p>
                    {ev.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ev.summary}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── LEADERBOARD ── */}
          {leaderboard.length > 0 && !search && !category && (
            <section className="px-6 lg:px-16 py-6 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[9px] font-inter font-bold tracking-[0.2em] uppercase text-muted-foreground">Top contributors</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {leaderboard.map(({ name, count }, i) => (
                  <div key={name} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="font-inter text-xs text-muted-foreground w-4">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-inter font-medium text-sm flex-1">{name}</span>
                    <div className="h-1.5 rounded-full bg-orange-500/30 overflow-hidden" style={{ width: 80 }}>
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{count} post{count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── FOOTER ── */}
      <footer className="px-6 lg:px-16 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <h2 className="font-inter font-black text-xl tracking-tighter">
          AK<span className="text-orange-400">Vertikala</span>
        </h2>
        <p className="text-xs text-muted-foreground font-inter">
          © {new Date().getFullYear()} Alpine Club · All rights reserved.
        </p>
      </footer>
    </div>
  );
}