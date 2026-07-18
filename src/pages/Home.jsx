import { useState, useEffect, useContext, useRef, useMemo } from "react";
import { useNavigate, useNavigationType, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ThemeCtx } from "@/lib/ThemeContext";
import { thumbUrl, thumbFallback } from "@/lib/thumbs";
import { format } from "date-fns";
import WeatherWidget from "../components/WeatherWidget";
import StatsSection from "../components/StatsSection";

const CATEGORIES = [
  { key: '', label: 'Vse' },
  { key: 'climbs', label: 'Vzponi' },
  { key: 'trips', label: 'Odprave' },
  { key: 'events', label: 'Dogodki' },
  { key: 'gear', label: 'Oprema' },
  { key: 'training', label: 'Trening' },
  { key: 'news', label: 'Novice' },
];

const CAT_LABEL = { climbs: 'Vzponi', trips: 'Odprave', events: 'Dogodki', gear: 'Oprema', training: 'Trening', news: 'Novice' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);

const PAGE_SIZE = 24; // cards rendered initially / added per "show more" click

// Module-level cache: coming BACK to the homepage renders the last-known list
// instantly (correct page height for scroll restore, no spinner) and refreshes
// it in the background. Cleared naturally on full page load.
let postsCache = null;

export default function Home() {
  const theme = useContext(ThemeCtx);
  const navigate = useNavigate();
  // Back/forward returns to the list the reader left: same search, category,
  // and number of loaded cards, so the restored scroll lands on the right spot.
  // Any other way of arriving (fresh load, reload, nav link) starts clean.
  const isBack = useNavigationType() === "POP" &&
    performance.getEntriesByType?.("navigation")[0]?.type !== "reload";
  const restored = useRef(
    isBack ? JSON.parse(sessionStorage.getItem("home:state") || "null") : null
  ).current;

  const [posts, setPosts] = useState(() => (isBack && postsCache) || []);
  const [loading, setLoading] = useState(() => !(isBack && postsCache));
  const [search, setSearch] = useState(restored?.search || '');
  const [activeCategory, setActiveCategory] = useState(restored?.category || '');
  const [visibleCount, setVisibleCount] = useState(restored?.visibleCount || PAGE_SIZE);
  // When returning, show every section immediately — replaying the reveal
  // fade at a restored scroll position reads as flicker, not polish.
  const [visible, setVisible] = useState(() =>
    restored ? { filters: true, featured: true, grid: true, 'school-cta': true } : {}
  );
  const heroBgRef = useRef(null);
  const firstFilterRun = useRef(true);

  useEffect(() => {
    sessionStorage.setItem("home:state",
      JSON.stringify({ search, category: activeCategory, visibleCount }));
  }, [search, activeCategory, visibleCount]);

  useEffect(() => {
    let alive = true;
    const fetchPosts = async () => {
      if (!postsCache) setLoading(true); // cached list stays visible during refresh
      const { data, error } = await supabase
        .from("BlogPost")
        // Only the columns the cards use — avoids transferring the full HTML
        // `content` and large jsonb fields for every post on the landing page.
        .select("id, title, summary, featured_image, author_name, category, created_date, likes_count, created_by, created_by_id")
        .eq("status", "published")
        .is("deleted_at", null)
        .order("created_date", { ascending: false });
      if (!alive) return;
      if (!error) {
        const list = data || [];
        // Override the stored author name/avatar with each author's CURRENT
        // profile, so cards reflect profile changes instead of the name saved
        // when the post was written. Only look up valid UUIDs — some legacy
        // posts have non-UUID created_by_id values that would otherwise make
        // the whole batched query fail.
        const ids = [...new Set(list.map((p) => p.created_by_id).filter(isUuid))];
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profile")
            .select("id, display_name, avatar_url")
            .in("id", ids);
          const map = {};
          (profs || []).forEach((pr) => { map[pr.id] = pr; });
          list.forEach((p) => {
            const pr = map[p.created_by_id];
            if (pr) {
              if (pr.display_name) p.author_name = pr.display_name;
              p.author_avatar = pr.avatar_url || null;
            }
          });
        }
        postsCache = list;
        if (alive) setPosts(list);
      }
      if (alive) setLoading(false);
    };
    fetchPosts();
    return () => { alive = false; };
  }, []);

  // Parallax via direct DOM transform — storing scrollY in state re-rendered
  // the entire page (hundreds of cards) on every scroll frame.
  useEffect(() => {
    const onScroll = () => {
      if (heroBgRef.current) heroBgRef.current.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const statItems = useMemo(() => [
    { val: posts.length, label: 'Objav' },
    { val: new Set(posts.map(p => p.author_name || p.created_by || 'Member')).size, label: 'Avtorjev' },
    { val: posts.filter(p => p.category === 'events').length, label: 'Dogodkov' },
    { val: new Set(posts.map(p => p.category).filter(Boolean)).size, label: 'Kategorij' },
  ], [posts]);

  // New search/filter restarts the pagination window (but not on mount,
  // which would clobber the count restored after back-navigation)
  useEffect(() => {
    if (firstFilterRun.current) { firstFilterRun.current = false; return; }
    setVisibleCount(PAGE_SIZE);
  }, [search, activeCategory]);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setVisible(v => ({ ...v, [e.target.dataset.reveal]: true }));
          obs.unobserve(e.target); // reveal once, then stop watching
        }
      });
      // threshold 0 = fire the moment any part enters; the positive bottom
      // rootMargin starts the reveal ~15% of a viewport BEFORE the section
      // scrolls in, so tall sections (e.g. the posts grid) are no longer
      // stuck invisible until you've nearly scrolled past them.
    }, { threshold: 0, rootMargin: '0px 0px 15% 0px' });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  const filtered = posts.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.title?.toLowerCase().includes(q) || p.summary?.toLowerCase().includes(q) || p.author_name?.toLowerCase().includes(q);
    return matchSearch && (!activeCategory || p.category === activeCategory);
  });

  const featuredPost = filtered[0];
  const otherPosts = filtered.slice(1, 1 + visibleCount);
  const hasMore = filtered.length - 1 > visibleCount;

  const rev = (key, extra = {}) => ({
    opacity: visible[key] ? 1 : 0,
    transform: visible[key] ? 'translateY(0)' : 'translateY(32px)',
    transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
    ...extra,
  });

  const formatDate = (d) => {
    try { return format(new Date(d), 'd. MMM yyyy'); } catch { return ''; }
  };

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', color: theme.text, transition: 'background 0.4s, color 0.4s' }}>
      {/* HERO */}
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 60%, rgba(10,10,10,1) 100%)', zIndex: 2 }} />
        <div ref={heroBgRef} style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center 30%', willChange: 'transform' }} />
        <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', padding: '0 24px', maxWidth: '900px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: '13px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '20px', opacity: 0, animation: 'fadeUp 0.8s 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}>EST. 1992 — SLOVENIJA</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(72px, 12vw, 140px)', lineHeight: 0.9, letterSpacing: '-0.01em', textTransform: 'uppercase', margin: '0 0 24px', color: '#fff', opacity: 0, animation: 'fadeUp 0.8s 0.5s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            AK<br /><span style={{ color: '#E8501A' }}>VERTIKALA</span>
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '18px', lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', maxWidth: '480px', margin: '0 auto 40px', opacity: 0, animation: 'fadeUp 0.8s 0.7s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            Zgodbe z vrhov — plezalci, raziskovalci &amp; ljubitelji gora
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp 0.8s 0.9s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            <button
              onClick={() => document.getElementById('posts-section')?.scrollIntoView({ block: 'start' })}
              style={{ background: '#E8501A', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 32px', borderRadius: '4px', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#c73d10'}
              onMouseLeave={e => e.currentTarget.style.background = '#E8501A'}
            >Beri objave</button>
            <button
              onClick={() => navigate('/alpine-school')}
              style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 32px', borderRadius: '4px', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; }}
            >Alpinistična šola →</button>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0, animation: 'fadeUp 0.8s 1.3s cubic-bezier(0.16,1,0.3,1) forwards' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Pomakni navzdol</span>
          <div style={{ width: '1px', height: '48px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)', animation: 'scrollPulse 2s infinite' }} />
        </div>
      </div>

      {/* STATS */}
      <StatsSection theme={theme} items={statItems} />

      {/* POSTS */}
      <div id="posts-section" style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 24px' }}>
        {/* Weather widget */}
        <WeatherWidget />

        {/* Filters */}
        <div data-reveal="filters" style={{ ...rev('filters'), display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '56px' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Išči objave..."
              style={{ width: '100%', boxSizing: 'border-box', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '11px 14px 11px 40px', color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: '14px', outline: 'none', transition: 'border-color 0.2s, background 0.4s' }}
              onFocus={e => e.target.style.borderColor = 'rgba(232,80,26,0.5)'}
              onBlur={e => e.target.style.borderColor = theme.border}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  background: activeCategory === cat.key ? '#E8501A' : theme.bgCard,
                  border: activeCategory === cat.key ? '1px solid #E8501A' : `1px solid ${theme.border}`,
                  color: activeCategory === cat.key ? '#fff' : theme.textMid,
                  cursor: 'pointer', borderRadius: '4px', padding: '8px 16px',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '13px',
                  letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.2s',
                }}
              >{cat.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: theme.textLow, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', letterSpacing: '0.1em' }}>NALAGANJE...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(44px, 10vw, 80px)', color: theme.border }}>404</div>
            <p style={{ fontFamily: "'Inter', sans-serif", color: theme.textLow }}>Ni najdenih objav.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featuredPost && (
              <div data-reveal="featured" style={{ ...rev('featured'), marginBottom: '64px' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.textFaint, marginBottom: '16px' }}>— Izpostavljeno</div>
                <Link to={`/post/${featuredPost.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'var(--col-2)', background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden', transition: 'border-color 0.3s, transform 0.3s, background 0.4s', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,80,26,0.4)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                          <span style={{ background: '#E8501A', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '3px' }}>{CAT_LABEL[featuredPost.category] || featuredPost.category || 'Objava'}</span>
                          <span style={{ color: theme.textLow, fontFamily: "'Inter', sans-serif", fontSize: '13px' }}>{formatDate(featuredPost.created_date)}</span>
                        </div>
                        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 5.5vw, 42px)', lineHeight: 1.05, letterSpacing: '-0.01em', margin: '0 0 16px', color: theme.text }}>{featuredPost.title}</h2>
                        {featuredPost.summary && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', lineHeight: 1.7, color: theme.textMid, margin: 0 }}>{featuredPost.summary}</p>}
                      </div>
                      <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textLow }}>{featuredPost.author_name || 'Član'} · ♥ {featuredPost.likes_count || 0}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.08em', color: '#E8501A', textTransform: 'uppercase' }}>Preberi →</span>
                      </div>
                    </div>
                    <div style={{ minHeight: '360px', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={featuredPost.featured_image || 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80'}
                        alt="" loading="lazy" decoding="async"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(20,20,20,0.3), transparent)' }} />
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Grid */}
            <div data-reveal="grid" style={{ ...rev('grid'), display: 'grid', gridTemplateColumns: 'var(--col-3)', gap: '20px' }}>
              {otherPosts.map((post, i) => (
                <Link key={post.id} to={`/post/${post.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.3s, transform 0.3s, background 0.4s', transitionDelay: `${Math.min(i * 0.06, 0.6)}s`, height: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,80,26,0.35)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ height: '180px', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={post.featured_image ? thumbUrl(post.featured_image) : 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70'}
                        onError={(e) => thumbFallback(e, post.featured_image)}
                        alt="" loading="lazy" decoding="async"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(8px)', color: '#E8501A', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '3px' }}>{CAT_LABEL[post.category] || post.category || 'Objava'}</span>
                    </div>
                    <div style={{ padding: '24px' }}>
                      <div style={{ color: theme.textLow, fontFamily: "'Inter', sans-serif", fontSize: '12px', marginBottom: '10px' }}>{formatDate(post.created_date)}</div>
                      <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '22px', lineHeight: 1.15, color: theme.text, margin: '0 0 10px' }}>{post.title}</h3>
                      {post.summary && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', lineHeight: 1.6, color: theme.textMid, margin: '0 0 20px' }}>{post.summary}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: theme.textLow }}>{post.author_name || 'Član'} · ♥ {post.likes_count || 0}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: '#E8501A', textTransform: 'uppercase' }}>Preberi →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '48px' }}>
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  style={{ background: 'transparent', color: theme.text, border: `1.5px solid ${theme.border}`, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 40px', borderRadius: '4px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8501A'; e.currentTarget.style.color = '#E8501A'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.text; }}
                >Pokaži več ({filtered.length - 1 - otherPosts.length})</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* School CTA */}
      <div data-reveal="school-cta" style={{ ...rev('school-cta'), maxWidth: '1052px', margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ background: theme.isDark ? 'linear-gradient(135deg, #1a0a05 0%, #2a1008 50%, #1a0a05 100%)' : 'linear-gradient(135deg, #fff3ee 0%, #ffe8df 50%, #fff3ee 100%)', border: '1px solid rgba(232,80,26,0.25)', borderRadius: '12px', padding: '64px var(--page-x)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden', transition: 'background 0.4s' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(232,80,26,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '12px' }}>Program 2026</div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 6vw, 48px)', lineHeight: 1, margin: '0 0 12px', color: theme.text }}>Alpinistična šola</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', color: theme.textMid, maxWidth: '420px', lineHeight: 1.6, margin: 0 }}>Celovit program za vse, ki želijo varno in odgovorno stopiti v svet alpinizma.</p>
          </div>
          <button
            onClick={() => navigate('/alpine-school')}
            style={{ background: '#E8501A', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '16px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '18px 40px', borderRadius: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#c73d10'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#E8501A'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >Več o šoli →</button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scrollPulse { 0%,100%{opacity:0.4;} 50%{opacity:0.8;} }
        /* Grid columns are handled by the global --col-* tokens; here we only
           shrink the featured post's image once it stacks under the text. */
        @media (max-width: 680px) {
          #posts-section [data-reveal="featured"] a > div > div:last-child { min-height: 200px !important; }
        }
      `}</style>
    </div>
  );
}
