import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function LikeButton({ postId, initialCount = 0, onCountChange }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (!user) return;
    const checkLike = async () => {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single();
      setLiked(!!data);
    };
    checkLike();
  }, [postId, user]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const toggleLike = async () => {
    if (!user) return;

    if (liked) {
      await supabase.from("likes").delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      const newCount = Math.max(0, count - 1);
      setCount(newCount);
      setLiked(false);
      await supabase.from("BlogPost").update({ likes_count: newCount }).eq("id", postId);
      onCountChange?.(newCount);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
      const newCount = count + 1;
      setCount(newCount);
      setLiked(true);
      await supabase.from("BlogPost").update({ likes_count: newCount }).eq("id", postId);
      onCountChange?.(newCount);
    }
  };

  return (
    <button
      onClick={toggleLike}
      disabled={!user}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 ${
        liked
          ? "bg-red-500/10 border-red-500/30 text-red-500"
          : "bg-card border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30"
      } ${!user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <motion.div
        whileTap={{ scale: 1.3 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
      </motion.div>
      <span className="text-sm font-inter font-medium">{count}</span>
    </button>
  );
}