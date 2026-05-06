import { useState, useEffect, useContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { ThemeCtx } from "@/lib/ThemeContext";
import Footer from "./Footer";

const SunIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const theme = useContext(ThemeCtx);
  const { darkMode, toggleDark } = theme;

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Pages with a full-bleed dark hero image at the top
  const heroPages = ['/', '/about', '/events', '/alpine-school', '/contact', '/vzponi'];
  const hasHero = heroPages.includes(location.pathname);
  const isTransparent = hasHero && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navLinks = [
    { path: '/', label: 'Domov' },
    { path: '/about', label: 'O nas' },
    { path: '/events', label: 'Dogodki' },
    { path: '/vzponi', label: 'Vzponi' },
    { path: '/alpine-school', label: 'Šola' },
    { path: '/contact', label: 'Kontakt' },
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Colors adapt: transparent nav (hero only) = white text; solid nav = theme text
  const linkColor = (active) => {
    if (active) return '#E8501A';
    if (isTransparent) return 'rgba(255,255,255,0.82)';
    return theme.isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)';
  };
  const linkHover = () => (isTransparent || theme.isDark) ? '#fff' : '#111';
  const iconColor = isTransparent ? '#fff' : theme.text;

  const navStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 40px',
    height: isTransparent ? '80px' : '64px',
    background: isTransparent ? 'transparent' : theme.navBg,
    backdropFilter: isTransparent ? 'none' : 'blur(16px)',
    borderBottom: isTransparent ? 'none' : `1px solid ${theme.border}`,
    transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
  };

  const navBtnStyle = (active) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
    fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase',
    color: linkColor(active), transition: 'color 0.2s',
    padding: '4px 0',
    borderBottom: active ? '2px solid #E8501A' : '2px solid transparent',
  });

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', transition: 'background 0.4s' }}>
      {/* ── NAV ── */}
      <nav style={navStyle}>

        {/* LEFT: Logo */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/')}
        >
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <polygon points="16,4 30,28 2,28" fill="none" stroke="#E8501A" strokeWidth="2.5" strokeLinejoin="round"/>
            <polygon points="16,11 23,28 9,28" fill="#E8501A" opacity="0.5"/>
          </svg>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '19px', letterSpacing: '0.05em', color: isTransparent ? '#fff' : theme.text }}>
            AK <span style={{ color: '#E8501A' }}>VERTIKALA</span>
          </span>
        </div>

        {/* CENTER / RIGHT: desktop links + controls */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>

          {/* Page nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            {navLinks.map(l => (
              <button
                key={l.path}
                onClick={() => navigate(l.path)}
                style={navBtnStyle(isActive(l.path))}
                onMouseEnter={e => { if (!isActive(l.path)) e.currentTarget.style.color = linkHover(); }}
                onMouseLeave={e => { if (!isActive(l.path)) e.currentTarget.style.color = linkColor(false); }}
              >{l.label}</button>
            ))}
          </div>

          {/* Thin divider */}
          <div style={{ width: '1px', height: '20px', background: isTransparent ? 'rgba(255,255,255,0.2)' : theme.border, flexShrink: 0 }} />

          {/* Right controls: auth nav links + dark toggle + login/logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {user && (
              <>
                <button
                  onClick={() => navigate('/create')}
                  style={navBtnStyle(isActive('/create'))}
                  onMouseEnter={e => { if (!isActive('/create')) e.currentTarget.style.color = linkHover(); }}
                  onMouseLeave={e => { if (!isActive('/create')) e.currentTarget.style.color = linkColor(false); }}
                >Nova objava</button>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={navBtnStyle(isActive('/dashboard'))}
                  onMouseEnter={e => { if (!isActive('/dashboard')) e.currentTarget.style.color = linkHover(); }}
                  onMouseLeave={e => { if (!isActive('/dashboard')) e.currentTarget.style.color = linkColor(false); }}
                >Objave</button>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    style={navBtnStyle(isActive('/admin'))}
                    onMouseEnter={e => { if (!isActive('/admin')) e.currentTarget.style.color = linkHover(); }}
                    onMouseLeave={e => { if (!isActive('/admin')) e.currentTarget.style.color = linkColor(false); }}
                  >Admin</button>
                )}
              </>
            )}

            {/* Dark / light toggle — always on far right before CTA */}
            <button
              onClick={toggleDark}
              title={darkMode ? 'Svetli način' : 'Temni način'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: iconColor, transition: 'color 0.2s, background 0.2s',
                opacity: 0.75,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(128,128,128,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.background = 'none'; }}
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* CTA */}
            {user ? (
              <button
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: '1.5px solid rgba(232,80,26,0.55)',
                  cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: '#E8501A', padding: '8px 18px', borderRadius: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,80,26,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >Odjava</button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: '#E8501A', border: 'none', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: '#fff', padding: '9px 20px', borderRadius: '4px',
                  transition: 'background 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#c73d10'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#E8501A'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >Prijava</button>
            )}
          </div>
        </div>

        {/* MOBILE hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="nav-hamburger"
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', flexDirection: 'column', gap: '5px', padding: '4px' }}
        >
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              display: 'block', width: '24px', height: '2px',
              background: isTransparent ? '#fff' : theme.text,
              borderRadius: '2px', transition: 'all 0.3s',
              transform: menuOpen
                ? (i === 0 ? 'rotate(45deg) translate(5px,5px)' : i === 2 ? 'rotate(-45deg) translate(5px,-5px)' : 'scaleX(0)')
                : 'none',
            }} />
          ))}
        </button>

        {/* MOBILE menu */}
        {menuOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: theme.isDark ? 'rgba(10,10,10,0.97)' : 'rgba(245,244,240,0.97)',
            backdropFilter: 'blur(16px)',
            padding: '24px 40px 32px',
            display: 'flex', flexDirection: 'column', gap: '18px',
            borderBottom: `1px solid ${theme.border}`,
          }}>
            {navLinks.map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} style={{
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: '18px', letterSpacing: '0.1em', textTransform: 'uppercase',
                color: isActive(l.path) ? '#E8501A' : theme.text,
              }}>{l.label}</button>
            ))}
            {user && <>
              <button onClick={() => navigate('/create')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive('/create') ? '#E8501A' : theme.text }}>Nova objava</button>
              <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive('/dashboard') ? '#E8501A' : theme.text }}>Moje objave</button>
              {isAdmin && <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive('/admin') ? '#E8501A' : theme.text }}>Admin</button>}
            </>}
            <div style={{ height: '1px', background: theme.border }} />
            <button onClick={toggleDark} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '16px', letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.textLow, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: iconColor }}>{darkMode ? <SunIcon /> : <MoonIcon />}</span>
              {darkMode ? 'Svetli način' : 'Temni način'}
            </button>
            {user
              ? <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#E8501A' }}>Odjava</button>
              : <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#E8501A' }}>Prijava</button>
            }
          </div>
        )}
      </nav>

      {/* MAIN */}
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <Footer />
      </main>

      <style>{`
        @media (max-width: 900px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
