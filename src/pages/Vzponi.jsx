import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeCtx } from "@/lib/ThemeContext";
import StatsSection from "@/components/StatsSection";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CATEGORIES = [
  { key: "vse", label: "Vsi" },
  { key: "alpinistični", label: "Alpinistični vzponi" },
  { key: "športnoplezalni", label: "Športnoplezalni vzponi" },
  { key: "turni", label: "Turni in smuki" },
];

const CATEGORY_LABELS = {
  "alpinistični": "Alpinistični",
  "športnoplezalni": "Športnoplezalni",
  "turni": "Turni / smuk",
};

const EMPTY_FORM = { date: "", climber_name: "", category: "alpinistični", location: "", route_name: "", difficulty: "", altitude: "", notes: "" };

export default function Vzponi() {
  const theme = useContext(ThemeCtx);
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();

  const [ascents, setAscents] = useState([]);
  const [climbPosts, setClimbPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vse");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ col: "date", dir: "desc" });

  // Add-ascent modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("ascents").select("*").order("date", { ascending: false }),
      supabase.from("BlogPost").select("id,title,summary,featured_image,author_name,created_date,likes_count").eq("status", "published").eq("category", "climbs").order("created_date", { ascending: false }).limit(6),
    ]).then(([ascentsRes, postsRes]) => {
      setAscents(ascentsRes.data || []);
      setClimbPosts(postsRes.data || []);
      setLoading(false);
    });
  }, []);

  const openForm = () => {
    setForm({ ...EMPTY_FORM, climber_name: profile?.display_name || "", date: new Date().toISOString().slice(0, 10) });
    setFormError("");
    setShowForm(true);
  };

  const saveAscent = async (e) => {
    e.preventDefault();
    if (!form.date || !form.climber_name.trim()) {
      setFormError("Datum in plezalec sta obvezna.");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      date: form.date,
      climber_name: form.climber_name.trim(),
      category: form.category,
      location: form.location.trim() || null,
      route_name: form.route_name.trim() || null,
      difficulty: form.difficulty.trim() || null,
      altitude: form.altitude ? parseInt(form.altitude) : null,
      notes: form.notes.trim() || null,
      created_by_id: user.id,
    };
    const { data, error } = await supabase.from("ascents").insert(payload).select().single();
    setSaving(false);
    if (error || !data) {
      setFormError(error?.message || "Shranjevanje ni uspelo.");
      return;
    }
    setAscents((prev) => [data, ...prev]);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const deleteAscent = async (a) => {
    const { error } = await supabase.from("ascents").delete().eq("id", a.id);
    if (error) {
      alert("Brisanje ni uspelo: " + error.message);
      return;
    }
    setAscents((prev) => prev.filter((x) => x.id !== a.id));
  };

  const canDelete = (a) => isAdmin || (user && a.created_by_id === user.id);

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

  const sorted = [...filtered].sort((a, b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    let va = a[sort.col], vb = b[sort.col];
    if (sort.col === "date") return (new Date(a.date) - new Date(b.date)) * dir;
    if (sort.col === "altitude") return ((a.altitude || 0) - (b.altitude || 0)) * dir;
    va = (va || "").toString().toLowerCase();
    vb = (vb || "").toString().toLowerCase();
    return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
  });

  const toggleSort = (col) => {
    setSort((s) => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "date" || col === "altitude" ? "desc" : "asc" });
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: theme.inputBg, border: `1px solid ${theme.border}`,
    borderRadius: "6px", padding: "10px 12px",
    color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: "14px",
    outline: "none", transition: "border-color 0.2s, background 0.4s",
    colorScheme: theme.isDark ? "dark" : "light",
  };
  const labelStyle = {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
    fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
    color: theme.textLow, display: "block", marginBottom: "6px",
  };

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, transition: "background 0.4s, color 0.4s" }}>
      {/* Hero */}
      <div style={{ position: "relative", height: "65vh", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center 30%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(10,10,10,0.95) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "0 var(--page-x) 72px", maxWidth: "1100px" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "12px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#E8501A", marginBottom: "16px", opacity: 0, animation: "fadeUp 0.8s 0.3s forwards" }}>Dosežki</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.01em", margin: "0 0 16px", color: "#fff", opacity: 0, animation: "fadeUp 0.8s 0.5s forwards" }}>Vzponi</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "18px", color: "rgba(255,255,255,0.6)", maxWidth: "520px", opacity: 0, animation: "fadeUp 0.8s 0.7s forwards" }}>Knjiga vzponov članov kluba — alpinistični vzponi, plezalni projekti in gorski smuki</p>
        </div>
      </div>

      {/* Stats */}
      <StatsSection
        theme={theme}
        items={[
          { val: ascents.length, label: "Skupaj" },
          { val: ascents.filter((a) => a.category === "alpinistični").length, label: "Alpinistični" },
          { val: ascents.filter((a) => a.category === "športnoplezalni").length, label: "Športnoplezalni" },
          { val: ascents.filter((a) => a.category === "turni").length, label: "Turni in smuki" },
        ]}
      />

      {/* Main content */}
      <div className="vzponi-content" style={{ maxWidth: "1100px", margin: "0 auto", padding: "56px var(--page-x)" }}>

        {/* Tabs + Search + Add */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "28px", justifyContent: "space-between" }}>
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
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Išči po plezalcu, smeri…"
              style={{
                background: theme.inputBg, border: `1px solid ${theme.border}`,
                borderRadius: "8px", padding: "8px 14px",
                color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: "13px",
                outline: "none", width: "min(220px, 42vw)", transition: "border-color 0.2s, background 0.4s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(232,80,26,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = theme.border)}
            />
            {user && (
              <button
                onClick={openForm}
                style={{
                  background: "#E8501A", color: "#fff", border: "none", cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "13px",
                  letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 18px",
                  borderRadius: "8px", whiteSpace: "nowrap", transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#c73d10")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#E8501A")}
              >+ Dodaj vzpon</button>
            )}
          </div>
        </div>

        {!user && (
          <div style={{ marginBottom: "24px", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textLow }}>
            Ste član kluba? <span onClick={() => navigate("/login")} style={{ color: "#E8501A", cursor: "pointer", fontWeight: 600 }}>Prijavite se</span> in dodajte svoje vzpone.
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", fontFamily: "'Inter', sans-serif", color: theme.textLow }}>Nalagam…</div>
        )}

        {!loading && sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "22px", color: theme.textLow }}>Ni vzponov za prikaz</div>
          </div>
        )}

        {/* Table */}
        {!loading && sorted.length > 0 && (
          <AscentTable
            rows={sorted}
            theme={theme}
            sort={sort}
            onSort={toggleSort}
            canDelete={canDelete}
            onDelete={deleteAscent}
          />
        )}
      </div>

      {/* Blog posts from climbs category — long-form stories & reports */}
      {climbPosts.length > 0 && (
        <div className="vzponi-stories" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 var(--page-x) 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.01em", margin: 0, whiteSpace: "nowrap" }}>Zgodbe & poročila</h2>
            <div style={{ flex: 1, height: "1px", background: theme.border }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: theme.textLow, whiteSpace: "nowrap" }}>daljša poročila o vzponih</span>
          </div>
          <div className="vzponi-posts-grid" style={{ display: "grid", gridTemplateColumns: "var(--col-3)", gap: "20px" }}>
            {climbPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/post/${post.id}`)}
                style={{
                  background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "10px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,80,26,0.4)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{
                  height: "160px",
                  backgroundImage: post.featured_image ? `url('${post.featured_image}')` : "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  position: "relative",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: theme.textLow, marginBottom: "6px" }}>
                    {format(new Date(post.created_date), "d. MMM yyyy")}
                  </div>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "18px", lineHeight: 1.2, color: theme.text, margin: "0 0 6px" }}>{post.title}</h3>
                  {post.summary && (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: theme.textMid, lineHeight: 1.5, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.summary}</p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: theme.textLow }}>{post.author_name || "Član"} · ♥ {post.likes_count || 0}</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", color: "#E8501A", textTransform: "uppercase" }}>Preberi →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add ascent modal */}
      {showForm && (
        <div
          onClick={() => !saving && setShowForm(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", overflowY: "auto" }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveAscent}
            style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "14px", width: "100%", maxWidth: "560px", padding: "32px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "28px", margin: 0 }}>Dodaj vzpon</h2>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: theme.textLow, fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Datum *</label>
                <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Plezalec *</label>
                <input required placeholder="Ime Priimek" value={form.climber_name} onChange={(e) => setForm((f) => ({ ...f, climber_name: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Kategorija *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  style={{ ...inputStyle, background: theme.isDark ? "#1a1a1a" : "#fff", cursor: "pointer" }}
                >
                  {[
                    { v: "alpinistični", l: "Alpinistični vzponi" },
                    { v: "športnoplezalni", l: "Športnoplezalni vzponi" },
                    { v: "turni", l: "Turni in smuki" },
                  ].map((o) => (
                    <option key={o.v} value={o.v} style={{ background: theme.isDark ? "#1a1a1a" : "#fff", color: theme.text }}>{o.l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Lokacija</label>
                <input placeholder="Mont Blanc, Stovc…" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Smer</label>
                <input placeholder="Trois Monts, Botoks…" value={form.route_name} onChange={(e) => setForm((f) => ({ ...f, route_name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Težavnost</label>
                <input placeholder="7a+, TD-, D+/5c…" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Višina (m)</label>
                <input type="number" placeholder="4808" value={form.altitude} onChange={(e) => setForm((f) => ({ ...f, altitude: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Opomba</label>
                <input placeholder="Neobvezno…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            {formError && (
              <div style={{ marginTop: "16px", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ef4444" }}>{formError}</div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button type="submit" disabled={saving} style={{ background: saving ? "#7a2c0d" : "#E8501A", color: "#fff", border: "none", cursor: saving ? "default" : "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "14px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 28px", borderRadius: "8px" }}>
                {saving ? "Shranjujem…" : "Shrani vzpon"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: `1px solid ${theme.border}`, color: theme.text, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 24px", borderRadius: "8px" }}>Prekliči</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) {
          .vzponi-hero { padding: 0 24px 48px !important; }
        }
        @media (max-width: 768px) {
          .vzponi-posts-grid { grid-template-columns: 1fr !important; }
          .vzponi-content { padding: 40px 24px !important; }
          .vzponi-stories { padding: 0 24px 60px !important; }
          .vzponi-table th.col-opt, .vzponi-table td.col-opt { display: none; }
        }
      `}</style>
    </div>
  );
}

