import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { thumbUrl, thumbFallback } from "@/lib/thumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Eye, Users, FileText, Shield, Edit, Mail, UserPlus, ShieldCheck, ShieldOff, CheckCircle2, XCircle, List, Mountain, Plus, RotateCcw, ScrollText } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { softDeletePosts, restorePosts, purgePostsWithImages } from "@/lib/deletePosts";
import TagBadge from "../components/TagBadge";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoadingAuth, isLoadingProfile, user, profile } = useAuth();
  const viewerIsOwner = profile?.is_owner === true; // only the owner manages roles

  const [posts, setPosts] = useState([]);
  const [trashedPosts, setTrashedPosts] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [purgingId, setPurgingId] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bulk post selection
  const [selectedPosts, setSelectedPosts] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  // Ascents
  const [ascents, setAscents] = useState([]);
  const [addingAscent, setAddingAscent] = useState(false);
  const [ascentForm, setAscentForm] = useState({ date: "", climber_name: "", category: "alpinistični", location: "", route_name: "", difficulty: "", altitude: "", notes: "" });
  const [savingAscent, setSavingAscent] = useState(false);

  // All posts, paged past PostgREST's 1000-row cap (586+ after the WP import).
  // Only list columns — `content` across hundreds of posts is megabytes.
  const loadAllPosts = async () => {
    const cols = "id, title, status, featured_image, author_name, author_email, created_by, category, created_date, deleted_at";
    const all = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("BlogPost").select(cols)
        .order("created_date", { ascending: false })
        .range(from, from + 999);
      if (error) { console.error(error); break; }
      all.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return all;
  };

  // Trash older than this is purged for real (rows + images) next time an
  // admin opens the dashboard — the trash is an undo window, not an archive.
  const TRASH_RETENTION_DAYS = 30;

  const loadData = async () => {
    setLoading(true);
    let [allPosts, profilesRes, ascentsRes, auditRes] = await Promise.all([
      loadAllPosts(),
      supabase.from("profile").select("*").order("created_date", { ascending: false }).limit(1000),
      supabase.from("ascents").select("*").order("date", { ascending: false }).limit(500),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expired = allPosts.filter((p) => p.deleted_at && new Date(p.deleted_at).getTime() < cutoff);
    if (expired.length) {
      const { error } = await purgePostsWithImages(expired.map((p) => p.id));
      if (!error) allPosts = allPosts.filter((p) => !expired.includes(p));
    }
    // Split active posts from the trash so a deleted post is recoverable.
    setPosts(allPosts.filter((p) => !p.deleted_at));
    setTrashedPosts(allPosts.filter((p) => p.deleted_at));
    setProfiles(profilesRes.data || []);
    setAscents(ascentsRes.data || []);
    setAuditLog(auditRes.data || []); // empty if the audit migration isn't applied yet
    setLoading(false);
  };

  // Soft delete: move to trash (recoverable), don't destroy.
  const deletePost = async (id) => {
    const { error } = await softDeletePosts([id]);
    if (!error) {
      const moved = posts.find((p) => p.id === id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (moved) setTrashedPosts((prev) => [{ ...moved, deleted_at: new Date().toISOString() }, ...prev]);
      setSelectedPosts((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      console.error("Delete failed:", error.message);
      alert("Brisanje ni uspelo: " + error.message);
    }
  };

  const togglePostSelected = (id) => {
    setSelectedPosts((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const bulkDeletePosts = async () => {
    setBulkDeleting(true);
    const ids = [...selectedPosts];
    const { error } = await softDeletePosts(ids);
    if (!error) {
      const moved = posts.filter((p) => selectedPosts.has(p.id)).map((p) => ({ ...p, deleted_at: new Date().toISOString() }));
      setPosts((prev) => prev.filter((p) => !selectedPosts.has(p.id)));
      setTrashedPosts((prev) => [...moved, ...prev]);
      setSelectedPosts(new Set());
    } else {
      alert("Brisanje ni uspelo: " + error.message);
    }
    setBulkDeleting(false);
  };

  // Restore a post from the trash back to the active list.
  const restorePost = async (id) => {
    const { error } = await restorePosts([id]);
    if (!error) {
      const moved = trashedPosts.find((p) => p.id === id);
      setTrashedPosts((prev) => prev.filter((p) => p.id !== id));
      if (moved) setPosts((prev) => [{ ...moved, deleted_at: null }, ...prev]
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } else {
      alert("Obnovitev ni uspela: " + error.message);
    }
  };

  // Permanent, irreversible delete (also removes images from storage).
  const purgePost = async (id) => {
    setPurgingId(id);
    const { error } = await purgePostsWithImages([id]);
    if (!error) {
      setTrashedPosts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("Trajno brisanje ni uspelo: " + error.message);
    }
    setPurgingId(null);
  };

  const saveAscent = async (e) => {
    e.preventDefault();
    setSavingAscent(true);
    const payload = {
      date: ascentForm.date,
      climber_name: ascentForm.climber_name.trim(),
      category: ascentForm.category,
      location: ascentForm.location.trim() || null,
      route_name: ascentForm.route_name.trim() || null,
      difficulty: ascentForm.difficulty.trim() || null,
      altitude: ascentForm.altitude ? parseInt(ascentForm.altitude) : null,
      notes: ascentForm.notes.trim() || null,
      created_by_id: user.id,
    };
    const { data, error } = await supabase.from("ascents").insert(payload).select().single();
    if (!error && data) {
      setAscents((prev) => [data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setAscentForm({ date: "", climber_name: "", category: "alpinistični", location: "", route_name: "", difficulty: "", altitude: "", notes: "" });
      setAddingAscent(false);
    } else {
      alert("Napaka: " + (error?.message || "Neznana napaka"));
    }
    setSavingAscent(false);
  };

  const deleteAscent = async (id) => {
    const { error } = await supabase.from("ascents").delete().eq("id", id);
    if (!error) {
      setAscents((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert("Brisanje ni uspelo: " + error.message);
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
    // .select() so we can tell an RLS-blocked no-op (0 rows, no error) apart
    // from a real success — otherwise the UI flips then reverts on reload.
    const { data, error } = await supabase
      .from("profile").update({ role: newRole }).eq("id", targetUser.id).select();
    if (!error && data?.length) {
      setProfiles((prev) => prev.map((p) => p.id === targetUser.id ? { ...p, role: newRole } : p));
    } else {
      alert("Spremembe vloge ni bilo mogoče shraniti. Preverite, ali imate skrbniške pravice.");
    }
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
        <TabsList className="max-w-full overflow-x-auto justify-start">
          <TabsTrigger value="posts" className="gap-1 shrink-0 whitespace-nowrap"><FileText className="h-4 w-4" /> Objave</TabsTrigger>
          <TabsTrigger value="users" className="gap-1 shrink-0 whitespace-nowrap"><Users className="h-4 w-4" /> Člani</TabsTrigger>
          <TabsTrigger value="ascents" className="gap-1 shrink-0 whitespace-nowrap"><Mountain className="h-4 w-4" /> Vzponi</TabsTrigger>
          <TabsTrigger value="invite" className="gap-1 shrink-0 whitespace-nowrap"><UserPlus className="h-4 w-4" /> Povabi člana</TabsTrigger>
          <TabsTrigger value="trash" className="gap-1 shrink-0 whitespace-nowrap"><Trash2 className="h-4 w-4" /> Koš{trashedPosts.length > 0 ? ` (${trashedPosts.length})` : ""}</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1 shrink-0 whitespace-nowrap"><ScrollText className="h-4 w-4" /> Dnevnik</TabsTrigger>
        </TabsList>

        {/* POSTS TAB */}
        <TabsContent value="posts" className="mt-6">
          {posts.length > 0 && (
            <div className="flex items-center justify-between mb-4 min-h-9">
              <label className="flex items-center gap-2.5 text-sm text-muted-foreground font-inter cursor-pointer px-4">
                <Checkbox
                  checked={selectedPosts.size === posts.length}
                  onCheckedChange={(v) => setSelectedPosts(v ? new Set(posts.map((p) => p.id)) : new Set())}
                />
                {selectedPosts.size > 0 ? `${selectedPosts.size} izbranih` : "Izberi vse"}
              </label>
              {selectedPosts.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1.5" disabled={bulkDeleting}>
                      {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Izbriši ({selectedPosts.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Premakni {selectedPosts.size} objav v koš?</AlertDialogTitle>
                      <AlertDialogDescription>Objave bodo premaknjene v koš in skrite z javnih strani. Obnovite jih lahko kadarkoli iz zavihka „Koš“.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Prekliči</AlertDialogCancel>
                      <AlertDialogAction onClick={bulkDeletePosts} className="bg-destructive text-destructive-foreground">Izbriši vse izbrane</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
          <div className="space-y-2">
            {posts.length === 0 && <p className="text-muted-foreground text-sm font-inter py-8 text-center">Še ni objav.</p>}
            {posts.map((post) => (
              <div key={post.id} className={`flex items-center gap-4 p-4 rounded-xl border bg-card ${selectedPosts.has(post.id) ? "border-primary/50" : "border-border"}`}>
                <Checkbox
                  checked={selectedPosts.has(post.id)}
                  onCheckedChange={() => togglePostSelected(post.id)}
                  className="flex-shrink-0"
                />
                <div className="hidden sm:block w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  {post.featured_image ? <img src={thumbUrl(post.featured_image)} onError={(e) => thumbFallback(e, post.featured_image)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/post/${post.id}`} className="font-inter font-semibold text-sm line-clamp-2 hover:text-primary block">{post.title}</Link>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    <button
                      onClick={() => togglePostStatus(post)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer flex-shrink-0 ${post.status === "published" ? "bg-green-500/15 text-green-500" : "bg-amber-500/15 text-amber-500"}`}
                    >
                      {post.status === "published" ? "objavljeno" : "osnutek"}
                    </button>
                    <span className="truncate max-w-[45%]">{post.author_name || post.author_email || post.created_by || "—"}</span>
                    {post.category && <TagBadge tag={post.category} small />}
                    <span className="flex-shrink-0">{format(new Date(post.created_date), "d. M. yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
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
                        <AlertDialogTitle>Premakni objavo v koš?</AlertDialogTitle>
                        <AlertDialogDescription>Objava bo skrita z javnih strani, a jo lahko obnovite iz zavihka „Koš“.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Prekliči</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePost(post.id)} className="bg-destructive text-destructive-foreground">V koš</AlertDialogAction>
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
              const isOwner = u.is_owner === true;
              return (
                <div key={u.id} className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{u.display_name?.[0] || "?"}</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-inter font-semibold text-sm break-words">{u.display_name || "Brez imena"}</p>
                        {isMe && <span className="text-[10px] text-muted-foreground font-inter flex-shrink-0">(jaz)</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 pl-[52px] lg:pl-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-inter font-medium ${isOwner ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : isUserAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {isOwner ? "lastnik" : isUserAdmin ? "admin" : "član"}
                    </span>
                    {viewerIsOwner && !isMe && !isOwner && (
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

        {/* ASCENTS TAB */}
        <TabsContent value="ascents" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground font-inter">{ascents.length} vnosov</p>
            <Button size="sm" className="gap-1.5" onClick={() => setAddingAscent((v) => !v)}>
              <Plus className="h-4 w-4" /> Dodaj vzpon
            </Button>
          </div>

          {addingAscent && (
            <form onSubmit={saveAscent} className="p-5 rounded-xl border border-border bg-card mb-4 space-y-3">
              <h3 className="font-inter font-semibold text-sm mb-1">Nov vnos</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground font-inter block mb-1">Datum *</label>
                  <Input type="date" required value={ascentForm.date} onChange={(e) => setAscentForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground font-inter block mb-1">Plezalec *</label>
                  <Input required placeholder="Ime Priimek" value={ascentForm.climber_name} onChange={(e) => setAscentForm((f) => ({ ...f, climber_name: e.target.value }))} />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground font-inter block mb-1">Kategorija *</label>
                  <select
                    value={ascentForm.category}
                    onChange={(e) => setAscentForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-inter"
                  >
                    <option value="alpinistični">Alpinistični vzponi</option>
                    <option value="športnoplezalni">Športnoplezalni vzponi</option>
                    <option value="turni">Turni in smuki</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground font-inter block mb-1">Lokacija</label>
                  <Input placeholder="Mont Blanc, Stovc…" value={ascentForm.location} onChange={(e) => setAscentForm((f) => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-xs text-muted-foreground font-inter block mb-1">Smer</label>
                  <Input placeholder="Trois Monts route, Botoks…" value={ascentForm.route_name} onChange={(e) => setAscentForm((f) => ({ ...f, route_name: e.target.value }))} />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground font-inter block mb-1">Težavnost</label>
                  <Input placeholder="7a+, TD-, D+/5c…" value={ascentForm.difficulty} onChange={(e) => setAscentForm((f) => ({ ...f, difficulty: e.target.value }))} />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground font-inter block mb-1">Višina (m)</label>
                  <Input type="number" placeholder="4808" value={ascentForm.altitude} onChange={(e) => setAscentForm((f) => ({ ...f, altitude: e.target.value }))} />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-xs text-muted-foreground font-inter block mb-1">Opomba</label>
                  <Input placeholder="Neobvezno…" value={ascentForm.notes} onChange={(e) => setAscentForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={savingAscent} className="gap-1.5">
                  {savingAscent && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Shrani
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAddingAscent(false)}>Prekliči</Button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {ascents.length === 0 && <p className="text-muted-foreground text-sm font-inter py-8 text-center">Še ni vnosov.</p>}
            {ascents.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="flex-shrink-0 w-16 text-xs font-inter text-primary font-semibold">{a.date}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-inter font-semibold text-sm">{a.climber_name}</span>
                    {a.location && <span className="text-sm text-muted-foreground truncate">{a.location}{a.route_name ? ` — ${a.route_name}` : ""}</span>}
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-inter px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {a.category === "alpinistični" ? "Alpinistični" : a.category === "športnoplezalni" ? "Športnoplezalni" : "Turni"}
                    </span>
                    {a.difficulty && <span className="text-[10px] font-inter px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{a.difficulty}</span>}
                    {a.altitude && <span className="text-[10px] font-inter px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a.altitude} m</span>}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Izbriši vnos?</AlertDialogTitle>
                      <AlertDialogDescription>{a.climber_name} — {a.location || a.route_name}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Prekliči</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteAscent(a.id)} className="bg-destructive text-destructive-foreground">Izbriši</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
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

        {/* TRASH TAB */}
        <TabsContent value="trash" className="mt-6">
          <p className="text-sm text-muted-foreground font-inter mb-4">
            Izbrisane objave ostanejo tu (skrite z javnih strani). Obnovite jih z enim klikom ali jih trajno izbrišite.
            Po {TRASH_RETENTION_DAYS} dneh se objave iz koša samodejno trajno izbrišejo, skupaj s slikami.
          </p>
          <div className="space-y-2">
            {trashedPosts.length === 0 && (
              <p className="text-muted-foreground text-sm font-inter py-8 text-center">Koš je prazen.</p>
            )}
            {trashedPosts.map((post) => (
              <div key={post.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="hidden sm:block w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 opacity-60">
                  {post.featured_image ? <img src={thumbUrl(post.featured_image)} onError={(e) => thumbFallback(e, post.featured_image)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-inter font-semibold text-sm line-clamp-2 text-muted-foreground">{post.title}</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    {post.category && <TagBadge tag={post.category} small />}
                    <span>izbrisano {format(new Date(post.deleted_at), "d. M. yyyy HH:mm")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => restorePost(post.id)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Obnovi
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={purgingId === post.id}>
                        {purgingId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Trajno izbriši objavo?</AlertDialogTitle>
                        <AlertDialogDescription>Objava in njene slike bodo dokončno izbrisane. Tega ni mogoče razveljaviti.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Prekliči</AlertDialogCancel>
                        <AlertDialogAction onClick={() => purgePost(post.id)} className="bg-destructive text-destructive-foreground">Trajno izbriši</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* AUDIT LOG TAB */}
        <TabsContent value="audit" className="mt-6">
          <p className="text-sm text-muted-foreground font-inter mb-4">
            Zapis pomembnih dejanj: brisanje in obnovitev objav ter spremembe vlog članov — z avtorjem in časom.
          </p>
          <div className="space-y-2">
            {auditLog.length === 0 && (
              <p className="text-muted-foreground text-sm font-inter py-8 text-center">Ni zabeleženih dejanj.</p>
            )}
            {auditLog.map((e) => {
              const labels = {
                post_deleted: "Objava premaknjena v koš",
                post_restored: "Objava obnovljena",
                post_purged: "Objava trajno izbrisana",
                role_change: "Sprememba vloge",
              };
              const actor = profiles.find((p) => p.id === e.actor_id)?.display_name || "sistem";
              return (
                <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-inter font-medium">{labels[e.action] || e.action}</span>
                    {e.summary && <span className="text-muted-foreground"> — „{e.summary}“</span>}
                    {e.action === "role_change" && e.details && (
                      <span className="text-muted-foreground"> ({e.details.from} → {e.details.to})</span>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {actor} · {format(new Date(e.created_at), "d. M. yyyy HH:mm")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
