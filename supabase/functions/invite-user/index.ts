// Deployed Supabase edge function, committed here as the source of truth.
// Kept BYTE-FOR-BYTE as it runs in production — if you change it, deploy with:
//   npx supabase functions deploy invite-user
//
// The invitation email's sender address is NOT set here. inviteUserByEmail()
// hands the mail to Supabase Auth, which sends it via the project's SMTP
// settings (Dashboard → Project Settings → Authentication → SMTP Settings).
// That is also where the sender for password-reset and confirmation mail lives.
//
// KNOWN ISSUE: the 401/403/400 early returns below omit corsHeaders, so the
// browser blocks those responses and the admin UI reports a generic network
// error instead of the real reason. Fix by spreading ...corsHeaders into them.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) return new Response("Unauthorized", { status: 401 });

    const { data: profile } = await supabase
      .from("profile").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return new Response("Forbidden", { status: 403 });

    const { email, redirectTo } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "Email required" }), { status: 400 });

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
