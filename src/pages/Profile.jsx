import { useState, useRef, useContext, useEffect } from "react";
import { ThemeCtx } from "@/lib/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Camera, Check, AlertCircle } from "lucide-react";

const AVATAR_MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function Profile() {
  const theme = useContext(ThemeCtx);
  const { user, profile, setProfile } = useAuth();
  const fileRef = useRef(null);

  // Profile fields
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { ok, text }

  // Password fields
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: theme.inputBg, border: `1px solid ${theme.border}`,
    borderRadius: "8px", padding: "12px 14px",
    color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: "14px",
    outline: "none", transition: "border-color 0.2s, background 0.4s",
    colorScheme: theme.isDark ? "dark" : "light",
  };
  const labelStyle = {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
    fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase",
    color: theme.textLow, display: "block", marginBottom: "8px",
  };
  const cardStyle = {
    background: theme.bgCard, border: `1px solid ${theme.border}`,
    borderRadius: "14px", padding: "32px", marginBottom: "28px",
    transition: "background 0.4s",
  };
  const sectionTitle = {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
    fontSize: "24px", margin: "0 0 4px",
  };
  const sectionSub = {
    fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textLow, margin: "0 0 24px",
  };
  const focusOn = (e) => (e.target.style.borderColor = "rgba(232,80,26,0.5)");
  const focusOff = (e) => (e.target.style.borderColor = theme.border);

  const primaryBtn = (disabled) => ({
    background: disabled ? "#7a2c0d" : "#E8501A", color: "#fff", border: "none",
    cursor: disabled ? "default" : "pointer",
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "14px",
    letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 28px",
    borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "8px",
  });

  const Banner = ({ msg }) => msg ? (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px", marginTop: "16px",
      fontFamily: "'Inter', sans-serif", fontSize: "13px",
      color: msg.ok ? "#16a34a" : "#ef4444",
    }}>
      {msg.ok ? <Check size={15} /> : <AlertCircle size={15} />} {msg.text}
    </div>
  ) : null;

  // ── Avatar upload ───────────────────────────────────────────────
  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking same file
    if (!file) return;
    setProfileMsg(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setProfileMsg({ ok: false, text: "Dovoljene so le slike (JPG, PNG, WEBP, GIF)." });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setProfileMsg({ ok: false, text: "Slika je prevelika (največ 4 MB)." });
      return;
    }

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      // Scope the path to the user's own id so it's traceable & unique
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("blog-images").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      setProfileMsg({ ok: true, text: "Slika naložena — ne pozabite shraniti." });
    } catch (err) {
      setProfileMsg({ ok: false, text: "Nalaganje ni uspelo: " + err.message });
    } finally {
      setUploading(false);
    }
  };

  // ── Save profile (name + avatar) ────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!name.trim()) {
      setProfileMsg({ ok: false, text: "Ime ne sme biti prazno." });
      return;
    }
    setSavingProfile(true);
    const newName = name.trim();
    // Only send the two fields a user is allowed to change.
    const { data, error } = await supabase
      .from("profile")
      .update({ display_name: newName, avatar_url: avatarUrl || null })
      .eq("id", user.id)
      .select()
      .single();
    if (error) {
      setSavingProfile(false);
      setProfileMsg({ ok: false, text: "Shranjevanje ni uspelo: " + error.message });
      return;
    }
    setProfile(data);
    // Propagate the new display name to the denormalized author field on this
    // member's existing posts, so post lists/cards show the updated name.
    // (Comments and the post-author header read the profile live, so they don't
    // need back-filling.) Best-effort — a failure here shouldn't block the save.
    const { error: postErr } = await supabase
      .from("BlogPost")
      .update({ author_name: newName })
      .eq("created_by_id", user.id);
    setSavingProfile(false);
    setProfileMsg({
      ok: true,
      text: postErr ? "Profil posodobljen (objave bodo posodobljene ob osvežitvi)." : "Profil posodobljen.",
    });
  };

  // ── Change password (re-auth with current password first) ───────
  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next.length < 6) { setPwMsg({ ok: false, text: "Novo geslo mora imeti vsaj 6 znakov." }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: "Gesli se ne ujemata." }); return; }
    if (!pw.current) { setPwMsg({ ok: false, text: "Vnesite trenutno geslo." }); return; }

    setSavingPw(true);
    // Verify the current password by re-authenticating — prevents a hijacked
    // open session from silently changing the password.
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pw.current,
    });
    if (reauthErr) {
      setSavingPw(false);
      setPwMsg({ ok: false, text: "Trenutno geslo ni pravilno." });
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: pw.next });
    if (updErr) {
      setSavingPw(false);
      setPwMsg({ ok: false, text: "Sprememba ni uspela: " + updErr.message });
      return;
    }
    // Invalidate any OTHER active sessions (other devices/browsers) so a leaked
    // old session can't keep using the account after a password change. The
    // current session stays signed in.
    try { await supabase.auth.signOut({ scope: "others" }); } catch (_) { /* non-fatal */ }
    setSavingPw(false);
    setPw({ current: "", next: "", confirm: "" });
    setPwMsg({ ok: true, text: "Geslo spremenjeno. Druge naprave so bile odjavljene." });
  };

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, transition: "background 0.4s, color 0.4s" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "140px 24px 96px" }}>
        <div style={{ width: "40px", height: "3px", background: "#E8501A", borderRadius: "2px", marginBottom: "20px" }} />
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(40px,6vw,56px)", lineHeight: 1, margin: "0 0 40px" }}>Moj profil</h1>

        {/* ── Profile card ── */}
        <form onSubmit={saveProfile} style={cardStyle}>
          <h2 style={sectionTitle}>Osebni podatki</h2>
          <p style={sectionSub}>Vaše ime in slika sta vidna na objavah in v knjigi vzponov.</p>

          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: "84px", height: "84px", borderRadius: "50%", overflow: "hidden",
                background: "rgba(232,80,26,0.12)", border: `1px solid ${theme.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "30px", color: "#E8501A" }}>{initials(name)}</span>
                )}
              </div>
              {uploading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={22} color="#fff" style={{ animation: "spin 0.8s linear infinite" }} />
                </div>
              )}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ background: "none", border: `1px solid ${theme.border}`, color: theme.text, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "9px 16px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "7px" }}>
                <Camera size={15} /> Spremeni sliko
              </button>
              {avatarUrl && (
                <button type="button" onClick={() => setAvatarUrl("")}
                  style={{ background: "none", border: "none", color: theme.textLow, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "12px", marginLeft: "12px", textDecoration: "underline" }}>
                  Odstrani
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Ime</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ime Priimek" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>

          <div style={{ marginBottom: "4px" }}>
            <label style={labelStyle}>E-pošta</label>
            <input value={user?.email || ""} readOnly disabled
              style={{ ...inputStyle, opacity: 0.65, cursor: "not-allowed" }} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: theme.textLow, margin: "8px 0 0" }}>
              E-pošta je vaš prijavni naslov in je ni mogoče spremeniti tukaj. Za spremembo se obrnite na administratorja.
            </p>
          </div>

          <Banner msg={profileMsg} />

          <div style={{ marginTop: "24px" }}>
            <button type="submit" disabled={savingProfile || uploading} style={primaryBtn(savingProfile || uploading)}>
              {savingProfile && <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />}
              Shrani spremembe
            </button>
          </div>
        </form>

        {/* ── Password card ── */}
        <form onSubmit={changePassword} style={cardStyle}>
          <h2 style={sectionTitle}>Geslo</h2>
          <p style={sectionSub}>Za spremembo gesla najprej vnesite trenutno geslo.</p>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Trenutno geslo</label>
            <input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "var(--col-2)", gap: "16px", marginBottom: "4px" }}>
            <div>
              <label style={labelStyle}>Novo geslo</label>
              <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label style={labelStyle}>Ponovi novo geslo</label>
              <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            </div>
          </div>

          <Banner msg={pwMsg} />

          <div style={{ marginTop: "24px" }}>
            <button type="submit" disabled={savingPw} style={primaryBtn(savingPw)}>
              {savingPw && <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />}
              Spremeni geslo
            </button>
          </div>
        </form>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
