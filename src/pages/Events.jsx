import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ThemeCtx } from "@/lib/ThemeContext";
import { format, isAfter, subDays } from "date-fns";
import StatsSection from "@/components/StatsSection";

export default function Events() {
  const theme = useContext(ThemeCtx);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState({});

  useEffect(() => {
    let alive = true;
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("BlogPost")
        // List columns only — full `content` HTML isn't used by the cards
        .select("id, title, summary, featured_image, author_name, created_by, category, tags, created_date, likes_count")
        .eq("status", "published")
        .eq("category", "events")
        .order("created_date", { ascending: false });
      if (!alive) return;
      if (!error) setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.reveal]: true })); });
    }, { threshold: 0.08 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  const rev = (key, delay = 0) => ({
    opacity: visible[key] ? 1 : 0,
    transform: visible[key] ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.7s ${delay}s cubic-bezier(0.16,1,0.3,1), transform 0.7s ${delay}s cubic-bezier(0.16,1,0.3,1)`,
  });

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    return !search || e.title?.toLowerCase().includes(q) || e.summary?.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q));
  });

  const upcoming = filtered[0];
  const rest = filtered.slice(1);

  const formatDate = (d) => {
    try { return format(new Date(d), 'd. MMM yyyy'); } catch { return ''; }
  };

  const thisMonth = events.filter(e => isAfter(new Date(e.created_date), subDays(new Date(), 30))).length;
  const organizers = new Set(events.map(e => e.author_name || e.created_by)).size;

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', color: theme.text, transition: 'background 0.4s, color 0.4s' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: '55vh', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center 50%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(10,10,10,0.97) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 var(--page-x) 64px', maxWidth: '1100px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '16px', opacity: 0, animation: 'fadeUp 0.8s 0.3s forwards' }}>Koledar</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(56px,8vw,96px)', lineHeight: 0.95, margin: '0 0 16px', color: '#fff', opacity: 0, animation: 'fadeUp 0.8s 0.5s forwards' }}>
            Dogodki &amp;<br /><span style={{ color: '#E8501A' }}>Prireditve</span>
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '17px', color: 'rgba(255,255,255,0.55)', opacity: 0, animation: 'fadeUp 0.8s 0.7s forwards' }}>Vse kar se dogaja v klubu — ture, predavanja, srečanja in več.</p>
        </div>
      </div>

      {/* Stats */}
      <StatsSection
        theme={theme}
        items={[
          { val: filtered.length, label: 'Dogodki' },
          { val: thisMonth, label: 'Ta mesec' },
          { val: organizers, label: 'Organizatorji' },
        ]}
      />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px var(--page-x) 96px' }}>
        {/* Search */}
        <div data-reveal="search" style={{ ...rev('search'), marginBottom: '48px' }}>
          <div style={{ position: 'relative', maxWidth: '360px' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Išči dogodke..."
              style={{ width: '100%', boxSizing: 'border-box', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '11px 14px 11px 40px', color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: '14px', outline: 'none', transition: 'border-color 0.2s, background 0.4s' }}
              onFocus={e => e.target.style.borderColor = 'rgba(232,80,26,0.5)'}
              onBlur={e => e.target.style.borderColor = theme.border}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: theme.textLow, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', letterSpacing: '0.1em' }}>NALAGANJE...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(44px, 10vw, 80px)', color: theme.border }}>—</div>
            <p style={{ fontFamily: "'Inter', sans-serif", color: theme.textLow }}>Ni najdenih dogodkov.</p>
          </div>
        ) : (
          <>
            {/* Featured / upcoming */}
            {upcoming && !search && (
              <div data-reveal="featured-event" style={{ ...rev('featured-event'), marginBottom: '48px' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.textFaint, marginBottom: '16px' }}>— Naslednji dogodek</div>
                <Link to={`/post/${upcoming.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'var(--col-2)', background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.3s, background 0.4s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,80,26,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                  >
                    <div style={{ padding: '48px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
                        <span style={{ background: '#E8501A', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '3px' }}>Dogodek</span>
                        <span style={{ color: theme.textLow, fontFamily: "'Inter', sans-serif", fontSize: '13px' }}>{formatDate(upcoming.created_date)}</span>
                      </div>
                      <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '38px', lineHeight: 1.05, margin: '0 0 16px', color: theme.text }}>{upcoming.title}</h2>
                      {upcoming.summary && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', lineHeight: 1.7, color: theme.textMid, margin: '0 0 28px' }}>{upcoming.summary}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textLow }}>{upcoming.author_name || 'Klub'} · ♥ {upcoming.likes_count || 0}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: '#E8501A', textTransform: 'uppercase' }}>Preberi →</span>
                      </div>
                    </div>
                    <div style={{
                      backgroundImage: upcoming.featured_image ? `url('${upcoming.featured_image}')` : "url('https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80')",
                      backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '300px', position: 'relative',
                    }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(20,20,20,0.4), transparent)' }} />
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Rest */}
            {(search ? filtered : rest).length > 0 && (
              <>
                <div data-reveal="events-header" style={{ ...rev('events-header'), marginBottom: '24px' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.textFaint }}>— Vsi dogodki</div>
                </div>
                <div data-reveal="events-list" style={{ ...rev('events-list'), display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(search ? filtered : rest).map((ev, i) => (
                    <Link key={ev.id} to={`/post/${ev.id}`} style={{ textDecoration: 'none' }}>
                      <div
                        style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '28px 32px', display: 'grid', gridTemplateColumns: 'var(--col-time-e)', gap: '24px', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.3s, transform 0.2s, background 0.4s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,80,26,0.35)'; e.currentTarget.style.transform = 'translateX(6px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateX(0)'; }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '32px', color: '#E8501A', lineHeight: 1 }}>{String(i + (search ? 1 : 2)).padStart(2, '0')}</div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', color: theme.textLow, marginTop: '2px' }}>{formatDate(ev.created_date)}</div>
                        </div>
                        <div>
                          <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '22px', margin: '0 0 6px', color: theme.text }}>{ev.title}</h3>
                          {ev.summary && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textMid, margin: 0, lineHeight: 1.5 }}>{ev.summary}</p>}
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: theme.textLow, marginTop: '4px', display: 'block' }}>{ev.author_name || 'Klub'}</span>
                        </div>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: '#E8501A', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Preberi →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
