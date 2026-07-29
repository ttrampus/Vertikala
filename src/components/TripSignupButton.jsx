import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Users, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TripSignupButton({ postId }) {
  const { user, profile } = useAuth();
  const [signups, setSignups] = useState([]);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    loadSignups();
  }, [postId]);

  useEffect(() => {
    if (user) {
      setIsSignedUp(signups.some((s) => s.user_id === user.id));
    }
  }, [signups, user]);

  const loadSignups = async () => {
    // Explicit column list — user_email is revoked from anon/authenticated
    // (see supabase/restrict_trip_signups_email.sql), and select("*") errors
    // against a table that only has column-level grants.
    const { data } = await supabase
      .from("trip_signups")
      .select("id, post_id, user_id, user_name, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setSignups(data || []);
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      if (isSignedUp) {
        await supabase
          .from("trip_signups")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        setSignups((prev) => prev.filter((s) => s.user_id !== user.id));
        setIsSignedUp(false);
      } else {
        const { data } = await supabase
          .from("trip_signups")
          .insert({
            post_id: postId,
            user_id: user.id,
            user_name: profile?.display_name || user.user_metadata?.full_name || "Udeleženec",
            user_email: user.email,
          })
          .select("id, post_id, user_id, user_name, created_at")
          .single();
        if (data) {
          setSignups((prev) => [...prev, data]);
          setIsSignedUp(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-inter font-bold text-base">Prijava na izlet</h3>
        </div>
        <span className="text-sm font-inter font-semibold text-muted-foreground">
          {loading ? "…" : `${signups.length} prijavljenih`}
        </span>
      </div>

      {isSignedUp && (
        <div className="flex items-center gap-2 text-sm text-green-500 mb-4 font-inter">
          <CheckCircle className="h-4 w-4" />
          Prijavljeni ste na ta izlet
        </div>
      )}

      {user ? (
        <Button
          onClick={handleSignup}
          disabled={busy}
          variant={isSignedUp ? "outline" : "default"}
          className="w-full gap-2"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSignedUp ? "Odjava z izleta" : "Prijavi se na izlet"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground font-inter text-center py-2">
          Za prijavo na izlet se morate <a href="/login" className="text-primary hover:underline">prijaviti</a>.
        </p>
      )}

      {signups.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowList((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-inter"
          >
            {showList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showList ? "Skrij" : "Prikaži"} seznam udeležencev
          </button>

          {showList && (
            <div className="mt-3 space-y-2">
              {signups.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-inter font-medium truncate">{s.user_name || "Udeleženec"}</p>
                  </div>
                  {user?.id === s.user_id && (
                    <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-inter">Jaz</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
