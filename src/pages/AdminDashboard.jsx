import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Eye, Users, FileText, Shield, Edit, Mail, UserPlus, ShieldCheck, ShieldOff, CheckCircle2, XCircle, List } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TagBadge from "../components/TagBadge";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoadingAuth, isLoadingProfile, user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Single invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  // Bulk invite
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { sent, total, results: [{email, ok, msg}] }

  const [togglingRole, setTogglingRole] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [postsRes, profilesRes] = await Promise.all([
      supabase.from("BlogPost").select("*").order("created_date", { ascending: false }).limit(200),
      supabase.from("profile").select("*").order("created_date", { ascending: false }).limit(200),
    ]);
    setPosts(postsRes.data || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  const deletePost = async (id) => {
    const { error, count } = await supabase
      .from("BlogPost")
      .delete({ count: "exact" })
      .eq("id", id);
    if (!error && count > 0) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } else {
      console.error("Delete failed:", error?.message || "RLS policy blocked the delete — run the admin delete policy SQL in Supabase.");
    }
  };

  const togglePostStatus = async (post) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("BlogPost").update({ status: newStatus }).eq("id", post.id);
    if (!error) setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: newStatus } : p)));
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const { error } = await supabase.functions.invoke("invite-user", {
        body: {
          email,
          redirectTo: `${window.location.origin}/complete-profile`,
        },
      });
      if (error) throw new Error(error.message || "Napaka pri pošiljanju povabila.");
      setInviteResult({ ok: true, msg: `Povabilo je bilo poslano na ${email}.` });
      setInviteEmail("");
    } catch (err) {
      setInviteResult({ ok: false, msg: err.message });
    } finally {
      setInviting(false);
    }
  };

  const sendBulkInvites = async () => {
    const emails = bulkText
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) return;

    setBulkRunning(true);
    setBulkProgress({ sent: 0, total: emails.length, results: [] });

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      let ok = false;
      let msg = "";
      try {
        const { error } = await supabase.functions.invoke("invite-user", {
          body: { email, redirectTo: `${window.location.origin}/complete-profile` },
        });
        if (error) throw new Error(error.message || "Napaka");
        ok = true;
        msg = "Poslano";
      } catch (err) {
        msg = err.message.includes("already") ? "Že registriran" : err.message;
      }
      setBulkProgress((prev) => ({
        sent: i + 1,
        total: emails.length,
        results: [...prev.results, { email, ok, msg }],
      }));
      // Small delay to avoid hammering the API
      if (i < emails.length - 1) await new Promise((r) => setTimeout(r, 300));
    }

    setBulkRunning(false);
  };

  const toggleAdminRole = async (targetUser) => {
    if (targetUser.id === user.id) return; // can't change your own role
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    setTogglingRole(targetUser.id);
    const { error } = await supabase.from("profile").update({ role: newRole }).eq("id", targetUser.id);
    if (!error) setProfiles((prev) => prev.map((p) => p.id === targetUser.id ? { ...p, role: newRole } : p));
    setTogglingRole(null);
  };

  useEffect(() => {
    if (isLoadingAuth || isLoadingProfile) return;
    if (!user) { navigate("/login"); return; }
    if (!isAdmin) { navigate("/"); return; }
    loadData();
  }, [isAdmin, isLoadingAuth, isLoadingProfile, user]);

  if (isLoadingAuth || isLoadingProfile || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-6 py-8 lg:py-16 pt-24 lg:pt-24">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-inter font-extrabold text-3xl tracking-tighter">Admin</h1>
        </div>
        <p className="text-muted-foreground text-sm font-inter">Upravljanje objav, članov in povabil</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Skupaj objav", value: posts.length, icon: FileText },
          { label: "Objavljeno", value: posts.filter((p) => p.status === "published").length, icon: Eye },
          { label: "Osnutki", value: posts.filter((p) => p.status === "draft").length, icon: FileText },
          { label: "Člani", value: profiles.length, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-inter font-medium">{label}</span>
            </div>
            <p className="text-2xl font-inter font-bold">{value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts" className="gap-1"><FileText className="h-4 w-4" /> Objave</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" /> Člani</TabsTrigger>
          <TabsTrigger value="invite" className="gap-1"><UserPlus className="h-4 w-4" /> Povabi člana</TabsTrigger>
        </TabsList>

        {/* POSTS TAB */}
        <TabsContent value="posts" className="mt-6">
          <div className="space-y-2">
            {posts.length === 0 && <p className="text-muted-foreground text-sm font-inter py-8 text-center">Še ni objav.</p>}
            {posts.map((post) => (
              <div key={post.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="hidden sm:block w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  {post.featured_image ? <img src={post.featured_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link to={`/post/${post.id}`} className="font-inter font-semibold text-sm truncate hover:text-primary">{post.title}</Link>
                    <button
                      onClick={() => togglePostStatus(post)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer ${post.status === "published" ? "bg-green-500/15 text-green-500" : "bg-amber-500/15 text-amber-500"}`}
                    >
                      {post.status === "published" ? "objavljeno" : "osnutek"}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{post.author_name || post.author_email || post.created_by || "—"}</span>
                    {post.category && <TagBadge tag={post.category} small />}
                    <span>{format(new Date(post.created_date), "d. M. yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/edit/${post.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Izbriši objavo?</AlertDialogTitle>
                        <AlertDialogDescription>Objava bo trajno izbrisana.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Prekliči</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePost(post.id)} className="bg-destructive text-destructive-foreground">Izbriši</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="mt-6">
          <div className="space-y-2">
            {profiles.length === 0 && <p className="text-muted-foreground text-sm font-inter py-8 text-center">Ni registriranih članov.</p>}
            {profiles.map((u) => {
              const isMe = u.id === user.id;
              const isUserAdmin = u.role === "admin";
              return (
                <div key={u.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{u.display_name?.[0] || "?"}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-inter font-semibold text-sm truncate">{u.display_name || "Brez imena"}</p>
                      {isMe && <span className="text-[10px] text-muted-foreground font-inter">(jaz)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-inter font-medium ${isUserAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {isUserAdmin ? "admin" : "član"}
                    </span>
                    {!isMe && (
                      <Button
                        variant="ghost" size="sm"
                        className={`h-8 gap-1.5 text-xs ${isUserAdmin ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-primary"}`}
                        disabled={togglingRole === u.id}
                        onClick={() => toggleAdminRole(u)}
                        title={isUserAdmin ? "Odvzemi admin pravice" : "Dodeli admin pravice"}
                      >
                        {togglingRole === u.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : isUserAdmin
                            ? <><ShieldOff className="h-3.5 w-3.5" /> Odvzemi</>
                            : <><ShieldCheck className="h-3.5 w-3.5" /> Naredi admina</>
                        }
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* INVITE TAB */}
        <TabsContent value="invite" className="mt-6">
          <div className="max-w-xl">

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-5 w-fit">
              <button
                onClick={() => { setBulkMode(false); setBulkProgress(null); }}
                className={`px-4 py-1.5 rounded-md text-sm font-inter font-medium transition-colors ${!bulkMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Posamezno
              </button>
              <button
                onClick={() => { setBulkMode(true); setInviteResult(null); }}
                className={`px-4 py-1.5 rounded-md text-sm font-inter font-medium transition-colors flex items-center gap-1.5 ${bulkMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-3.5 w-3.5" /> Množično
              </button>
            </div>

            {!bulkMode ? (
              /* ── Single invite ── */
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-inter font-semibold text-base mb-1">Povabi člana</h3>
                <p className="text-sm text-muted-foreground font-inter mb-5">
                  Vnesite e-poštni naslov. Član bo prejel e-pošto s povabilno povezavo.
                </p>
                {inviteResult && (
                  <div className={`mb-4 p-3 rounded-lg text-sm font-inter flex items-center gap-2 ${inviteResult.ok ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                    {inviteResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                    {inviteResult.msg}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteResult(null); setInviteEmail(e.target.value); }}
                    onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                    placeholder="clan@email.com"
                    className="flex-1"
                  />
                  <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2 shrink-0">
                    {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Pošlji
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Bulk invite ── */
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-inter font-semibold text-base mb-1">Množično povabilo</h3>
                <p className="text-sm text-muted-foreground font-inter mb-4">
                  Prilepite e-poštne naslove — vsak v svojo vrstico ali ločene z vejico.
                </p>

                {!bulkProgress ? (
                  <>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={"jan.novak@email.com\nana.kovac@email.com\npeter.kos@email.com"}
                      rows={8}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-inter resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                    />
                    {bulkText.trim() && (
                      <p className="text-xs text-muted-foreground font-inter mt-1.5">
                        {bulkText.split(/[\n,;]+/).map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length} veljavnih naslovov
                      </p>
                    )}
                    <Button
                      onClick={sendBulkInvites}
                      disabled={bulkRunning || !bulkText.trim()}
                      className="mt-4 gap-2 w-full"
                    >
                      <Mail className="h-4 w-4" />
                      Pošlji povabila vsem
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-inter text-muted-foreground mb-1.5">
                        <span>{bulkRunning ? "Pošiljam..." : "Končano"}</span>
                        <span>{bulkProgress.sent} / {bulkProgress.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Results list */}
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {bulkProgress.results.map((r) => (
                        <div key={r.email} className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm font-inter">
                          {r.ok
                            ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                          <span className="flex-1 truncate text-foreground">{r.email}</span>
                          <span className={`text-xs shrink-0 ${r.ok ? "text-green-500" : "text-destructive"}`}>{r.msg}</span>
                        </div>
                      ))}
                      {bulkRunning && bulkProgress.sent < bulkProgress.total && (
                        <div className="flex items-center gap-2 py-1.5 px-2 text-sm text-muted-foreground font-inter">
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          <span>Čakam…</span>
                        </div>
                      )}
                    </div>

                    {!bulkRunning && (
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => { setBulkProgress(null); setBulkText(""); }}>
                        Novo množično povabilo
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
