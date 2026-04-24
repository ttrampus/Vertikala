import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Eye, Users, FileText, Shield, Edit } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import moment from "moment";
import TagBadge from "../components/TagBadge";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoadingAuth, isLoadingProfile, user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);


  const loadData = async () => {
    setLoading(true);

    const { data: postsData, error: postsError } = await supabase
      .from("BlogPost")
      .select("*")
      .order("created_date", { ascending: false })
      .limit(200);
    if (postsError) console.error("Posts error:", postsError);

    const { data: profilesData, error: profilesError } = await supabase
      .from("profile")
      .select("*")
      .order("created_date", { ascending: false })
      .limit(200);
    if (profilesError) console.error("Profiles error:", profilesError);

    setPosts(postsData || []);
    setProfiles(profilesData || []);
    setLoading(false);
  };

  const deletePost = async (id) => {
    const { error } = await supabase.from("BlogPost").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const togglePostStatus = async (post) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("BlogPost")
      .update({ status: newStatus })
      .eq("id", post.id);
    if (!error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: newStatus } : p))
      );
    }
  };
console.log("AdminDashboard render:", { isLoadingAuth, isLoadingProfile, user: user?.id, isAdmin });
  // ✅ Auth guard — only runs after both auth AND profile have loaded
  useEffect(() => {
    if (isLoadingAuth || isLoadingProfile) return;
    if (!user) { navigate("/login"); return; }
    if (!isAdmin) { navigate("/"); return; }
    loadData();
  }, [isAdmin, isLoadingAuth, isLoadingProfile, user]);

  // ✅ Single loading check, AFTER all function definitions
  if (isLoadingAuth || isLoadingProfile || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-6 py-8 lg:py-16">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-inter font-extrabold text-3xl tracking-tighter">
            Admin Dashboard
          </h1>
        </div>
        <p className="text-muted-foreground text-sm font-inter">
          Manage all posts and users
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Posts", value: posts.length, icon: FileText },
          { label: "Published", value: posts.filter((p) => p.status === "published").length, icon: Eye },
          { label: "Drafts", value: posts.filter((p) => p.status === "draft").length, icon: FileText },
          { label: "Members", value: profiles.length, icon: Users },
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
          <TabsTrigger value="posts" className="gap-1">
            <FileText className="h-4 w-4" /> Posts
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
        </TabsList>

        {/* POSTS TAB */}
        <TabsContent value="posts" className="mt-6">
          <div className="space-y-2">
            {posts.length === 0 && (
              <p className="text-muted-foreground text-sm font-inter py-8 text-center">
                No posts yet.
              </p>
            )}
            {posts.map((post) => (
              <div key={post.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="hidden sm:block w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  {post.featured_image
                    ? <img src={post.featured_image} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-muted" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link
                      to={`/post/${post.id}`}
                      className="font-inter font-semibold text-sm truncate hover:text-primary"
                    >
                      {post.title}
                    </Link>
                    <button
                      onClick={() => togglePostStatus(post)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer ${
                        post.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {post.status}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{post.author_email || post.created_by || "Unknown"}</span>
                    {post.category && <TagBadge tag={post.category} small />}
                    <span>{moment(post.created_date).format("MMM D, YYYY")}</span>
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
                        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove the post.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePost(post.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
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
            {profiles.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {u.display_name?.[0] || "?"}
                      </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter font-semibold text-sm truncate">{u.display_name || "No name"}</p>
                  <p className="text-xs text-muted-foreground">{u.id}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-inter font-medium ${
                  u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {u.role || "user"}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}