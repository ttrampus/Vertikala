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
      padding: '64px var(--page-x) 48px',
      transition: 'background 0.4s',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-footer)', gap: '48px', alignItems: 'start', marginBottom: '48px' }}>
          <div>
            <div style={{ marginBottom: '16px', cursor: 'pointer', display: 'inline-block' }} onClick={() => navigate('/')}>
              <img
                src="/logo.png"
                alt="AK Vertikala"
                style={{
                  height: '32px',
                  width: 'auto',
                  display: 'block',
                  filter: theme.isDark ? 'brightness(0) invert(1)' : 'none',
                  opacity: theme.isDark ? 0.85 : 0.75,
                  transition: 'filter 0.4s, opacity 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = theme.isDark ? '0.85' : '0.75'; }}
              />
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: theme.textLow, maxWidth: '320px', lineHeight: 1.6 }}>
              Alpinistični klub — skupnost strastnih alpinistov, plezalcev in ljubiteljev gora.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '20px 32px', flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
