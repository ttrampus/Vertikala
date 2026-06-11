import { useState, useEffect, useRef } from "react";

/**
 * Shared stats band, homepage style: theme.statBg strip with centered orange
 * Barlow numbers that count up when scrolled into view. Items are
 * { val, label }; numeric vals animate, strings ("Mar", "∞", "PZS") render
 * as-is. Isolated component so the ~70 animation state updates re-render
 * only these numbers, never the parent page.
 */
export default function StatsSection({ theme, items }) {
  const ref = useRef(null);
  const started = useRef(false);
  const [progress, setProgress] = useState(0); // eased 0 → 1

  // Don't start while data is still loading (all zeros) — the observer is
  // re-armed when numbers arrive.
  const hasNumbers = items.some((s) => typeof s.val === "number" && s.val > 0);
  const allStrings = items.every((s) => typeof s.val !== "number");

  useEffect(() => {
    if (allStrings) { setProgress(1); return; }
    const el = ref.current;
    if (!el || !hasNumbers) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      obs.disconnect();
      const duration = 1200;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        setProgress(1 - Math.pow(1 - p, 3));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNumbers, allStrings]);

  const cols =
    items.length === 3 ? "var(--col-3)" :
    items.length === 4 ? "var(--col-4)" :
    `repeat(${items.length}, 1fr)`;

  return (
    <div ref={ref} style={{ background: theme.statBg, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, transition: 'background 0.4s' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: cols }}>
        {items.map((s, i) => (
          <div key={i} style={{ padding: '40px 24px', textAlign: 'center', borderRight: i < items.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 'clamp(34px, 7vw, 52px)', color: '#E8501A', lineHeight: 1 }}>
              {typeof s.val === "number" ? Math.round(s.val * progress) : s.val}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.textLow, marginTop: '8px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
