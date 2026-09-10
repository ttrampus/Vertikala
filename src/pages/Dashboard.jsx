import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { softDeletePosts } from "@/lib/deletePosts";
import { thumbUrl, thumbFallback } from "@/lib/thumbs";
import { formatDate } from "@/lib/dates";
import TagBadge from "../components/TagBadge";
import PrivateBadge from "../components/PrivateBadge";
import { Button } from "@/components/ui/button";
import PostToolbar, { NoPostsMessage } from "@/components/PostToolbar";
import { applyPostFilters, EMPTY_FILTERS, hasActiveFilters } from "@/lib/postFilters";
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
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    let alive = true;
    const loadPosts = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("BlogPost")
        .select("id, title, summary, status, category, featured_image, created_date, is_public, likes_count, views_count")
        .eq("created_by_id", user.id)
        .is("deleted_at", null)
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

  const visiblePosts = useMemo(() => applyPostFilters(posts, filters), [posts, filters]);

  // Izbor sledi filtru: kar ni na zaslonu, ne sme pasti pod „Izberi vse“ in
  // tudi ne pod skupinsko brisanje.
  const visibleSelected = useMemo(
    () => visiblePosts.filter((p) => selected.has(p.id)),
    [visiblePosts, selected]
  );

  const deletePost = async (id) => {
    const { error } = await softDeletePosts([id]);
    if (error) return console.error(error);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const bulkDelete = async () => {
    setBulkDeleting(true);
    const ids = visibleSelected.map((p) => p.id);
    const { error } = await softDeletePosts(ids);
    if (error) {
      alert("Brisanje ni uspelo: " + error.message);
    } else {
      const gone = new Set(ids);
      setPosts((prev) => prev.filter((p) => !gone.has(p.id)));
      setSelected(new Set());
    }
    setBulkDeleting(false);
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

      {posts.length > 0 && (
        <PostToolbar
          filters={filters}
          onChange={setFilters}
          shown={visiblePosts.length}
          total={posts.length}
          className="mb-4"
        />
      )}

      {visiblePosts.length > 0 && (
        <div className="flex items-center justify-between mb-4 min-h-9">
          <label className="flex items-center gap-2.5 text-sm text-muted-foreground font-inter cursor-pointer px-4">
            <Checkbox
              checked={visibleSelected.length === visiblePosts.length}
              onCheckedChange={(v) => setSelected(v ? new Set(visiblePosts.map((p) => p.id)) : new Set())}
            />
            {visibleSelected.length > 0 ? `${visibleSelected.length} izbranih` : "Izberi vse"}
          </label>
          {visibleSelected.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5" disabled={bulkDeleting}>
                  {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Izbriši ({visibleSelected.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Izbriši {visibleSelected.length} objav?</AlertDialogTitle>
                  <AlertDialogDescription>Izbrane objave bodo trajno izbrisane. Tega ni mogoče razveljaviti.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Prekliči</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground">Izbriši vse izbrane</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      <div className="space-y-2">
        {visiblePosts.length === 0 && (
          <NoPostsMessage
            filtered={posts.length > 0 && hasActiveFilters(filters)}
            empty="Še nimate objav. Napišite svojo prvo!"
            onReset={() => setFilters({ ...EMPTY_FILTERS })}
          />
        )}

        {visiblePosts.map((post) => (
          <div
            key={post.id}
            className={`flex items-center gap-4 p-4 rounded-xl border bg-card ${selected.has(post.id) ? "border-primary/50" : "border-border"}`}
          >
            <Checkbox
              checked={selected.has(post.id)}
              onCheckedChange={() => toggleSelected(post.id)}
              className="flex-shrink-0"
            />
            {/* Thumbnail */}
            <div className="hidden sm:block w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              {post.featured_image
                ? <img src={thumbUrl(post.featured_image)} onError={(e) => thumbFallback(e, post.featured_image)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
                {post.is_public === false && <PrivateBadge small />}
                <span>{formatDate(post.created_date)}</span>
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