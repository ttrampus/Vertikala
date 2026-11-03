import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { ThemeCtx } from "@/lib/ThemeContext";
import Arrow from "@/components/Arrow";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, profile, isLoadingAuth, isLoadingProfile } = useAuth();
  const theme = useContext(ThemeCtx);

  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // When an MFA factor is enrolled, Supabase requires an AAL2 session to change
  // the password. A reset link only grants AAL1, so we step up with a TOTP code
  // before calling updateUser. (This applies even to mfa_exempt accounts — that
  // flag only skips the admin gate; the server still enforces AAL2 here.)
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  const isLoading = isLoadingAuth || isLoadingProfile;
  const isNewUser = !profile;

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
    if (!isLoading && user && profile) {
      // Already set up — they landed here via a password reset link
      // Let them change their password but skip name
    }
  }, [isLoading, user, profile]);

  // Detect whether the session needs an MFA step-up before the password change.
  useEffect(() => {
    if (isLoading || !user) return;
    let cancelled = false;
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled || !(aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2")) return;
      const { data: list } = await supabase.auth.mfa.listFactors();
      const verified = (list?.totp || []).find((f) => f.status === "verified");
      if (!cancelled && verified) { setMfaFactorId(verified.id); setNeedsMfa(true); }
    })();
    return () => { cancelled = true; };
  }, [isLoading, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isNewUser && !form.name.trim()) { setError("Vnesite svoje ime."); return; }
    if (form.password.length < 6) { setError("Geslo mora vsebovati vsaj 6 znakov."); return; }
    if (form.password !== form.confirm) { setError("Gesli se ne ujemata."); return; }
    if (needsMfa && mfaCode.trim().length < 6) { setError("Vnesite 6-mestno kodo iz aplikacije za avtentikacijo."); return; }

    setSubmitting(true);
    try {
      // Step up to AAL2 first if a factor is enrolled, otherwise updateUser is
      // rejected with "AAL2 session is required to update … password".
      if (needsMfa) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
        if (chErr) throw chErr;
        const { error: vErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: ch.id, code: mfaCode.trim() });
        if (vErr) throw new Error(vErr.message?.includes("Invalid") ? "Napačna koda za dvostopenjsko prijavo." : vErr.message);
      }

      const { error: passError } = await supabase.auth.updateUser({ password: form.password });
      if (passError) throw passError;

      if (isNewUser) {
        const { error: profileError } = await supabase.from("profile").insert({
          id: user.id,
          display_name: form.name.trim(),
        });
        if (profileError && !profileError.code?.includes("23505")) throw profileError;
      }

      setDone(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: theme.inputBg, border: `1px solid ${theme.border}`,
    borderRadius: "6px", padding: "13px 16px",
    color: theme.text, fontFamily: "var(--font-sans)", fontSize: "14px",
    outline: "none", transition: "border-color 0.2s, background 0.4s",
  };

  const labelStyle = {
    fontFamily: "var(--font-display)", fontWeight: 600,
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

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.textLow} strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", margin: "0 auto" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </div>

          ) : done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", letterSpacing: "0.02em", marginBottom: "8px" }}>
                {isNewUser ? "Dobrodošli!" : "Geslo posodobljeno!"}
              </h2>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: theme.textMid }}>Preusmerjam na domačo stran…</p>
            </div>

          ) : (
            <>
              <div style={{ marginBottom: "28px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", letterSpacing: "0.02em", marginBottom: "6px" }}>
                  {isNewUser ? "Nastavite račun" : "Spremenite geslo"}
                </h2>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: theme.textMid }}>
                  {isNewUser
                    ? "Povabljeni ste v AK Vertikala. Nastavite ime in geslo za prijavo."
                    : `Prijavljeni ste kot ${user?.email}. Nastavite novo geslo.`}
                </p>
              </div>

              {error && (
                <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "6px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", fontFamily: "var(--font-sans)", fontSize: "13px", color: "#ef4444" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {isNewUser && (
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
                )}

                {isNewUser && (
                  <div>
                    <label style={labelStyle}>E-pošta</label>
                    <input value={user?.email || ""} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>{isNewUser ? "Geslo" : "Novo geslo"}</label>
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

                {needsMfa && (
                  <div>
                    <label style={labelStyle}>Koda za dvostopenjsko prijavo</label>
                    <input
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      style={{ ...inputStyle, letterSpacing: "0.3em", fontFamily: "var(--font-mono, monospace)" }}
                      onFocus={(e) => e.target.style.borderColor = "rgba(232,80,26,0.5)"}
                      onBlur={(e) => e.target.style.borderColor = theme.border}
                    />
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: theme.textFaint, marginTop: "8px" }}>
                      Vaš račun uporablja dvostopenjsko prijavo. Vnesite 6-mestno kodo iz aplikacije za avtentikacijo.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: submitting ? "#7a2c0d" : "#E8501A", color: "#fff", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "15px", borderRadius: "8px", marginTop: "4px", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "#c73d10"; }}
                  onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = "#E8501A"; }}
                >
                  {submitting
                    ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Shranjujem...</>
                    : <>{isNewUser ? "Aktiviraj račun" : "Posodobi geslo"} <Arrow /></>
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
