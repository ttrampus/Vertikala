import { useState } from "react";
import { Loader2, Upload, X, Plus, Trash2 } from "lucide-react";
import { uploadToSupabase } from "@/lib/uploadToSupabase";
import DraggableList from "@/components/DraggableList";
import AutoTextarea from "@/components/AutoTextarea";
import { withKeys } from "@/lib/pageContent";
import { DEFAULT_ABOUT } from "@/lib/aboutContent";

// Module scope: a component declared inside the render body is a new type on
// every render, which remounts its subtree and drops the caret each keystroke.
function Field({ lbl, labelStyle, children }) {
  return <div><label style={labelStyle}>{lbl}</label>{children}</div>;
}

export default function AboutEditForm({ initial, theme, onSave, onClose, saving, error }) {
  const [form, setForm] = useState(() => withKeys(structuredClone(initial)));
  const [uploading, setUploading] = useState(false);

  const setSection = (section, field, value) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));

  const setNestedItem = (section, i, field, value) =>
    setForm((f) => ({
      ...f,
      [section]: { ...f[section], items: f[section].items.map((r, ix) => (ix === i ? { ...r, [field]: value } : r)) },
    }));

  const reorder = (section, next) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], items: next } }));

  const addItem = (section, blank) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], items: [...f[section].items, withKeys([blank])[0]] } }));

  const removeItem = (section, i) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], items: f[section].items.filter((_, ix) => ix !== i) } }));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setSection("hero", "image", await uploadToSupabase(file, "about"));
    } catch (err) {
      alert(`Nalaganje ni uspelo: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const input = {
    width: "100%", boxSizing: "border-box",
    background: theme.inputBg, border: `1px solid ${theme.border}`,
    borderRadius: "6px", padding: "9px 12px",
    color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: "14px",
    outline: "none", colorScheme: theme.isDark ? "dark" : "light",
  };
  const label = {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
    fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
    color: theme.textLow, display: "block", marginBottom: "6px",
  };
  const section = {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "20px",
    margin: "0 0 14px", paddingTop: "24px", borderTop: `1px solid ${theme.border}`, color: theme.text,
  };
  const smallBtn = {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "none", border: `1px solid ${theme.border}`, color: theme.textMid, cursor: "pointer",
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "12px",
    letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 14px", borderRadius: "6px",
  };
  const iconBtn = { ...smallBtn, padding: "9px" };

  return (
    <div
      onClick={() => !saving && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", overflowY: "auto" }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSave(form); }}
        style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "14px", width: "100%", maxWidth: "680px", padding: "32px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "28px", margin: 0 }}>Uredi stran</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: theme.textLow, fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textLow, margin: "0 0 8px" }}>
          Vrstice lahko prevlečete za spremembo vrstnega reda. Spremembe so vidne vsem takoj po shranjevanju.
        </p>

        {/* Hero */}
        <h3 style={section}>Naslovni del</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          <Field labelStyle={label} lbl="Nadnaslov"><input value={form.hero.eyebrow} onChange={(e) => setSection("hero", "eyebrow", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Naslov"><input value={form.hero.title} onChange={(e) => setSection("hero", "title", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Podnaslov"><input value={form.hero.subtitle} onChange={(e) => setSection("hero", "subtitle", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Naslovna slika">
            {form.hero.image ? (
              <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", height: "150px" }}>
                <img src={form.hero.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button type="button" onClick={() => setSection("hero", "image", "")}
                  style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "999px", padding: "6px", cursor: "pointer", display: "flex" }}>
                  <X className="h-4 w-4" style={{ color: "#fff" }} />
                </button>
              </div>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "110px", borderRadius: "8px", border: `1.5px dashed ${theme.border}`, cursor: uploading ? "default" : "pointer", gap: "8px" }}>
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: theme.textLow }} />
                  : <><Upload className="h-6 w-6" style={{ color: theme.textLow }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textLow }}>Kliknite za nalaganje slike</span></>}
                <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} style={{ display: "none" }} />
              </label>
            )}
          </Field>
        </div>

        {/* History */}
        <h3 style={section}>Zgodovina</h3>
        <Field labelStyle={label} lbl="Naslov razdelka">
          <input value={form.history.title} onChange={(e) => setSection("history", "title", e.target.value)} style={{ ...input, marginBottom: "12px" }} />
        </Field>
        <DraggableList
          theme={theme}
          droppableId="about-paragraphs"
          items={form.history.paragraphs}
          onReorder={(next) => setSection("history", "paragraphs", next)}
          renderItem={(p, i) => (
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <AutoTextarea
                minRows={3}
                value={p.text}
                onChange={(e) => setForm((f) => ({ ...f, history: { ...f.history, paragraphs: f.history.paragraphs.map((x, ix) => (ix === i ? { ...x, text: e.target.value } : x)) } }))}
                style={input}
                aria-label={`Odstavek ${i + 1}`}
              />
              <button type="button" aria-label="Odstrani odstavek" style={iconBtn}
                onClick={() => setSection("history", "paragraphs", form.history.paragraphs.filter((_, ix) => ix !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        />
        <button type="button" style={smallBtn}
          onClick={() => setSection("history", "paragraphs", [...form.history.paragraphs, withKeys([{ text: "" }])[0]])}>
          <Plus className="h-3.5 w-3.5" /> Dodaj odstavek
        </button>

        {/* Stats */}
        <h3 style={section}>Števci</h3>
        <DraggableList
          theme={theme}
          droppableId="about-stats"
          items={form.stats}
          onReorder={(next) => setForm((f) => ({ ...f, stats: next }))}
          renderItem={(s, i) => (
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "8px" }}>
              <input value={s.val} aria-label={`Vrednost ${i + 1}`} style={input}
                onChange={(e) => setForm((f) => ({ ...f, stats: f.stats.map((x, ix) => (ix === i ? { ...x, val: e.target.value } : x)) }))} />
              <input value={s.label} aria-label={`Oznaka ${i + 1}`} style={input}
                onChange={(e) => setForm((f) => ({ ...f, stats: f.stats.map((x, ix) => (ix === i ? { ...x, label: e.target.value } : x)) }))} />
            </div>
          )}
        />

        {/* Activities */}
        <h3 style={section}>Aktivnosti</h3>
        <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "12px", marginBottom: "12px" }}>
          <Field labelStyle={label} lbl="Nadnaslov"><input value={form.activities.eyebrow} onChange={(e) => setSection("activities", "eyebrow", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Naslov"><input value={form.activities.title} onChange={(e) => setSection("activities", "title", e.target.value)} style={input} /></Field>
        </div>
        <DraggableList
          theme={theme}
          droppableId="about-activities"
          items={form.activities.items}
          onReorder={(next) => reorder("activities", next)}
          renderItem={(a, i) => (
            <div style={{ display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input placeholder="Naziv" value={a.title} onChange={(e) => setNestedItem("activities", i, "title", e.target.value)} style={input} />
                <button type="button" aria-label="Odstrani aktivnost" style={iconBtn} onClick={() => removeItem("activities", i)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <AutoTextarea minRows={2} placeholder="Opis" value={a.desc} onChange={(e) => setNestedItem("activities", i, "desc", e.target.value)} style={input} />
            </div>
          )}
        />
        <button type="button" style={smallBtn} onClick={() => addItem("activities", { title: "", desc: "" })}>
          <Plus className="h-3.5 w-3.5" /> Dodaj aktivnost
        </button>

        {/* Team */}
        <h3 style={section}>Ekipa</h3>
        <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "12px", marginBottom: "12px" }}>
          <Field labelStyle={label} lbl="Nadnaslov"><input value={form.team.eyebrow} onChange={(e) => setSection("team", "eyebrow", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Naslov"><input value={form.team.title} onChange={(e) => setSection("team", "title", e.target.value)} style={input} /></Field>
        </div>
        <DraggableList
          theme={theme}
          droppableId="about-team"
          items={form.team.items}
          onReorder={(next) => reorder("team", next)}
          renderItem={(m, i) => (
            <div style={{ display: "grid", gap: "8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px" }}>
                <input placeholder="Ime" value={m.name} onChange={(e) => setNestedItem("team", i, "name", e.target.value)} style={input} />
                <input placeholder="Vloga" value={m.role} onChange={(e) => setNestedItem("team", i, "role", e.target.value)} style={input} />
                <button type="button" aria-label="Odstrani člana" style={iconBtn} onClick={() => removeItem("team", i)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <AutoTextarea minRows={2} placeholder="Opis" value={m.desc} onChange={(e) => setNestedItem("team", i, "desc", e.target.value)} style={input} />
            </div>
          )}
        />
        <button type="button" style={smallBtn} onClick={() => addItem("team", { name: "", role: "", desc: "" })}>
          <Plus className="h-3.5 w-3.5" /> Dodaj člana
        </button>

        {error && <div style={{ marginTop: "16px", color: "#E8501A", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px", marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${theme.border}` }}>
          <button type="submit" disabled={saving}
            style={{ background: "#E8501A", color: "#fff", border: "none", cursor: saving ? "default" : "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "14px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 24px", borderRadius: "8px", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Shranjujem…" : "Shrani"}
          </button>
          <button type="button" onClick={onClose} style={{ ...smallBtn, fontSize: "14px", padding: "12px 24px" }}>Prekliči</button>
          <button type="button" onClick={() => setForm(withKeys(structuredClone(DEFAULT_ABOUT)))} style={{ ...smallBtn, fontSize: "14px", padding: "12px 24px", marginLeft: "auto" }}>Ponastavi</button>
        </div>
      </form>
    </div>
  );
}
