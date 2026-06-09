import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import TagBadge from "../components/TagBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadPosts = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("BlogPost")
        .select("id, title, status, category, featured_image, created_date")
        .eq("created_by_id", user.id)
        .order("created_date", { ascending: false })
        .limit(100);
      if (!alive) return;
      if (error) { console.error(error); setLoading(false); return; }
      setPosts(data || []);
      setLoading(false);
    };
    if (!isLoadingAuth && user?.id) loadPosts();
    return () => { alive = false; };
  }, [isLoadingAuth, user?.id]);

  const deletePost = async (id) => {
    const { error } = await supabase.from("BlogPost").delete().eq("id", id);
    if (error) return console.error(error);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  if (isLoadingAuth || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 py-8 lg:py-16 pt-24 lg:pt-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tighter">Moje objave</h1>
        <Button onClick={() => navigate("/create")}>+ Nova objava</Button>
      </div>

      <div className="space-y-2">
        {posts.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Še nimate objav. Napišite svojo prvo!
          </p>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
          >
            {/* Thumbnail */}
            <div className="hidden sm:block w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              {post.featured_image
                ? <img src={post.featured_image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-muted" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link
                  to={`/post/${post.id}`}
                  className="font-inter font-semibold text-sm truncate hover:text-primary"
                >
                  {post.title}
                </Link>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    post.status === "published"
                      ? "bg-green-500/15 text-green-500"
                      : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {post.status === "published" ? "Objavljeno" : post.status === "draft" ? "Osnutek" : post.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {post.category && <TagBadge tag={post.category} small />}
                <span>{format(new Date(post.created_date), "d. MMM yyyy", { locale: sl })}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate(`/edit/${post.id}`)}
              >
                <Edit className="h-4 w-4" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Izbriši to objavo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      To bo trajno odstranilo objavo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Prekliči</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deletePost(post.id)}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Izbriši
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}