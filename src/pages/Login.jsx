import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { ThemeCtx } from "@/lib/ThemeContext";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const { login, authError, setAuthError, isAuthenticated } = useAuth();
  const theme = useContext(ThemeCtx);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(form.email, form.password);
    setLoading(false);
    if (!error) navigate("/");
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/complete-profile`,
    });
    setForgotLoading(false);
    if (error) { setForgotError(error.message); return; }
    setForgotDone(true);
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
        {/* Logo */}
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

        {/* Card */}
        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "16px", padding: "40px", boxShadow: theme.isDark ? "0 40px 80px rgba(0,0,0,0.4)" : "0 20px 60px rgba(0,0,0,0.1)", transition: "background 0.4s, border-color 0.4s" }}>

          {forgotMode ? (
            /* ── Forgot password ── */
            forgotDone ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "56px", height: "56px", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "20px", marginBottom: "12px" }}>E-pošta poslana!</h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: theme.textMid, lineHeight: 1.6, marginBottom: "24px" }}>
                  Preverite e-pošto in kliknite na povezavo za ponastavitev gesla.
                </p>
                <button onClick={() => { setForgotMode(false); setForgotDone(false); setForgotEmail(""); }}
                  style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textMid }}>
                  ← Nazaj na prijavo
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "22px", letterSpacing: "0.02em", marginBottom: "6px" }}>Pozabljeno geslo</h2>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textMid }}>Vnesite e-poštni naslov in poslali vam bomo povezavo za ponastavitev.</p>
                </div>

                {forgotError && (
                  <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "6px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ef4444" }}>{forgotError}</div>
                )}

                <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <label style={labelStyle}>E-pošta</label>
                    <input
                      required type="email" value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="vaš@email.com" style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = "rgba(232,80,26,0.5)"}
                      onBlur={(e) => e.target.style.borderColor = theme.border}
                    />
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    style={{ background: forgotLoading ? "#7a2c0d" : "#E8501A", color: "#fff", border: "none", cursor: forgotLoading ? "not-allowed" : "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "15px", borderRadius: "8px", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    onMouseEnter={(e) => { if (!forgotLoading) e.currentTarget.style.background = "#c73d10"; }}
                    onMouseLeave={(e) => { if (!forgotLoading) e.currentTarget.style.background = "#E8501A"; }}
                  >
                    {forgotLoading
                      ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Pošiljam...</>
                      : "Pošlji povezavo →"
                    }
                  </button>
                  <button type="button" onClick={() => setForgotMode(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textFaint, padding: 0, textAlign: "center" }}>
                    ← Nazaj na prijavo
                  </button>
                </form>
              </>
            )
          ) : (
            /* ── Sign in ── */
            <>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "22px", letterSpacing: "0.02em", marginBottom: "6px" }}>Prijava</h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: theme.textMid, marginBottom: "28px" }}>
                Dostop je samo za člane kluba. Za povabilo se obrnite na administratorja.
              </p>

              {authError && (
                <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "6px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ef4444" }}>
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={labelStyle}>E-pošta</label>
                  <input
                    required type="email" value={form.email}
                    onChange={(e) => { setAuthError && setAuthError(null); setForm((f) => ({ ...f, email: e.target.value })); }}
                    placeholder="vaš@email.com" style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = "rgba(232,80,26,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = theme.border}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Geslo</label>
                  <div style={{ position: "relative" }}>
                    <input
                      required type={showPass ? "text" : "password"} value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••" style={{ ...inputStyle, paddingRight: "48px" }}
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

                <div style={{ textAlign: "right", marginTop: "-8px" }}>
                  <button type="button" onClick={() => { setForgotMode(true); setForgotEmail(form.email); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#E8501A", padding: 0 }}>
                    Pozabljeno geslo?
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  style={{ background: loading ? "#7a2c0d" : "#E8501A", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "15px", borderRadius: "8px", marginTop: "4px", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#c73d10"; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#E8501A"; }}
                >
                  {loading
                    ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Prijavljam...</>
                    : "Prijava →"
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
