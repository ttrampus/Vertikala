import { useState, useEffect, useContext } from "react";
import { ThemeCtx } from "@/lib/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";

const CATEGORIES = [
  { key: "vse", label: "Vsi" },
  { key: "alpinistični", label: "Alpinistični vzponi" },
  { key: "športnoplezalni", label: "Športnoplezalni vzponi" },
  { key: "turni", label: "Turni in smuki" },
];

const CATEGORY_LABELS = {
  "alpinistični": "Alpinistični vzponi",
  "športnoplezalni": "Športnoplezalni vzponi",
  "turni": "Turni in smuki",
};

export default function Vzponi() {
  const theme = useContext(ThemeCtx);
  const [ascents, setAscents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vse");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("ascents")
      .select("*")
      .order("date", { ascending: false })
      .then(({ data }) => {
        setAscents(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = ascents.filter((a) => {
    if (activeTab !== "vse" && a.category !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.climber_name?.toLowerCase().includes(q) ||
        a.route_name?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const byCategory = ["alpinistični", "športnoplezalni", "turni"]
    .map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      entries: filtered.filter((a) => a.category === cat),
    }))
    .filter((g) => g.entries.length > 0);

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, transition: "background 0.4s, color 0.4s" }}>
      {/* Hero */}
      <div style={{ position: "relative", height: "65vh", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center 30%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(10,10,10,0.95) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "0 72px 72px", maxWidth: "1100px" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "12px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#E8501A", marginBottom: "16px", opacity: 0, animation: "fadeUp 0.8s 0.3s forwards" }}>Dosežki</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.01em", margin: "0 0 16px", color: "#fff", opacity: 0, animation: "fadeUp 0.8s 0.5s forwards" }}>Vzponi</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "18px", color: "rgba(255,255,255,0.6)", maxWidth: "520px", opacity: 0, animation: "fadeUp 0.8s 0.7s forwards" }}>Dosežki članov kluba — alpinistični vzponi, plezalni projekti in gorski smuki</p>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)", borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 72px", display: "flex", gap: "48px", overflowX: "auto" }}>
          {[
            { label: "Skupaj", value: ascents.length },
            { label: "Alpinistični vzponi", value: ascents.filter((a) => a.category === "alpinistični").length },
            { label: "Športnoplezalni vzponi", value: ascents.filter((a) => a.category === "športnoplezalni").length },
            { label: "Turni in smuki", value: ascents.filter((a) => a.category === "turni").length },
          ].map((s) => (
            <div key={s.label} style={{ padding: "20px 0", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "28px", lineHeight: 1 }}>{loading ? "—" : s.value}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: theme.textLow, letterSpacing: "0.05em", marginTop: "3px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "56px 72px" }}>

        {/* Tabs + Search */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "44px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveTab(c.key)}
                style={{
                  background: activeTab === c.key ? "#E8501A" : "transparent",
                  border: activeTab === c.key ? "1px solid #E8501A" : `1px solid ${theme.border}`,
                  borderRadius: "6px", padding: "7px 16px", cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase",
                  color: activeTab === c.key ? "#fff" : theme.textMid,
                  transition: "all 0.2s",
                }}
              >{c.label}</button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Išči po plezalcu, smeri…"
            style={{
              background: theme.inputBg, border: `1px solid ${theme.border}`,
              borderRadius: "8px", padding: "8px 14px",
              color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: "13px",
              outline: "none", width: "220px", transition: "border-color 0.2s, background 0.4s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(232,80,26,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = theme.border)}
          />
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", fontFamily: "'Inter', sans-serif", color: theme.textLow }}>Nalagam…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "22px", color: theme.textLow }}>Ni vzponov za prikaz</div>
          </div>
        )}

        {/* All categories view */}
        {!loading && activeTab === "vse" && byCategory.map(({ cat, label, entries }) => (
          <div key={cat} style={{ marginBottom: "60px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.01em", margin: 0, whiteSpace: "nowrap" }}>{label}</h2>
              <div style={{ flex: 1, height: "1px", background: theme.border }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: theme.textLow, whiteSpace: "nowrap" }}>{entries.length} {entries.length === 1 ? "vzpon" : "vzponov"}</span>
            </div>
            <AscentList entries={entries} theme={theme} />
          </div>
        ))}

        {/* Single category view */}
        {!loading && activeTab !== "vse" && filtered.length > 0 && (
          <AscentList entries={filtered} theme={theme} />
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .vzponi-hero { padding: 0 24px 48px !important; }
        }
      `}</style>
    </div>
  );
}

function AscentList({ entries, theme }) {
  const grouped = entries.reduce((acc, a) => {
    const key = a.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div>
      {sortedDates.map((dateKey) => (
        <div key={dateKey} style={{ display: "flex", gap: "20px", marginBottom: "4px" }}>
          {/* Date */}
          <div style={{ width: "80px", flexShrink: 0, paddingTop: "15px" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#E8501A", lineHeight: 1.2 }}>
              {format(new Date(dateKey + "T12:00:00"), "dd. MMM")}
            </div>
          </div>
          {/* Entries for this date */}
          <div style={{ flex: 1 }}>
            {grouped[dateKey].map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "13px 18px",
                  borderRadius: "10px",
                  background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
                  border: `1px solid ${theme.border}`,
                  marginBottom: "6px",
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "14px", minWidth: "140px", flexShrink: 0 }}>
                  {a.climber_name}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: theme.textMid, flex: 1, minWidth: "160px" }}>
                  {a.location && <span style={{ color: theme.text, fontWeight: 500 }}>{a.location}</span>}
                  {a.location && a.route_name && <span style={{ color: theme.textLow }}> — </span>}
                  {a.route_name && <span>{a.route_name}</span>}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
                  {a.difficulty && (
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "12px", letterSpacing: "0.06em", background: "rgba(232,80,26,0.12)", color: "#E8501A", padding: "3px 10px", borderRadius: "4px" }}>
                      {a.difficulty}
                    </span>
                  )}
                  {a.altitude && (
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.06em", background: theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: theme.textMid, padding: "3px 10px", borderRadius: "4px" }}>
                      {a.altitude} m
                    </span>
                  )}
                </div>
                {a.notes && (
                  <div style={{ width: "100%", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: theme.textLow, marginTop: "2px" }}>{a.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
