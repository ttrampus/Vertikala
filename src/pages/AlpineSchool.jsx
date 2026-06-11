import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeCtx } from "@/lib/ThemeContext";
import StatsSection from "@/components/StatsSection";

const modules = [
  { num: '01', title: 'Osnove alpinizma', desc: 'Oprema in priprava, zgodovina alpinizma, orientacija.', weeks: '2 tedna' },
  { num: '02', title: 'Skalno plezanje', desc: 'Tehnika plezanja, postavljanje varovalnih točk, vodenje smeri.', weeks: '3 tedne' },
  { num: '03', title: 'Ledeno plezanje', desc: 'Tehnika s cepin in dereze, varovanje na ledu in snegu.', weeks: '2 tedna' },
  { num: '04', title: 'Visokogorje', desc: 'Bivouac tehnika, navigacija, reševanje v slabi vidljivosti.', weeks: '2 tedna' },
  { num: '05', title: 'Praktični vzponi', desc: 'Skupinski vzponi pod mentorstvom izkušenih alpinistov.', weeks: '3 tedne' },
];

const instructors = [
  { name: 'Gregor Trampuš', role: 'Glavni inštruktor', initials: 'GT' },
  { name: 'Ana Kovač', role: 'Inštruktorica plezanja', initials: 'AK' },
  { name: 'Marko Štefan', role: 'Zimska tehnika', initials: 'MŠ' },
];

