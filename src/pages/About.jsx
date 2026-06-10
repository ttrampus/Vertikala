import { useState, useEffect, useContext } from "react";
import { ThemeCtx } from "@/lib/ThemeContext";

const activities = [
  { title: 'Plezanje', desc: 'Skalno in ledeno plezanje za vse ravni — od začetnikov do ekspertov.' },
  { title: 'Alpinizem', desc: 'Organizirani vzponi v Alpah, Karakorumu in drugod po svetu.' },
  { title: 'Šola', desc: 'Strukturiran program alpinistične šole z izkušenimi mentorji.' },
  { title: 'Skupnost', desc: 'Redna srečanja, predavanja in socialni dogodki za člane kluba.' },
];

const team = [
  { name: 'Gregor T.', role: 'Predsednik', desc: 'Izkušen alpinist z 20+ leti izkušenj v visokogorju.' },
  { name: 'Ana K.', role: 'Vodja šole', desc: 'Certificirana gorska vodnica in inštruktorica plezanja.' },
  { name: 'Marko P.', role: 'Vodja odhodov', desc: 'Specialist za skalno in ledeno plezanje.' },
  { name: 'Tina V.', role: 'Urednica bloga', desc: 'Gorska pisateljica in fotografinja.' },
];

export default function About() {
  const theme = useContext(ThemeCtx);
  const [visible, setVisible] = useState({});

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
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(10,10,10,0.95) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 var(--page-x) 72px', maxWidth: '1100px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '16px', opacity: 0, animation: 'fadeUp 0.8s 0.3s forwards' }}>O klubu</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(56px, 8vw, 96px)', lineHeight: 0.95, letterSpacing: '-0.01em', margin: '0 0 16px', color: '#fff', opacity: 0, animation: 'fadeUp 0.8s 0.5s forwards' }}>O nas</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '18px', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', opacity: 0, animation: 'fadeUp 0.8s 0.7s forwards' }}>Zgodba za vrhovi, ki jih lovimo</p>
        </div>
      </div>

      {/* Mission */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '96px var(--page-x)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-2)', gap: '80px', alignItems: 'start' }}>
          <div data-reveal="mission" style={{ ...rev('mission') }}>
            <div style={{ width: '40px', height: '3px', background: '#E8501A', marginBottom: '32px', borderRadius: '2px' }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 6vw, 48px)', lineHeight: 1, margin: '0 0 28px', letterSpacing: '-0.01em' }}>Naše poslanstvo</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: 1.8, color: theme.textMid, marginBottom: '20px' }}>
              Alpinistični klub Vertikala je skupnost strastnih alpinistov, plezalcev in ljubiteljev gorske narave, ki jih združuje ljubezen do vertikalnega sveta.
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: 1.8, color: theme.textMid }}>
              Naše poslanstvo je ohraniti duha alpinizma, krepiti skupnostne vezi in deliti zgodbe, ki nastanejo v gorah. Vsak dosežen vrh postane del naše skupne dediščine.
            </p>
          </div>
          <div data-reveal="mission-stats" style={{ ...rev('mission-stats', 0.15) }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-2)', gap: '2px' }}>
              {[
                { val: '1992', label: 'Ustanovljen' },
                { val: '40+', label: 'Aktivnih članov' },
                { val: '100+', label: 'Vzponov' },
                { val: 'PZS', label: 'Akreditacija' },
              ].map((s, i) => (
                <div key={i} style={{ background: theme.bgCard, padding: '36px 32px', borderRadius: i===0?'8px 0 0 0':i===1?'0 8px 0 0':i===2?'0 0 0 8px':'0 0 8px 0', transition: 'background 0.4s' }}>
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
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '12px' }}>Kaj počnemo</div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 6vw, 48px)', lineHeight: 1, margin: 0 }}>Aktivnosti kluba</h2>
        </div>
        <div data-reveal="activities" style={{ ...rev('activities'), display: 'grid', gridTemplateColumns: 'var(--col-4)', gap: '16px' }}>
          {activities.map((a, i) => (
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
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '12px' }}>Naša ekipa</div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 6vw, 48px)', lineHeight: 1, margin: 0 }}>Vodstvo kluba</h2>
          </div>
          <div data-reveal="team" style={{ ...rev('team'), display: 'grid', gridTemplateColumns: 'var(--col-4)', gap: '16px' }}>
            {team.map((m, i) => (
              <div
                key={i}
                style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden', transition: 'border-color 0.3s, transform 0.3s, background 0.4s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,80,26,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ height: '160px', background: theme.isDark ? `linear-gradient(135deg, #1a1a1a, #${['2a1008','081a2a','0a1a08','1a1a08'][i]})` : 'linear-gradient(135deg, #f0ede8, #e8ddd5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
