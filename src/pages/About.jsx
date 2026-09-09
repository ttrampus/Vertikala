import { useState, useEffect, useContext } from "react";
import { ThemeCtx } from "@/lib/ThemeContext";
import HeroBg from "@/components/HeroBg";
import { useAuth } from "@/lib/AuthContext";
import { Pencil } from "lucide-react";
import AboutEditForm from "@/components/AboutEditForm";
import { DEFAULT_ABOUT } from "@/lib/aboutContent";
import { usePageContent } from "@/lib/pageContent";

// Corner radii for the 2x2 stat block: first/last in each row get the outer
// corner. Computed rather than hard-coded per index so the block still looks
// right if someone adds or removes a stat.
const statRadius = (i, n) => {
  const cols = 2;
  const lastRow = i >= n - ((n % cols) || cols);
  const first = i % cols === 0, last = i % cols === cols - 1;
  return [i < cols && first ? "8px" : "0", i < cols && last ? "8px" : "0",
          lastRow && last ? "8px" : "0", lastRow && first ? "8px" : "0"].join(" ");
};

export default function About() {
  const theme = useContext(ThemeCtx);
  const { isAdmin } = useAuth();
  const [visible, setVisible] = useState({});
  const { content, editing, setEditing, saving, error, setError, save } =
    usePageContent("about", DEFAULT_ABOUT);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.reveal]: true })); });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const rev = (key, delay = 0) => ({
    opacity: visible[key] ? 1 : 0,
    transform: visible[key] ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.7s ${delay}s cubic-bezier(0.16,1,0.3,1), transform 0.7s ${delay}s cubic-bezier(0.16,1,0.3,1)`,
  });

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', color: theme.text, transition: 'background 0.4s, color 0.4s' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: '70vh', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <HeroBg src={content.hero.image || DEFAULT_ABOUT.hero.image} position="center 40%" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(10,10,10,0.95) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 var(--page-x) 72px', maxWidth: '1100px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '16px', opacity: 0, animation: 'fadeUp 0.8s 0.3s forwards' }}>{content.hero.eyebrow}</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(56px, 8vw, 96px)', lineHeight: 0.95, letterSpacing: '-0.01em', margin: '0 0 16px', color: '#fff', opacity: 0, animation: 'fadeUp 0.8s 0.5s forwards' }}>{content.hero.title}</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '18px', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', opacity: 0, animation: 'fadeUp 0.8s 0.7s forwards' }}>{content.hero.subtitle}</p>
        </div>
      </div>

      {/* Mission */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '96px var(--page-x)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-2)', gap: '80px', alignItems: 'start' }}>
          <div data-reveal="mission" style={{ ...rev('mission') }}>
            <div style={{ width: '40px', height: '3px', background: '#E8501A', marginBottom: '32px', borderRadius: '2px' }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 6vw, 48px)', lineHeight: 1, margin: '0 0 28px', letterSpacing: '-0.01em' }}>{content.history.title}</h2>
            {content.history.paragraphs.filter((p) => p.text).map((p, i, arr) => (
              <p key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: 1.8, color: theme.textMid, marginBottom: i < arr.length - 1 ? '20px' : 0 }}>{p.text}</p>
            ))}
          </div>
          <div data-reveal="mission-stats" style={{ ...rev('mission-stats', 0.15) }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-2)', gap: '2px' }}>
              {content.stats.map((s, i) => (
                <div key={i} style={{ background: theme.bgCard, padding: '36px 32px', borderRadius: statRadius(i, content.stats.length), transition: 'background 0.4s' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 5.5vw, 44px)', color: '#E8501A', lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', color: theme.textLow, marginTop: '8px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto 80px', padding: '0 var(--page-x)' }}>
        <div style={{ height: '1px', background: theme.border }} />
      </div>

      {/* Activities */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 var(--page-x) 96px' }}>
        <div data-reveal="activities-header" style={{ ...rev('activities-header'), marginBottom: '48px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '12px' }}>{content.activities.eyebrow}</div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 6vw, 48px)', lineHeight: 1, margin: 0 }}>{content.activities.title}</h2>
        </div>
        <div data-reveal="activities" style={{ ...rev('activities'), display: 'grid', gridTemplateColumns: 'var(--col-4)', gap: '16px' }}>
          {content.activities.items.map((a, i) => (
            <div
              key={i}
              style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '36px 28px', transition: 'border-color 0.3s, transform 0.3s, background 0.4s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,80,26,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '36px', height: '3px', background: '#E8501A', borderRadius: '2px', marginBottom: '24px' }} />
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '22px', margin: '0 0 12px', color: theme.text }}>{a.title}</h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', lineHeight: 1.7, color: theme.textMid, margin: 0 }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div style={{ background: theme.bgAlt, borderTop: `1px solid ${theme.border}`, padding: '96px 0', transition: 'background 0.4s' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 var(--page-x)' }}>
          <div data-reveal="team-header" style={{ ...rev('team-header'), marginBottom: '48px' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '12px' }}>{content.team.eyebrow}</div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 6vw, 48px)', lineHeight: 1, margin: 0 }}>{content.team.title}</h2>
          </div>
          <div data-reveal="team" style={{ ...rev('team'), display: 'grid', gridTemplateColumns: 'var(--col-4)', gap: '16px' }}>
            {content.team.items.map((m, i) => (
              <div
                key={i}
                style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden', transition: 'border-color 0.3s, transform 0.3s, background 0.4s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,80,26,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ height: '160px', background: theme.isDark ? `linear-gradient(135deg, #1a1a1a, #${['2a1008','081a2a','0a1a08','1a1a08'][i % 4]})` : 'linear-gradient(135deg, #f0ede8, #e8ddd5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(232,80,26,0.15)', border: '2px solid rgba(232,80,26,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '28px', color: '#E8501A' }}>{m.name.charAt(0)}</div>
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '20px', marginBottom: '4px', color: theme.text }}>{m.name}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '12px' }}>{m.role}</div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', lineHeight: 1.6, color: theme.textMid, margin: 0 }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {isAdmin && !editing && (
        <button
          onClick={() => setEditing(true)}
          style={{
            position: 'fixed', right: '20px', bottom: '20px', zIndex: 90,
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#E8501A', color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px',
            letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 20px',
            borderRadius: '999px', boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
          }}
        ><Pencil className="h-4 w-4" /> Uredi stran</button>
      )}

      {editing && (
        <AboutEditForm
          initial={content}
          theme={theme}
          saving={saving}
          error={error}
          onSave={save}
          onClose={() => { setEditing(false); setError(''); }}
        />
      )}

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