export default function AlpineSchool() {
  const theme = useContext(ThemeCtx);
  const navigate = useNavigate();
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.reveal]: true })); });
    }, { threshold: 0.08 });
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
      <div style={{ position: 'relative', height: '75vh', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center 35%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(10,10,10,0.98) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 var(--page-x) 72px', maxWidth: '1100px', width: '100%' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '16px', opacity: 0, animation: 'fadeUp 0.8s 0.3s forwards' }}>Program 2026</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(56px,8vw,100px)', lineHeight: 0.95, letterSpacing: '-0.01em', margin: '0 0 20px', color: '#fff', opacity: 0, animation: 'fadeUp 0.8s 0.5s forwards' }}>
            Alpinistična<br /><span style={{ color: '#E8501A' }}>šola</span>
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '18px', color: 'rgba(255,255,255,0.6)', maxWidth: '500px', lineHeight: 1.6, margin: '0 0 36px', opacity: 0, animation: 'fadeUp 0.8s 0.7s forwards' }}>
            Celovit program za vse, ki želijo varno in odgovorno stopiti v svet alpinizma.
          </p>
          <a
            href="mailto:gregor.trampus@siol.net"
            style={{ display: 'inline-block', background: '#E8501A', color: '#fff', textDecoration: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 32px', borderRadius: '4px', opacity: 0, animation: 'fadeUp 0.8s 0.9s forwards', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#c73d10'}
            onMouseLeave={e => e.currentTarget.style.background = '#E8501A'}
          >Prijavi se →</a>
        </div>
      </div>

      {/* Stats */}
      <StatsSection
        theme={theme}
        items={[
          { val: 6, label: 'Modulov' },
          { val: 'Mar', label: 'Pričetek' },
          { val: '∞', label: 'Pustolovščin' },
          { val: 'PZS', label: 'Akreditacija' },
        ]}
      />

      {/* Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px var(--page-x)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-side-r)', gap: '64px', alignItems: 'start' }}>
          <div>
            {/* About */}
            <div data-reveal="school-about" style={{ ...rev('school-about'), marginBottom: '64px' }}>
              <div style={{ width: '40px', height: '3px', background: '#E8501A', borderRadius: '2px', marginBottom: '28px' }} />
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 5vw, 40px)', margin: '0 0 20px', lineHeight: 1 }}>O šoli</h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: 1.8, color: theme.textMid, marginBottom: '16px' }}>
                V mesecu marcu pričenjamo z novo sezono alpinistične šole! Na uvodnem sestanku boste dobili vse informacije o poteku šole, načrtu dela in spoznali inštruktorje.
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: 1.8, color: theme.textMid }}>
                Prihodnja alpinistična šola bo omogočala tudi program <strong style={{ color: theme.text }}>"Skalni plezalci"</strong>, ki je pod okriljem Komisije za alpinizem PZS.
              </p>
            </div>

            {/* Meeting */}
            <div data-reveal="school-meeting" style={{ ...rev('school-meeting', 0.1), marginBottom: '64px' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '32px', margin: '0 0 20px' }}>Uvodni sestanek</h2>
              <div style={{ background: theme.bgCard, border: '1px solid rgba(232,80,26,0.2)', borderRadius: '8px', padding: '28px 32px', display: 'flex', gap: '20px', alignItems: 'flex-start', transition: 'background 0.4s' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: 'rgba(232,80,26,0.15)', border: '1px solid rgba(232,80,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8501A" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: theme.text }}>Četrtek, 06.03.2025</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: theme.textMid, lineHeight: 1.6 }}>Klubski prostori v Tačnu<br />Pločnarska 8, 1000 Ljubljana<br />Število udeležencev bo omejeno.</div>
                </div>
              </div>
            </div>

            {/* Modules */}
            <div data-reveal="modules-header" style={{ ...rev('modules-header'), marginBottom: '24px' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '32px', margin: 0 }}>Program šole</h2>
            </div>
            <div data-reveal="modules" style={{ ...rev('modules'), display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {modules.map((m, i) => (
                <div
                  key={i}
                  style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '24px 28px', display: 'grid', gridTemplateColumns: 'var(--col-time-s)', gap: '20px', alignItems: 'center', transition: 'border-color 0.3s, transform 0.2s, background 0.4s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,80,26,0.3)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '28px', color: '#E8501A', lineHeight: 1 }}>{m.num}</div>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '18px', marginBottom: '4px', color: theme.text }}>{m.title}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textMid, lineHeight: 1.5 }}>{m.desc}</div>
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.textLow, whiteSpace: 'nowrap' }}>{m.weeks}</div>
                </div>
              ))}
            </div>

            {/* Instructors */}
            <div data-reveal="instructors-header" style={{ ...rev('instructors-header'), marginTop: '64px', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '32px', margin: 0 }}>Inštruktorji</h2>
            </div>
            <div data-reveal="instructors" style={{ ...rev('instructors'), display: 'grid', gridTemplateColumns: 'var(--col-3)', gap: '12px' }}>
              {instructors.map((inst) => (
                <div key={inst.name} style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.4s' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(232,80,26,0.12)', border: '1.5px solid rgba(232,80,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: '#E8501A', flexShrink: 0 }}>{inst.initials}</div>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '16px', color: theme.text }}>{inst.name}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: theme.textLow }}>{inst.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div data-reveal="sidebar" style={{ ...rev('sidebar', 0.2), position: 'var(--sticky-side)', top: '100px' }}>
            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '32px', marginBottom: '16px', transition: 'background 0.4s' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '18px', marginBottom: '20px', color: theme.text }}>Kontakt</div>
              {[
                { icon: '✉', text: 'gregor.trampus@siol.net' },
                { icon: '📞', text: '041 377 159' },
                { icon: '📍', text: 'Pločnarska 8, Tačen, Ljubljana' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 2 ? '14px' : 0 }}>
                  <span style={{ fontSize: '14px', marginTop: '1px', opacity: 0.6 }}>{c.icon}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textMid, lineHeight: 1.5 }}>{c.text}</span>
                </div>
              ))}
            </div>
            <div style={{ background: theme.bgCard, border: '1px solid rgba(232,80,26,0.2)', borderRadius: '10px', padding: '24px 28px', marginBottom: '16px', transition: 'background 0.4s' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '10px' }}>Akreditacija</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textMid, lineHeight: 1.6, margin: 0 }}>Program "Skalni plezalci" pod okriljem Komisije za alpinizem PZS.</p>
            </div>
            <div style={{ background: 'rgba(232,80,26,0.08)', border: '1px solid rgba(232,80,26,0.25)', borderRadius: '10px', padding: '24px 28px' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '10px' }}>⚠ Omejeno število mest</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textMid, lineHeight: 1.6, margin: 0 }}>Prijavite se čim prej — število udeležencev je omejeno.</p>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
