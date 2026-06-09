import { useState, useEffect, useContext } from "react";
import { ThemeCtx } from "@/lib/ThemeContext";

export default function Contact() {
  const theme = useContext(ThemeCtx);
  const [visible, setVisible] = useState({});
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

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

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: theme.inputBg, border: `1px solid ${theme.border}`,
    borderRadius: '6px', padding: '14px 16px',
    color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: '14px',
    outline: 'none', transition: 'border-color 0.2s, background 0.4s',
  };

  const labelStyle = {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
    fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase',
    color: theme.textLow, display: 'block', marginBottom: '8px',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.message) return;
    setSending(true);
    // Simulate sending
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    setSent(true);
  };

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', color: theme.text, transition: 'background 0.4s, color 0.4s' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: '55vh', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(10,10,10,0.97) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 var(--page-x) 64px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '16px', opacity: 0, animation: 'fadeUp 0.8s 0.3s forwards' }}>Kontakt</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(56px,8vw,96px)', lineHeight: 0.95, margin: '0 0 16px', color: '#fff', opacity: 0, animation: 'fadeUp 0.8s 0.5s forwards' }}>Stopite v stik</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '17px', color: 'rgba(255,255,255,0.55)', opacity: 0, animation: 'fadeUp 0.8s 0.7s forwards' }}>Z veseljem odgovorimo na vsa vaša vprašanja.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px var(--page-x) 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-side-l)', gap: '80px', alignItems: 'start' }}>
          {/* Info */}
          <div data-reveal="contact-info" style={{ ...rev('contact-info') }}>
            <div style={{ width: '40px', height: '3px', background: '#E8501A', borderRadius: '2px', marginBottom: '32px' }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '36px', margin: '0 0 32px', lineHeight: 1 }}>Kontaktni podatki</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8501A" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                  label: 'E-pošta', val: 'gregor.trampus@siol.net',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8501A" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>,
                  label: 'Telefon', val: '041 377 159',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8501A" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                  label: 'Naslov', val: 'Pločnarska 8, Tačen\n1000 Ljubljana, Slovenija',
                },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(232,80,26,0.1)', border: '1px solid rgba(232,80,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: theme.textLow, marginBottom: '4px' }}>{c.label}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: theme.textMid, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{c.val}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '56px', padding: '32px', background: theme.bgCard, borderRadius: '10px', border: `1px solid ${theme.border}`, transition: 'background 0.4s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src="/logo.png" alt="AK Vertikala" style={{ height: '64px', width: 'auto', objectFit: 'contain', filter: theme.isDark ? 'brightness(0) invert(1)' : 'none', transition: 'filter 0.4s' }} />
            </div>
          </div>

          {/* Form */}
          <div data-reveal="contact-form" style={{ ...rev('contact-form', 0.15) }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '80px 40px', background: theme.bgCard, borderRadius: '12px', border: '1px solid rgba(232,80,26,0.2)', transition: 'background 0.4s' }}>
                <div style={{ fontSize: 'clamp(30px, 6vw, 48px)', marginBottom: '20px', color: '#E8501A' }}>✓</div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '36px', margin: '0 0 12px', color: '#E8501A' }}>Sporočilo poslano!</h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', color: theme.textMid, lineHeight: 1.6 }}>Hvala za vaše sporočilo. Odgovorili vam bomo v najkrajšem možnem času.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }} style={{ marginTop: '28px', background: 'none', border: `1px solid ${theme.border}`, color: theme.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer' }}>Novo sporočilo</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-2)', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>Ime *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vaše ime" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(232,80,26,0.5)'} onBlur={e => e.target.style.borderColor = theme.border} />
                  </div>
                  <div>
                    <label style={labelStyle}>E-pošta *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vaš@email.com" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(232,80,26,0.5)'} onBlur={e => e.target.style.borderColor = theme.border} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Zadeva</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="O čem gre?" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,80,26,0.5)'} onBlur={e => e.target.style.borderColor = theme.border} />
                </div>
                <div>
                  <label style={labelStyle}>Sporočilo *</label>
                  <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Vaše sporočilo..." rows={6}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '140px' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,80,26,0.5)'} onBlur={e => e.target.style.borderColor = theme.border} />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  style={{ background: sending ? '#7a2c0d' : '#E8501A', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px 36px', borderRadius: '6px', alignSelf: 'flex-start', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={e => { if (!sending) e.currentTarget.style.background = '#c73d10'; }}
                  onMouseLeave={e => { if (!sending) e.currentTarget.style.background = '#E8501A'; }}
                >
                  {sending ? (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Pošiljam...</>
                  ) : 'Pošlji sporočilo →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          #contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
