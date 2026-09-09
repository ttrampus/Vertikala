import { useState } from "react";
import { Loader2, Upload, X, Plus, Trash2 } from "lucide-react";
import { uploadToSupabase } from "@/lib/uploadToSupabase";
import DateField from "@/components/DateField";
import DraggableList from "@/components/DraggableList";
import AutoTextarea from "@/components/AutoTextarea";
import { withKeys } from "@/lib/pageContent";
import { DEFAULT_SCHOOL } from "@/lib/schoolContent";

// Defined at module scope on purpose. A component declared inside the render
// body is a NEW component type on every render, so React unmounts and remounts
// its subtree — which destroys the focused <input> and drops the caret after
// every single keystroke.
function Field({ lbl, labelStyle, children }) {
  return <div><label style={labelStyle}>{lbl}</label>{children}</div>;
}

// Edit panel for the whole Alpine school page. Deliberately a form of labelled
// fields rather than free rich text: the content changes once a year, and a
// fixed shape means a paste can't break the page layout.
export default function SchoolEditForm({ initial, theme, onSave, onClose, saving, error }) {
  const [form, setForm] = useState(() => withKeys(structuredClone(initial)));
  const [uploading, setUploading] = useState(false);

  const setSection = (section, field, value) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));

  const setListItem = (key, i, field, value) =>
    setForm((f) => ({ ...f, [key]: f[key].map((row, ix) => (ix === i ? { ...row, [field]: value } : row)) }));

  const addListItem = (key, blank) => setForm((f) => ({ ...f, [key]: [...f[key], withKeys([blank])[0]] }));
  const removeListItem = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, ix) => ix !== i) }));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToSupabase(file, "school");
      setSection("hero", "image", url);
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
  const rowCard = {
    border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "14px",
    marginBottom: "10px", display: "grid", gap: "10px",
  };
  const smallBtn = {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "none", border: `1px solid ${theme.border}`, color: theme.textMid, cursor: "pointer",
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "12px",
    letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 14px", borderRadius: "6px",
  };

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
          Module in inštruktorje lahko prevlečete za spremembo vrstnega reda. Spremembe so vidne vsem takoj po shranjevanju.
        </p>

        {/* ── Hero ── */}
        <h3 style={section}>Naslovni del</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          <Field labelStyle={label} lbl="Nadnaslov"><input value={form.hero.eyebrow} onChange={(e) => setSection("hero", "eyebrow", e.target.value)} style={input} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "12px" }}>
            <Field labelStyle={label} lbl="Naslov"><input value={form.hero.title} onChange={(e) => setSection("hero", "title", e.target.value)} style={input} /></Field>
            <Field labelStyle={label} lbl="Naslov — oranžni del"><input value={form.hero.titleAccent} onChange={(e) => setSection("hero", "titleAccent", e.target.value)} style={input} /></Field>
          </div>
          <Field labelStyle={label} lbl="Podnaslov"><AutoTextarea minRows={2} value={form.hero.subtitle} onChange={(e) => setSection("hero", "subtitle", e.target.value)} style={input} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "12px" }}>
            <Field labelStyle={label} lbl="Besedilo gumba"><input value={form.hero.ctaLabel} onChange={(e) => setSection("hero", "ctaLabel", e.target.value)} style={input} /></Field>
            <Field labelStyle={label} lbl="E-pošta za prijave"><input type="email" value={form.hero.ctaEmail} onChange={(e) => setSection("hero", "ctaEmail", e.target.value)} style={input} /></Field>
          </div>
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

        {/* ── Stats ── */}
        <h3 style={section}>Števci</h3>
        <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "10px" }}>
          {form.stats.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "8px" }}>
              <input value={s.val} onChange={(e) => setListItem("stats", i, "val", e.target.value)} style={input} aria-label={`Vrednost ${i + 1}`} />
              <input value={s.label} onChange={(e) => setListItem("stats", i, "label", e.target.value)} style={input} aria-label={`Oznaka ${i + 1}`} />
            </div>
          ))}
        </div>

        {/* ── About ── */}
        <h3 style={section}>O šoli</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          <Field labelStyle={label} lbl="Naslov razdelka"><input value={form.about.title} onChange={(e) => setSection("about", "title", e.target.value)} style={input} /></Field>
          {form.about.paragraphs.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <AutoTextarea minRows={3} value={p}
                onChange={(e) => setForm((f) => ({ ...f, about: { ...f.about, paragraphs: f.about.paragraphs.map((x, ix) => (ix === i ? e.target.value : x)) } }))}
                style={input} aria-label={`Odstavek ${i + 1}`} />
              <button type="button" aria-label="Odstrani odstavek"
                onClick={() => setForm((f) => ({ ...f, about: { ...f.about, paragraphs: f.about.paragraphs.filter((_, ix) => ix !== i) } }))}
                style={{ ...smallBtn, padding: "9px" }}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button type="button" style={smallBtn}
            onClick={() => setForm((f) => ({ ...f, about: { ...f.about, paragraphs: [...f.about.paragraphs, ""] } }))}>
            <Plus className="h-3.5 w-3.5" /> Dodaj odstavek
          </button>
        </div>

        {/* ── Meeting ── */}
        <h3 style={section}>Uvodni sestanek</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "12px" }}>
            <Field labelStyle={label} lbl="Naslov razdelka"><input value={form.meeting.title} onChange={(e) => setSection("meeting", "title", e.target.value)} style={input} /></Field>
            <Field labelStyle={label} lbl="Datum"><DateField value={form.meeting.date} onChange={(v) => setSection("meeting", "date", v)} style={input} /></Field>
          </div>
          <Field labelStyle={label} lbl="Kraj"><input value={form.meeting.venue} onChange={(e) => setSection("meeting", "venue", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Naslov"><input value={form.meeting.address} onChange={(e) => setSection("meeting", "address", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Opomba"><input value={form.meeting.note} onChange={(e) => setSection("meeting", "note", e.target.value)} style={input} /></Field>
        </div>

        {/* ── Modules ── */}
        <h3 style={section}>{form.modulesTitle || "Program šole"}</h3>
        <Field labelStyle={label} lbl="Naslov razdelka"><input value={form.modulesTitle} onChange={(e) => setForm((f) => ({ ...f, modulesTitle: e.target.value }))} style={{ ...input, marginBottom: "12px" }} /></Field>
        <DraggableList
          theme={theme}
          droppableId="school-modules"
          items={form.modules}
          onReorder={(next) => setForm((f) => ({ ...f, modules: next }))}
          renderItem={(m, i) => (
            <div style={rowCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {/* Numbered by position, so dragging renumbers them automatically. */}
                <span style={{ ...label, marginBottom: 0 }}>Modul {String(i + 1).padStart(2, "0")}</span>
                <button type="button" onClick={() => removeListItem("modules", i)} aria-label="Odstrani modul" style={{ ...smallBtn, padding: "6px 8px" }}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "10px" }}>
                <input placeholder="Naziv" value={m.title} onChange={(e) => setListItem("modules", i, "title", e.target.value)} style={input} />
                <input placeholder="Trajanje (npr. 2 tedna)" value={m.weeks} onChange={(e) => setListItem("modules", i, "weeks", e.target.value)} style={input} />
              </div>
              <AutoTextarea minRows={2} placeholder="Opis" value={m.desc} onChange={(e) => setListItem("modules", i, "desc", e.target.value)} style={input} />
            </div>
          )}
        />
        <button type="button" style={smallBtn} onClick={() => addListItem("modules", { title: "", desc: "", weeks: "" })}>
          <Plus className="h-3.5 w-3.5" /> Dodaj modul
        </button>

        {/* ── Instructors ── */}
        <h3 style={section}>{form.instructorsTitle || "Inštruktorji"}</h3>
        <Field labelStyle={label} lbl="Naslov razdelka"><input value={form.instructorsTitle} onChange={(e) => setForm((f) => ({ ...f, instructorsTitle: e.target.value }))} style={{ ...input, marginBottom: "12px" }} /></Field>
        <DraggableList
          theme={theme}
          droppableId="school-instructors"
          items={form.instructors}
          onReorder={(next) => setForm((f) => ({ ...f, instructors: next }))}
          renderItem={(p, i) => (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px" }}>
              <input placeholder="Ime in priimek" value={p.name} onChange={(e) => setListItem("instructors", i, "name", e.target.value)} style={input} />
              <input placeholder="Vloga" value={p.role} onChange={(e) => setListItem("instructors", i, "role", e.target.value)} style={input} />
              <button type="button" onClick={() => removeListItem("instructors", i)} aria-label="Odstrani inštruktorja" style={{ ...smallBtn, padding: "9px" }}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          )}
        />
        <button type="button" style={smallBtn} onClick={() => addListItem("instructors", { name: "", role: "" })}>
          <Plus className="h-3.5 w-3.5" /> Dodaj inštruktorja
        </button>

        {/* ── Sidebar ── */}
        <h3 style={section}>Stranski stolpec</h3>
        <div style={{ display: "grid", gap: "12px" }}>
          <Field labelStyle={label} lbl="Naslov kontakta"><input value={form.sidebar.contactTitle} onChange={(e) => setSection("sidebar", "contactTitle", e.target.value)} style={input} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "12px" }}>
            <Field labelStyle={label} lbl="E-pošta"><input type="email" value={form.sidebar.email} onChange={(e) => setSection("sidebar", "email", e.target.value)} style={input} /></Field>
            <Field labelStyle={label} lbl="Telefon"><input value={form.sidebar.phone} onChange={(e) => setSection("sidebar", "phone", e.target.value)} style={input} /></Field>
          </div>
          <Field labelStyle={label} lbl="Naslov"><input value={form.sidebar.address} onChange={(e) => setSection("sidebar", "address", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Naslov akreditacije"><input value={form.sidebar.accreditationTitle} onChange={(e) => setSection("sidebar", "accreditationTitle", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Besedilo akreditacije"><AutoTextarea minRows={2} value={form.sidebar.accreditationText} onChange={(e) => setSection("sidebar", "accreditationText", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Naslov opozorila"><input value={form.sidebar.noticeTitle} onChange={(e) => setSection("sidebar", "noticeTitle", e.target.value)} style={input} /></Field>
          <Field labelStyle={label} lbl="Besedilo opozorila"><AutoTextarea minRows={2} value={form.sidebar.noticeText} onChange={(e) => setSection("sidebar", "noticeText", e.target.value)} style={input} /></Field>
        </div>

        {error && <div style={{ marginTop: "16px", color: "#E8501A", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px", marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${theme.border}` }}>
          <button type="submit" disabled={saving}
            style={{ background: "#E8501A", color: "#fff", border: "none", cursor: saving ? "default" : "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "14px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 24px", borderRadius: "8px", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Shranjujem…" : "Shrani"}
          </button>
          <button type="button" onClick={onClose} style={{ ...smallBtn, fontSize: "14px", padding: "12px 24px" }}>Prekliči</button>
          <button type="button" onClick={() => setForm(withKeys(structuredClone(DEFAULT_SCHOOL)))} style={{ ...smallBtn, fontSize: "14px", padding: "12px 24px", marginLeft: "auto" }}>
            Ponastavi
          </button>
        </div>
      </form>
    </div>
  );
}
