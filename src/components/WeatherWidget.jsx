import { useState, useEffect, useContext } from "react";
import { ThemeCtx } from "@/lib/ThemeContext";
import { Cloud, Wind, Thermometer, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

const LOCATIONS = [
  { name: "Triglav", lat: 46.3793, lon: 13.8396, elevation: 2864 },
  { name: "Grintovec", lat: 46.3697, lon: 14.5302, elevation: 2558 },
  { name: "Mangrt", lat: 46.4438, lon: 13.6714, elevation: 2679 },
  { name: "Storžič", lat: 46.3938, lon: 14.3222, elevation: 2132 },
];

const WMO_LABELS = {
  0: "Jasno", 1: "Pretežno jasno", 2: "Delno oblačno", 3: "Oblačno",
  45: "Megla", 48: "Ivje",
  51: "Rahla rosa", 53: "Rosa", 55: "Gosta rosa",
  61: "Rahel dež", 63: "Dež", 65: "Močan dež",
  71: "Rahel sneg", 73: "Sneg", 75: "Močan sneg", 77: "Snežne kroglice",
  80: "Plohe", 81: "Močne plohe", 82: "Nevihta z dežjem",
  85: "Snežne plohe", 86: "Močne snežne plohe",
  95: "Nevihta", 96: "Nevihta s točo", 99: "Huda nevihta s točo",
};

const WMO_EMOJI = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "❄️", 75: "❄️", 77: "🌨️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  85: "🌨️", 86: "❄️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

const DAYS_SL = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

function weatherLabel(code) {
  return WMO_LABELS[code] ?? "Neznano";
}
function weatherEmoji(code) {
  return WMO_EMOJI[code] ?? "🌡️";
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FBerlin&forecast_days=3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

export default function WeatherWidget() {
  const theme = useContext(ThemeCtx);
  const [selected, setSelected] = useState(0);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          LOCATIONS.map((loc) => fetchWeather(loc.lat, loc.lon))
        );
        if (!cancelled) {
          const map = {};
          LOCATIONS.forEach((loc, i) => { map[i] = results[i]; });
          setData(map);
        }
      } catch (e) {
        console.error("Weather error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const loc = LOCATIONS[selected];
  const wx = data[selected];
  const current = wx?.current;
  const daily = wx?.daily;

  return (
    <div style={{
      background: theme.bgCard,
      border: `1px solid ${theme.border}`,
      borderRadius: 16,
      overflow: "hidden",
      height: "fit-content",
    }}>
      {/* Header row */}
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
          <span style={{ fontSize: 20 }}>🏔️</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 15,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: theme.text,
          }}>
            Gorska vremenska napoved
          </span>
          <span style={{
            fontSize: 11, color: theme.textLow,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.04em",
          }}>via Open-Meteo</span>
        </div>
        <span style={{ color: theme.textLow }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "20px 24px" }}>
          {/* Location tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {LOCATIONS.map((l, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${selected === i ? "#E8501A" : theme.border}`,
                  background: selected === i ? "rgba(232,80,26,0.12)" : "none",
                  color: selected === i ? "#E8501A" : theme.textMid,
                  cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600, fontSize: 13,
                  letterSpacing: "0.06em",
                  transition: "all 0.15s",
                }}
              >
                {l.name} · {l.elevation}m
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: theme.textLow, fontSize: 14 }}>
              Nalagam vremenski podatki…
            </div>
          ) : !wx ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: theme.textLow, fontSize: 14 }}>
              Napaka pri nalaganju podatkov.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: 16 }}>
              {/* Current conditions */}
              <div style={{
                background: theme.bgAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: 12, padding: "16px 20px",
              }}>
                <div style={{
                  fontSize: 11, color: theme.textLow,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  marginBottom: 12,
                }}>Trenutno · {loc.name}</div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <span style={{ fontSize: 40, lineHeight: 1 }}>
                    {weatherEmoji(current?.weather_code)}
                  </span>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, lineHeight: 1 }}>
                      {Math.round(current?.temperature_2m ?? 0)}°C
                    </div>
                    <div style={{ fontSize: 13, color: theme.textMid, marginTop: 4 }}>
                      {weatherLabel(current?.weather_code)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      <Wind size={13} style={{ color: theme.textLow }} />
                      <span style={{ fontSize: 12, color: theme.textLow }}>
                        {Math.round(current?.wind_speed_10m ?? 0)} km/h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-day forecast */}
              <div style={{
                background: theme.bgAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: 12, padding: "16px 20px",
              }}>
                <div style={{
                  fontSize: 11, color: theme.textLow,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  marginBottom: 12,
                }}>3-dnevna napoved</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {daily?.time?.slice(0, 3).map((dateStr, i) => {
                    const d = new Date(dateStr);
                    const dayName = i === 0 ? "Danes" : DAYS_SL[d.getDay()];
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: theme.textMid, width: 50 }}>{dayName}</span>
                        <span style={{ fontSize: 16 }}>{weatherEmoji(daily.weather_code[i])}</span>
                        <span style={{ fontSize: 12, color: theme.text, fontWeight: 600 }}>
                          {Math.round(daily.temperature_2m_min[i])}° / {Math.round(daily.temperature_2m_max[i])}°
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
            <a
              href="https://vremehribi.si/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, color: "#E8501A", textDecoration: "none",
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: "0.02em",
              }}
            >
              Podrobna gorska napoved na vremehribi.si <ExternalLink size={11} />
            </a>
            <p style={{ fontSize: 11, color: theme.textFaint, margin: 0 }}>
              Podatki: Open-Meteo.com · Posodobljeno samodejno
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
