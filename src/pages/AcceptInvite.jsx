import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { ThemeCtx } from "@/lib/ThemeContext";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useContext(ThemeCtx);

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState(null);
  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isAuthenticated) { navigate("/"); return; }
    validateToken();
  }, [token, isAuthenticated]);

  const validateToken = async () => {
    setLoading(true);
    // Validate via a SECURITY DEFINER RPC that returns only this token's safe
    // fields. The invitations table itself is not readable by anon, so pending
    // invites and their tokens can't be enumerated. See supabase/security_fixes.sql.
    const { data, error } = await supabase
      .rpc("validate_invitation", { p_token: token })
      .maybeSingle();

    if (error || !data) {
      setTokenError("Povabilo ni veljavno. Preverite povezavo ali se obrnite na administratorja.");
      setLoading(false);
      return;
    }
    if (data.used_at) {
      setTokenError("To povabilo je bilo že uporabljeno.");
      setLoading(false);
      return;
    }
    if (new Date(data.expires_at) < new Date()) {
      setTokenError("Povabilo je poteklo. Prosite administratorja za novo povabilo.");
      setLoading(false);
      return;
    }

    setInvite(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) { setFormError("Vnesite svoje ime."); return; }
    if (form.password.length < 6) { setFormError("Geslo mora vsebovati vsaj 6 znakov."); return; }
    if (form.password !== form.confirm) { setFormError("Gesli se ne ujemata."); return; }

    setSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password: form.password,
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setFormError("Ta e-poštni naslov je že registriran. Prijavite se na strani za prijavo.");
        } else {
          setFormError(signUpError.message);
        }
        setSubmitting(false);
        return;
      }

      if (data.user) {
        await supabase.from("profile").insert({
          id: data.user.id,
          display_name: form.name.trim(),
        });

        // Mark the invite consumed via a SECURITY DEFINER RPC — the invitations
        // table is not writable by regular users. See supabase/security_fixes.sql.
        await supabase.rpc("mark_invitation_used", { p_token: token });
      }

      setDone(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: theme.inputBg, border: `1px solid ${theme.border}`,
    borderRadius: "6px", padding: "13px 16px",
    color: theme.text, fontFamily: "'Inter', sans-serif", fontSize: "14px",
    outline: "none", transition: "border-color 0.2s, background 0.4s",
  };

  const labelStyle = {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
    fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase",
    color: theme.textLow, display: "block", marginBottom: "8px",
  };

  return (
    <div style={{
      background: theme.bg, minHeight: "100vh", color: theme.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "100px 24px 60px", position: "relative", overflow: "hidden",
      transition: "background 0.4s, color 0.4s",
    }}>
      <div style={{ position: "absolute", top: "-200px", left: "50%", transform: "translateX(-50%)", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(232,80,26,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <img
            src="/logo.png"
            alt="AK Vertikala"
            onClick={() => navigate("/")}
            style={{
              height: "44px",
              width: "auto",
              display: "inline-block",
              cursor: "pointer",
              filter: theme.isDark ? "brightness(0) invert(1)" : "none",
              transition: "filter 0.4s, opacity 0.2s",
              opacity: 0.9,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "0.9"; }}
          />
        </div>

        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "16px", padding: "40px", boxShadow: theme.isDark ? "0 40px 80px rgba(0,0,0,0.4)" : "0 20px 60px rgba(0,0,0,0.1)", transition: "background 0.4s, border-color 0.4s" }}>

          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.textLow} strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", margin: "0 auto" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </div>

          ) : tokenError ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", background: "rgba(220,38,38,0.1)", border: "2px solid rgba(220,38,38,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "0.02em", marginBottom: "12px" }}>Povabilo ni veljavno</h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: theme.textMid, lineHeight: 1.6 }}>{tokenError}</p>
              <button onClick={() => navigate("/")} style={{ marginTop: "24px", background: "none", border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textMid }}>← Domov</button>
            </div>

          ) : done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "0.02em", marginBottom: "12px" }}>Dobrodošli!</h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: theme.textMid, lineHeight: 1.6, marginBottom: "24px" }}>
                Vaš račun je bil ustvarjen. {" "}
                {import.meta.env.VITE_SUPABASE_EMAIL_CONFIRM !== "false" && "Preverite e-pošto za potrditveno sporočilo, nato se "}
                Prijavite se z vašim e-poštnim naslovom in geslom.
              </p>
              <button onClick={() => navigate("/login")} style={{ background: "#E8501A", color: "#fff", border: "none", borderRadius: "8px", padding: "13px 28px", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Prijava →
              </button>
            </div>

          ) : (
            <>
              <div style={{ marginBottom: "28px" }}>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "22px", letterSpacing: "0.02em", marginBottom: "6px" }}>Ustvarite račun</h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textMid }}>
                  Povabljeni ste bili z naslovom <strong style={{ color: theme.text }}>{invite?.email}</strong>
                </p>
              </div>

              {formError && (
                <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "6px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ef4444" }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={labelStyle}>Ime in priimek</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Vaše ime"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = "rgba(232,80,26,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = theme.border}
                  />
                </div>

                <div>
                  <label style={labelStyle}>E-pošta</label>
                  <input
                    value={invite?.email || ""}
                    disabled
                    style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Geslo</label>
                  <div style={{ position: "relative" }}>
                    <input
                      required
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: "48px" }}
                      onFocus={(e) => e.target.style.borderColor = "rgba(232,80,26,0.5)"}
                      onBlur={(e) => e.target.style.borderColor = theme.border}
                    />
                    <button type="button" onClick={() => setShowPass((s) => !s)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: theme.textLow }}>
                      {showPass
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Potrdi geslo</label>
                  <input
                    required
                    type={showPass ? "text" : "password"}
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    placeholder="••••••••"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = "rgba(232,80,26,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = theme.border}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: submitting ? "#7a2c0d" : "#E8501A", color: "#fff", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "15px", borderRadius: "8px", marginTop: "4px", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "#c73d10"; }}
                  onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = "#E8501A"; }}
                >
                  {submitting
                    ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Ustvarjam račun...</>
                    : "Ustvari račun →"
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textFaint, transition: "color 0.2s" }}
            onMouseEnter={(e) => e.target.style.color = theme.textMid}
            onMouseLeave={(e) => e.target.style.color = theme.textFaint}>← Nazaj na domačo stran</button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
