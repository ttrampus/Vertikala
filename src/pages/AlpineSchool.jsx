import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeCtx } from "@/lib/ThemeContext";
import StatsSection from "@/components/StatsSection";
import HeroBg from "@/components/HeroBg";
import { useAuth } from "@/lib/AuthContext";
import { Pencil } from "lucide-react";
import SchoolEditForm from "@/components/SchoolEditForm";
import { DEFAULT_SCHOOL, initialsFrom } from "@/lib/schoolContent";
import { usePageContent } from "@/lib/pageContent";
import { formatDate, toDate } from "@/lib/dates";
import { format } from "date-fns";
import { sl } from "date-fns/locale";

// Weekday comes from the date itself ("četrtek, 05/03/2026"), so the two can
// never disagree — the page used to carry a hand-typed "Četrtek, 06.03.2025".
function meetingWhen(iso) {
  const printed = formatDate(iso);
  if (!printed) return "";
  return `${format(toDate(iso), "EEEE", { locale: sl })}, ${printed}`;
}

export default function AlpineSchool() {
  const theme = useContext(ThemeCtx);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [visible, setVisible] = useState({});

  // Content lives in site_content; the defaults in code are what renders until
  // an admin saves an edit, and what we fall back to if the fetch fails.
  const { content, editing, setEditing, saving, error: saveError, setError, save } =
    usePageContent("alpine-school", DEFAULT_SCHOOL);

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
        <HeroBg src={content.hero.image || DEFAULT_SCHOOL.hero.image} position="center 35%" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(10,10,10,0.98) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 var(--page-x) 72px', maxWidth: '1100px', width: '100%' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '16px', opacity: 0, animation: 'fadeUp 0.8s 0.3s forwards' }}>{content.hero.eyebrow}</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(56px,8vw,100px)', lineHeight: 0.95, letterSpacing: '-0.01em', margin: '0 0 20px', color: '#fff', opacity: 0, animation: 'fadeUp 0.8s 0.5s forwards' }}>
            {content.hero.title}<br /><span style={{ color: '#E8501A' }}>{content.hero.titleAccent}</span>
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '18px', color: 'rgba(255,255,255,0.6)', maxWidth: '500px', lineHeight: 1.6, margin: '0 0 36px', opacity: 0, animation: 'fadeUp 0.8s 0.7s forwards' }}>
            {content.hero.subtitle}
          </p>
          <a
            href={`mailto:${content.hero.ctaEmail}`}
            style={{ display: 'inline-block', background: '#E8501A', color: '#fff', textDecoration: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 32px', borderRadius: '4px', opacity: 0, animation: 'fadeUp 0.8s 0.9s forwards', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#c73d10'}
            onMouseLeave={e => e.currentTarget.style.background = '#E8501A'}
          >{content.hero.ctaLabel}</a>
        </div>
      </div>

      {/* Stats */}
      <StatsSection
        theme={theme}
        items={content.stats.map((s) => ({
          // A count typed as "6" should still animate like a number.
          val: s.val !== '' && !Number.isNaN(Number(s.val)) ? Number(s.val) : s.val,
          label: s.label,
        }))}
      />

      {/* Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px var(--page-x)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--col-side-r)', gap: '64px', alignItems: 'start' }}>
          <div>
            {/* About */}
            <div data-reveal="school-about" style={{ ...rev('school-about'), marginBottom: '64px' }}>
              <div style={{ width: '40px', height: '3px', background: '#E8501A', borderRadius: '2px', marginBottom: '28px' }} />
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 5vw, 40px)', margin: '0 0 20px', lineHeight: 1 }}>{content.about.title}</h2>
              {content.about.paragraphs.filter(Boolean).map((p, i, arr) => (
                <p key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: 1.8, color: theme.textMid, marginBottom: i < arr.length - 1 ? '16px' : 0 }}>{p}</p>
              ))}
            </div>

            {/* Meeting */}
            <div data-reveal="school-meeting" style={{ ...rev('school-meeting', 0.1), marginBottom: '64px' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '32px', margin: '0 0 20px' }}>{content.meeting.title}</h2>
              <div style={{ background: theme.bgCard, border: '1px solid rgba(232,80,26,0.2)', borderRadius: '8px', padding: '28px 32px', display: 'flex', gap: '20px', alignItems: 'flex-start', transition: 'background 0.4s' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: 'rgba(232,80,26,0.15)', border: '1px solid rgba(232,80,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8501A" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: theme.text }}>{meetingWhen(content.meeting.date)}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: theme.textMid, lineHeight: 1.6 }}>{content.meeting.venue}<br />{content.meeting.address}<br />{content.meeting.note}</div>
                </div>
              </div>
            </div>

            {/* Modules */}
            <div data-reveal="modules-header" style={{ ...rev('modules-header'), marginBottom: '24px' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '32px', margin: 0 }}>{content.modulesTitle}</h2>
            </div>
            <div data-reveal="modules" style={{ ...rev('modules'), display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {content.modules.map((m, i) => (
                <div
                  key={i}
                  style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '24px 28px', display: 'grid', gridTemplateColumns: 'var(--col-time-s)', gap: '20px', alignItems: 'center', transition: 'border-color 0.3s, transform 0.2s, background 0.4s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,80,26,0.3)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '28px', color: '#E8501A', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
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
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '32px', margin: 0 }}>{content.instructorsTitle}</h2>
            </div>
            <div data-reveal="instructors" style={{ ...rev('instructors'), display: 'grid', gridTemplateColumns: 'var(--col-3)', gap: '12px' }}>
              {content.instructors.map((inst, i) => (
                <div key={i} style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.4s' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(232,80,26,0.12)', border: '1.5px solid rgba(232,80,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: '#E8501A', flexShrink: 0 }}>{initialsFrom(inst.name)}</div>
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
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '18px', marginBottom: '20px', color: theme.text }}>{content.sidebar.contactTitle}</div>
              {[
                { icon: '✉', text: content.sidebar.email },
                { icon: '📞', text: content.sidebar.phone },
                { icon: '📍', text: content.sidebar.address },
              ].filter((c) => c.text).map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 2 ? '14px' : 0 }}>
                  <span style={{ fontSize: '14px', marginTop: '1px', opacity: 0.6 }}>{c.icon}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textMid, lineHeight: 1.5 }}>{c.text}</span>
                </div>
              ))}
            </div>
            <div style={{ background: theme.bgCard, border: '1px solid rgba(232,80,26,0.2)', borderRadius: '10px', padding: '24px 28px', marginBottom: '16px', transition: 'background 0.4s' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '10px' }}>{content.sidebar.accreditationTitle}</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textMid, lineHeight: 1.6, margin: 0 }}>{content.sidebar.accreditationText}</p>
            </div>
            <div style={{ background: 'rgba(232,80,26,0.08)', border: '1px solid rgba(232,80,26,0.25)', borderRadius: '10px', padding: '24px 28px' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8501A', marginBottom: '10px' }}>{content.sidebar.noticeTitle}</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: theme.textMid, lineHeight: 1.6, margin: 0 }}>{content.sidebar.noticeText}</p>
            </div>
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
        <SchoolEditForm
          initial={content}
          theme={theme}
          saving={saving}
          error={saveError}
          onSave={save}
          onClose={() => { setEditing(false); setError(''); }}
        />
      )}

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
