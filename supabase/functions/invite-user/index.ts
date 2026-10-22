// Deployed Supabase edge function, committed here as the source of truth.
// Kept in sync with production — if you change it, deploy with:
//   npx supabase functions deploy invite-user
//
// The invitation email's sender address is NOT set here. inviteUserByEmail()
// hands the mail to Supabase Auth, which sends it via the project's SMTP
// settings (Dashboard → Project Settings → Authentication → SMTP Settings).
// That is also where the sender for password-reset and confirmation mail lives.
//
// Only an admin with a VERIFIED second factor (AAL2) — or an explicitly
// mfa_exempt account — may invite. Inviting is a privileged action (a fresh
// invite is the first step of the profile-escalation path), so it must not be
// reachable with a stolen password alone. This mirrors is_admin_mfa() in the
// database.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Read the Authenticator Assurance Level from the caller's access token.
// Supabase sets `aal: "aal2"` once a user has completed an MFA challenge.
function tokenAal(jwt: string): string | null {
  try {
    const [, payload] = jwt.split(".");
    const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof data.aal === "string" ? data.aal : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profile").select("role, mfa_exempt").eq("id", user.id).single();
    if (profile?.role !== "admin") return json({ error: "Forbidden" }, 403);

    // Require a verified second factor, unless the account is break-glass exempt.
    if (profile?.mfa_exempt !== true && tokenAal(token) !== "aal2") {
      return json({ error: "Za pošiljanje povabil je potrebna dvostopenjska prijava (MFA)." }, 403);
    }

    const { email, redirectTo } = await req.json();
    if (!email) return json({ error: "Email required" }, 400);

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) throw error;

    return json({ success: true }, 200);
  } catch (err) {
    return json({ error: err.message }, 400);
  }
});
