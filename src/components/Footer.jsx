import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeCtx } from "@/lib/ThemeContext";

export default function Footer() {
  const theme = useContext(ThemeCtx);
  const navigate = useNavigate();

  const links = [
    { path: '/', label: 'Domov' },
    { path: '/about', label: 'O nas' },
    { path: '/events', label: 'Dogodki' },
    { path: '/alpine-school', label: 'Šola' },
    { path: '/contact', label: 'Kontakt' },
  ];

  return (
    <footer style={{
      background: theme.isDark ? '#0a0a0a' : '#f0ede8',
      borderTop: `1px solid ${theme.border}`,
      padding: '64px 72px 48px',
      transition: 'background 0.4s',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '48px', alignItems: 'start', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: 'pointer' }} onClick={() => navigate('/')}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <polygon points="16,4 30,28 2,28" fill="none" stroke="#E8501A" strokeWidth="2.5" strokeLinejoin="round"/>
                <polygon points="16,11 23,28 9,28" fill="#E8501A" opacity="0.5"/>
              </svg>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '18px', letterSpacing: '0.04em', color: theme.text }}>
                AK <span style={{ color: '#E8501A' }}>VERTIKALA</span>
              </span>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: theme.textLow, maxWidth: '320px', lineHeight: 1.6 }}>
              Alpinistični klub — skupnost strastnih alpinistov, plezalcev in ljubiteljev gora.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            {links.map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: theme.textLow, transition: 'color 0.2s',
              }}
              onMouseEnter={e => { e.target.style.color = theme.text; }}
              onMouseLeave={e => { e.target.style.color = theme.textLow; }}
              >{l.label}</button>
            ))}
          </div>
        </div>
        <div style={{ height: '1px', background: theme.border, marginBottom: '24px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: theme.textFaint }}>
            © {new Date().getFullYear()} AK Vertikala · Vse pravice pridržane.
          </span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: theme.textFaint }}>
            PZS · Slovenija
          </span>
        </div>
      </div>
    </footer>
  );
}
