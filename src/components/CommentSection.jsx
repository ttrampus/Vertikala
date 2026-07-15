import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sl } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function CommentSection({ postId, onCountChange }) {
  const { user, profile, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [authors, setAuthors] = useState({}); // { author_id: { display_name, avatar_url } }
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    // Explicit column list — never fetch author_email to the browser (it is PII
    // and not needed for display; names/avatars are read live from profile).
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, content, author_id, author_name, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) console.error("Error loading comments:", error);
    const list = data || [];
    setComments(list);

    // Fetch the current identity (name + avatar) of each comment author so
    // comments always reflect the latest profile, not the name stored at the
    // time the comment was written.
    const ids = [...new Set(list.map((c) => c.author_id).filter(Boolean))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profile")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const map = {};
      (profs || []).forEach((p) => { map[p.id] = p; });
      setAuthors(map);
    } else {
      setAuthors({});
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() || !isAuthenticated) return;
    setSubmitting(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      content: content.trim(),
      author_id: user.id,
      author_name: profile?.display_name || user.email,
      author_email: user.email,
    });

    if (error) {
      console.error("Error posting comment:", error);
      setSubmitting(false);
      return;
    }

    const newCount = comments.length + 1;
    await supabase
      .from("BlogPost")
      .update({ comments_count: newCount })
      .eq("id", postId);
    onCountChange?.(newCount);

    setContent("");
    setSubmitting(false);
    loadComments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-foreground" />
        <h3 className="font-inter font-bold text-lg">Komentarji ({comments.length})</h3>
      </div>

      {isAuthenticated ? (
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Delite svoje mnenje…"
            className="min-h-[100px] font-serif resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Komentiraj
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground font-serif text-sm">
          Za komentiranje se prijavite.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-muted-foreground font-serif py-8">
          Še ni komentarjev. Bodite prvi, ki podelite svoje mnenje.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const prof = authors[comment.author_id];
            const displayName = prof?.display_name || comment.author_name;
            const avatar = prof?.avatar_url;
            return (
              <div key={comment.id} className="border border-border rounded-xl p-4 bg-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {avatar
                      ? <img src={avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      : (displayName?.[0]?.toUpperCase() || "?")}
                  </div>
                  <div>
                    <span className="font-inter font-semibold text-sm">{displayName}</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: sl })}
                    </span>
                  </div>
                </div>
                <p className="font-serif text-sm leading-relaxed text-foreground/90 pl-11">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
