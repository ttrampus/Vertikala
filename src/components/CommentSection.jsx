import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import moment from "moment";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function CommentSection({ postId, onCountChange }) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) console.error("Error loading comments:", error);
    setComments(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() || !isAuthenticated) return;
    setSubmitting(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      content: content.trim(),
      author_id: user.id,
      author_name: user.display_name || user.user_metadata?.full_name || user.email,
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
        <h3 className="font-inter font-bold text-lg">Comments ({comments.length})</h3>
      </div>

      {isAuthenticated ? (
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            className="min-h-[100px] font-serif resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Comment
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground font-serif text-sm">
          Log in to leave a comment.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-muted-foreground font-serif py-8">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {comment.author_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <span className="font-inter font-semibold text-sm">{comment.author_name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {moment(comment.created_at).fromNow()}
                  </span>
                </div>
              </div>
              <p className="font-serif text-sm leading-relaxed text-foreground/90 pl-11">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}