function AscentTable({ rows, theme, sort, onSort, canDelete, onDelete }) {
  const arrow = (col) => sort.col === col ? (sort.dir === "asc" ? " ▲" : " ▼") : "";
  const th = (col, label, extraClass = "") => (
    <th
      className={extraClass}
      onClick={() => onSort(col)}
      style={{
        textAlign: "left", padding: "12px 14px", cursor: "pointer", userSelect: "none",
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "12px",
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: sort.col === col ? "#E8501A" : theme.textLow,
        borderBottom: `2px solid ${theme.border}`, whiteSpace: "nowrap",
      }}
    >{label}{arrow(col)}</th>
  );

  const td = { padding: "13px 14px", fontFamily: "'Inter', sans-serif", fontSize: "14px", borderBottom: `1px solid ${theme.border}`, verticalAlign: "top" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="vzponi-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "640px" }}>
        <thead>
          <tr>
            {th("date", "Datum")}
            {th("climber_name", "Plezalec")}
            {th("category", "Kategorija", "col-opt")}
            {th("location", "Lokacija / smer")}
            {th("difficulty", "Težavnost", "col-opt")}
            {th("altitude", "Višina", "col-opt")}
            <th style={{ borderBottom: `2px solid ${theme.border}`, width: "36px" }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr
              key={a.id}
              style={{ transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ ...td, whiteSpace: "nowrap", color: "#E8501A", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.04em" }}>
                {format(new Date(a.date + "T12:00:00"), "dd. MMM yyyy")}
              </td>
              <td style={{ ...td, fontWeight: 600, color: theme.text, whiteSpace: "nowrap" }}>{a.climber_name}</td>
              <td className="col-opt" style={{ ...td, color: theme.textMid }}>{CATEGORY_LABELS[a.category] || a.category}</td>
              <td style={{ ...td, color: theme.textMid }}>
                {a.location && <span style={{ color: theme.text, fontWeight: 500 }}>{a.location}</span>}
                {a.location && a.route_name && <span style={{ color: theme.textLow }}> — </span>}
                {a.route_name && <span>{a.route_name}</span>}
                {a.notes && <div style={{ fontSize: "12px", color: theme.textLow, marginTop: "3px" }}>{a.notes}</div>}
              </td>
              <td className="col-opt" style={td}>
                {a.difficulty && (
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "12px", letterSpacing: "0.06em", background: "rgba(232,80,26,0.12)", color: "#E8501A", padding: "3px 10px", borderRadius: "4px", whiteSpace: "nowrap" }}>{a.difficulty}</span>
                )}
              </td>
              <td className="col-opt" style={{ ...td, color: theme.textMid, whiteSpace: "nowrap" }}>{a.altitude ? `${a.altitude} m` : ""}</td>
              <td style={{ ...td, textAlign: "right" }}>
                {canDelete(a) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Izbriši vzpon?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {a.climber_name}{(a.location || a.route_name) ? ` — ${a.location || a.route_name}` : ""}. Tega dejanja ni mogoče razveljaviti.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Prekliči</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(a)} className="bg-destructive text-destructive-foreground">Izbriši</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
