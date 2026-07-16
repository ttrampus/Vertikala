import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Forces every admin to reach AAL2 (verified two-factor) before the admin area
// renders. A member promoted to admin hits this the next time they open /admin:
// no factor yet → enrollment (QR + code); factor already set up → a code prompt.
// Once verified, the whole session is AAL2, so this passes for the rest of it.
export default function AdminMfaGate({ children }) {
  const { profile } = useAuth();
  const mfaExempt = profile?.mfa_exempt === true; // per-account break-glass
  const [phase, setPhase] = useState("checking"); // checking | enroll | challenge | ok | error
  const [factorId, setFactorId] = useState(null);
  const [qrSvg, setQrSvg] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const beginEnroll = useCallback(async () => {
    // Clear any half-finished (unverified) factors so we always show a fresh QR.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of (list?.totp || []).filter((x) => x.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "Vertikala", // label shown in the authenticator app (domain-independent)
      friendlyName: `admin-${Date.now()}`,
    });
    if (enrollErr) { setError(enrollErr.message); setPhase("error"); return; }
    setFactorId(data.id);
    setQrSvg(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPhase("enroll");
  }, []);

  const init = useCallback(async () => {
    setError(null);
    if (mfaExempt) { setPhase("ok"); return; } // account exempted from MFA
    const { data: aal, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) { setError(aalErr.message); setPhase("error"); return; }
    if (aal.currentLevel === "aal2") { setPhase("ok"); return; }

    const { data: list } = await supabase.auth.mfa.listFactors();
    const verified = (list?.totp || []).find((f) => f.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setPhase("challenge");
    } else {
      await beginEnroll();
    }
  }, [beginEnroll, mfaExempt]);

  useEffect(() => { init(); }, [init]);

  const verify = async () => {
    if (code.trim().length < 6 || !factorId) return;
    setBusy(true);
    setError(null);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId, challengeId: ch.id, code: code.trim(),
      });
      if (vErr) throw vErr;
      setPhase("ok"); // session is now AAL2
    } catch (err) {
      setError(err.message?.includes("Invalid") ? "Napačna koda. Poskusite znova." : err.message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "ok") return children;

  if (phase === "checking") {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="font-inter font-extrabold text-xl tracking-tight">Dvostopenjska prijava</h1>
        </div>

        {phase === "error" && (
          <>
            <p className="text-sm text-muted-foreground mb-4">Pri nastavitvi je prišlo do napake:</p>
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={init} className="w-full">Poskusi znova</Button>
          </>
        )}

        {phase === "enroll" && (
          <>
            <p className="text-sm text-muted-foreground mb-5">
              Skrbniški dostop zahteva dvostopenjsko prijavo. Skenirajte kodo z aplikacijo
              (Google Authenticator, Authy, 1Password …) in vnesite prikazano 6-mestno kodo.
            </p>
            {qrSvg && (
              <div className="flex justify-center mb-4">
                <img
                  src={qrSvg}
                  alt="QR koda za dvostopenjsko prijavo"
                  className="bg-white rounded-xl p-3 w-52 h-52 object-contain"
                />
              </div>
            )}
            {secret && (
              <p className="text-xs text-muted-foreground text-center mb-5 break-all">
                Ročni vnos: <code className="font-mono text-foreground">{secret}</code>
              </p>
            )}
          </>
        )}

        {phase === "challenge" && (
          <p className="text-sm text-muted-foreground mb-5">
            Vnesite 6-mestno kodo iz svoje aplikacije za avtentikacijo.
          </p>
        )}

        {(phase === "enroll" || phase === "challenge") && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border px-3">
              <KeyRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
                className="border-0 focus-visible:ring-0 px-1 tracking-[0.3em] font-mono text-lg"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={verify} disabled={busy || code.length < 6} className="w-full gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Potrdi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
