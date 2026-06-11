import { useState, useEffect, useContext, Suspense } from "react";
import { Outlet, useLocation, useNavigate, useNavigationType } from "react-router-dom";
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

// We restore scroll ourselves (see the location.key effect below); the
// browser's native restoration would race with it on back/forward.
if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
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

  // Remember where the user was on each history entry, so Back returns there.
  // Track the position from scroll events only and persist it on cleanup:
  // reading window.scrollY at cleanup time is wrong under StrictMode (the
  // immediate dev remount would record 0 while the page is still a spinner)
  // — seeding from the stored value makes that write a no-op.
  useEffect(() => {
    const key = `scroll:${location.key}`;
    let last = parseInt(sessionStorage.getItem(key) || "0", 10) || 0;
    const onScroll = () => { last = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      sessionStorage.setItem(key, String(last));
    };
  }, [location.key]);

  useEffect(() => {
    setMenuOpen(false);

    // Forward navigation (clicking a link) starts at the top; back/forward
    // (POP) restores the saved position once the page has grown tall enough
    // for it — list pages render a spinner first, then their content.
    const saved = navigationType === "POP"
      ? parseInt(sessionStorage.getItem(`scroll:${location.key}`) || "0", 10)
      : 0;
    if (!saved) { window.scrollTo(0, 0); return; }

    let raf;
    const deadline = Date.now() + 3000;
    const attempt = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= saved || Date.now() > deadline) {
        window.scrollTo(0, saved);
      } else {
        raf = requestAnimationFrame(attempt);
      }
    };
    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [location.key]);

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
    padding: '0 clamp(20px, 5vw, 40px)',
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
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/')}
        >
          <img
            src="/logo.png"
            alt="AK Vertikala"
            style={{
              height: '38px',
              width: 'auto',
              display: 'block',
              filter: (isTransparent || theme.isDark) ? 'brightness(0) invert(1)' : 'none',
              transition: 'filter 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
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
                >Moje objave</button>
                <button
                  onClick={() => navigate('/profile')}
                  style={navBtnStyle(isActive('/profile'))}
                  onMouseEnter={e => { if (!isActive('/profile')) e.currentTarget.style.color = linkHover(); }}
                  onMouseLeave={e => { if (!isActive('/profile')) e.currentTarget.style.color = linkColor(false); }}
                >Profil</button>
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
            padding: '24px clamp(20px, 5vw, 40px) 32px',
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
              <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive('/profile') ? '#E8501A' : theme.text }}>Profil</button>
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
            <Suspense fallback={
              <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin" style={{ width: '32px', height: '32px', border: `3px solid ${theme.border}`, borderTopColor: '#E8501A', borderRadius: '50%' }} />
              </div>
            }>
              <Outlet />
            </Suspense>
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
