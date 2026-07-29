import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeCtx } from "@/lib/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { uploadToSupabase } from "@/lib/uploadToSupabase";
import { thumbUrl } from "@/lib/thumbs";
import HeroBg from "@/components/HeroBg";
import CardImage from "@/components/CardImage";
import StatsSection from "@/components/StatsSection";
import { format } from "date-fns";
import { Trash2, Upload, Loader2, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const EMPTY_FORM = { title: "", date_from: "", date_to: "", location: "", summary: "", description: "", image_url: "" };
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=70";

export default function Tabori() {
  const theme = useContext(ThemeCtx);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [detailCamp, setDetailCamp] = useState(null);

  useEffect(() => {
    supabase.from("camps").select("*").order("date_from", { ascending: false }).then(({ data }) => {
      setCamps(data || []);
      setLoading(false);
    });
  }, []);

  const canManage = (c) => isAdmin || (user && c.created_by_id === user.id);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (c) => {
    setEditingId(c.id);
    setForm({
      title: c.title || "",
      date_from: c.date_from || "",
      date_to: c.date_to || "",
      location: c.location || "",
      summary: c.summary || "",
      description: c.description || "",
      image_url: c.image_url || "",
    });
    setFormError("");
    setDetailCamp(null);
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadToSupabase(file, "camps");
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      alert(`Nalaganje ni uspelo: ${err.message}`);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const saveCamp = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date_from) {
      setFormError("Naziv in datum sta obvezna.");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      title: form.title.trim(),
      date_from: form.date_from,
      date_to: form.date_to || null,
      location: form.location.trim() || null,
      summary: form.summary.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url || null,
    };

    if (editingId) {
      const { data, error } = await supabase.from("camps").update(payload).eq("id", editingId).select().single();
      setSaving(false);
      if (error || !data) {
        setFormError(error?.message || "Posodobitev ni uspela.");
        return;
      }
      setCamps((prev) => prev.map((x) => (x.id === editingId ? data : x)));
    } else {
      const { data, error } = await supabase.from("camps").insert({ ...payload, created_by_id: user.id }).select().single();
      setSaving(false);
      if (error || !data) {
        setFormError(error?.message || "Shranjevanje ni uspelo.");
        return;
      }
      setCamps((prev) => [data, ...prev]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const deleteCamp = async (c) => {
    const { error } = await supabase.from("camps").delete().eq("id", c.id);
    if (error) {
      alert("Brisanje ni uspelo: " + error.message);
      return;
    }
    setCamps((prev) => prev.filter((x) => x.id !== c.id));
    setDetailCamp(null);
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

  const formatTerm = (c) => {
    try {
      const from = format(new Date(c.date_from + "T12:00:00"), "d. MMM yyyy");
      if (!c.date_to) return from;
      const to = format(new Date(c.date_to + "T12:00:00"), "d. MMM yyyy");
      return `${from} – ${to}`;
    } catch { return c.date_from; }
  };

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, transition: "background 0.4s, color 0.4s" }}>
      {/* Hero */}
      <div style={{ position: "relative", height: "65vh", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <HeroBg src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600&q=80" position="center 40%" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(10,10,10,0.95) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "0 var(--page-x) 72px", maxWidth: "1100px" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "12px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#E8501A", marginBottom: "16px", opacity: 0, animation: "fadeUp 0.8s 0.3s forwards" }}>Skupaj v gore</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.01em", margin: "0 0 16px", color: "#fff", opacity: 0, animation: "fadeUp 0.8s 0.5s forwards" }}>Tabori</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "18px", color: "rgba(255,255,255,0.6)", maxWidth: "520px", opacity: 0, animation: "fadeUp 0.8s 0.7s forwards" }}>Klubski tabori in večdnevna srečanja</p>
        </div>
      </div>

      <StatsSection theme={theme} items={[{ val: camps.length, label: "Skupaj taborov" }]} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "56px var(--page-x)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
          {user && (
            <button
              onClick={openAddForm}
              style={{
                background: "#E8501A", color: "#fff", border: "none", cursor: "pointer",
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "13px",
                letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 18px",
                borderRadius: "8px", whiteSpace: "nowrap", transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#c73d10")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#E8501A")}
            >+ Dodaj tabor</button>
          )}
        </div>

        {!user && (
          <div style={{ marginBottom: "24px", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textLow }}>
            Ste član kluba? <span onClick={() => navigate("/login")} style={{ color: "#E8501A", cursor: "pointer", fontWeight: 600 }}>Prijavite se</span> in dodajte tabor.
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", fontFamily: "'Inter', sans-serif", color: theme.textLow }}>Nalagam…</div>
        )}

        {!loading && camps.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "22px", color: theme.textLow }}>Ni taborov za prikaz</div>
          </div>
        )}

        {!loading && camps.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "28px" }}>
            {camps.map((c) => (
              <div
                key={c.id}
                onClick={() => setDetailCamp(c)}
                style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "12px", overflow: "hidden", cursor: "pointer", transition: "border-color 0.3s, transform 0.3s, background 0.4s", height: "100%" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(232,80,26,0.35)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <CardImage
                  src={c.image_url ? thumbUrl(c.image_url) : FALLBACK_IMAGE}
                  fallbackSrc={c.image_url || FALLBACK_IMAGE}
                  alt={c.title}
                  style={{ height: "280px" }}
                >
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%)" }} />
                  <span style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(10,10,10,0.75)", backdropFilter: "blur(8px)", color: "#E8501A", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 12px", borderRadius: "4px" }}>{formatTerm(c)}</span>
                  <div style={{ position: "absolute", bottom: "20px", left: "24px", right: "24px" }}>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(24px, 3vw, 30px)", lineHeight: 1.1, color: "#fff", margin: 0 }}>{c.title}</h3>
                    {c.location && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.75)", marginTop: "4px" }}>{c.location}</div>}
                  </div>
                </CardImage>
                <div style={{ padding: "24px 28px" }}>
                  {c.summary && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", lineHeight: 1.6, color: theme.textMid, margin: "0 0 20px", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.summary}</p>}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", color: "#E8501A", textTransform: "uppercase" }}>Odpri →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailCamp && (
        <div
          onClick={() => setDetailCamp(null)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", overflowY: "auto" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "14px", width: "100%", maxWidth: "640px", overflow: "hidden" }}
          >
            <div style={{ position: "relative" }}>
              <CardImage
                src={detailCamp.image_url ? thumbUrl(detailCamp.image_url) : FALLBACK_IMAGE}
                fallbackSrc={detailCamp.image_url || FALLBACK_IMAGE}
                alt={detailCamp.title}
                style={{ height: "260px" }}
              />
              <button
                onClick={() => setDetailCamp(null)}
                style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(10,10,10,0.7)", border: "none", borderRadius: "999px", padding: "8px", cursor: "pointer", display: "flex" }}
              ><X className="h-4 w-4" style={{ color: "#fff" }} /></button>
            </div>
            <div style={{ padding: "32px" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", color: "#E8501A", marginBottom: "10px" }}>{formatTerm(detailCamp)}</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "32px", lineHeight: 1.1, margin: "0 0 10px", color: theme.text }}>{detailCamp.title}</h2>
              {detailCamp.location && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: theme.textMid, marginBottom: "20px" }}>{detailCamp.location}</div>}
              {detailCamp.summary && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "16px", lineHeight: 1.7, color: theme.text, margin: detailCamp.description ? "0 0 20px" : 0 }}>{detailCamp.summary}</p>
              )}
              {detailCamp.description && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", lineHeight: 1.8, color: theme.textMid, margin: 0, whiteSpace: "pre-wrap" }}>{detailCamp.description}</p>
              )}

              {canManage(detailCamp) && (
                <div style={{ display: "flex", gap: "10px", marginTop: "28px", paddingTop: "24px", borderTop: `1px solid ${theme.border}` }}>
                  <button
                    onClick={() => openEditForm(detailCamp)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      background: "none", border: `1px solid ${theme.border}`, color: theme.textMid, cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "13px",
                      letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 18px", borderRadius: "8px",
                    }}
                  ><Pencil className="h-3.5 w-3.5" /> Uredi</button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="z-[200]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Izbriši tabor?</AlertDialogTitle>
                        <AlertDialogDescription>{detailCamp.title}. Tega dejanja ni mogoče razveljaviti.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Prekliči</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCamp(detailCamp)} className="bg-destructive text-destructive-foreground">Izbriši</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/edit camp modal */}
      {showForm && (
        <div
          onClick={() => !saving && setShowForm(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", overflowY: "auto" }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveCamp}
            style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "14px", width: "100%", maxWidth: "560px", padding: "32px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "28px", margin: 0 }}>{editingId ? "Uredi tabor" : "Dodaj tabor"}</h2>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: theme.textLow, fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Naziv *</label>
                <input required placeholder="Poletni tabor Paklenica" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Datum od *</label>
                <input type="date" required value={form.date_from} onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Datum do</label>
                <input type="date" value={form.date_to} onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Lokacija</label>
                <input placeholder="Paklenica, Hrvaška…" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Opis</label>
                <textarea rows={2} placeholder="Kratek opis, prikazan na kartici…" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} style={{ ...inputStyle, resize: "vertical", fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Podrobnosti</label>
                <textarea rows={7} placeholder="Vse ostalo: kje se začne in konča, kaj s seboj, pravila, program… (neobvezno)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, resize: "vertical", fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Slika</label>
                {form.image_url ? (
                  <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", height: "160px" }}>
                    <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                      style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "999px", padding: "6px", cursor: "pointer", display: "flex" }}
                    ><X className="h-4 w-4" style={{ color: "#fff" }} /></button>
                  </div>
                ) : (
                  <label style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    height: "120px", borderRadius: "8px", border: `1.5px dashed ${theme.border}`,
                    cursor: uploadingImage ? "default" : "pointer", gap: "8px",
                  }}>
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin" style={{ color: theme.textLow }} />
                    ) : (
                      <>
                        <Upload className="h-6 w-6" style={{ color: theme.textLow }} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textLow }}>Kliknite za nalaganje slike</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ display: "none" }} />
                  </label>
                )}
              </div>
            </div>

            {formError && <div style={{ marginTop: "14px", color: "#E8501A", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>{formError}</div>}

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "#E8501A", color: "#fff", border: "none", cursor: saving ? "default" : "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "14px",
                  letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 24px",
                  borderRadius: "8px", opacity: saving ? 0.7 : 1,
                }}
              >{saving ? "Shranjujem…" : "Shrani"}</button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: "none", border: `1px solid ${theme.border}`, color: theme.textMid, cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "14px",
                  letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 24px", borderRadius: "8px",
                }}
              >Prekliči</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
