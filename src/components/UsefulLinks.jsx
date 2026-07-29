import { useState, useContext } from "react";
import { ThemeCtx } from "@/lib/ThemeContext";
import { ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";

const LINKS = [
  { label: "Dokumenti AK Vertikala", url: "https://drive.google.com/drive/folders/0B5LWMyPGscYsMmdBNTIySlFWcjg" },
  { label: "Gore in ljudje", url: "http://www.gore-ljudje.net/" },
  { label: "KA PZS", url: "http://ka.pzs.si/" },
  { label: "Ledno-snežne razmere", url: "http://razmere.ice-climbing.net/" },
  { label: "Slo-alp", url: "http://www.slo-alp.com/" },
  { label: "Turna smuka", url: "http://razmere.turni-klub-gora.si/RazmereVsebina.php?Obv=Vse#ObvRazmere9118" },
  { label: "Vreme", url: "http://www.meteoblue.com/en_US/weather/forecast/week/ljubljana_si_3002" },
];

export default function UsefulLinks() {
  const theme = useContext(ThemeCtx);
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: theme.bgCard,
      border: `1px solid ${theme.border}`,
      borderRadius: 16,
      overflow: "hidden",
      height: "fit-content",
    }}>
      {/* Header row — mirrors WeatherWidget's collapsible header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "none", border: "none", cursor: "pointer",
          borderBottom: expanded ? `1px solid ${theme.border}` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔗</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 15,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: theme.text,
          }}>
            Uporabne povezave
          </span>
          <span style={{
            fontSize: 11, color: theme.textLow,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.04em",
          }}>{LINKS.length} virov</span>
        </div>
        <span style={{ color: theme.textLow }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "20px 24px", display: "flex", flexWrap: "wrap", gap: 10 }}>
          {LINKS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: 13, letterSpacing: "0.06em",
                color: theme.textMid, textDecoration: "none",
                background: theme.bgAlt, border: `1px solid ${theme.border}`,
                borderRadius: 999, padding: "9px 16px",
                transition: "color 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#E8501A"; e.currentTarget.style.borderColor = "#E8501A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMid; e.currentTarget.style.borderColor = theme.border; }}
            >
              {l.label}
              <ArrowUpRight size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
