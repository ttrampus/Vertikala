import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft, Calendar, User, Eye } from "lucide-react";
import moment from "moment";
import TagBadge from "../components/TagBadge";
import LikeButton from "../components/LikeButton";
import CommentSection from "../components/CommentSection";
import ImageGallery from "../components/ImageGallery";
import ElevationDivider from "../components/ElevationDivider";

export default function PostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("BlogPost")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading post:", error);
      setLoading(false);
      return;
    }

    setPost(data);

    // Increment view count
    await supabase
      .from("BlogPost")
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq("id", id);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="font-serif text-lg text-muted-foreground">Post not found</p>
        <Link to="/" className="text-primary hover:underline font-inter text-sm">← Back to home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-10 pb-8">
          {post.category && (
            <div className="mb-3">
              <TagBadge tag={post.category} />
            </div>
          )}
          <h1 className="font-inter font-extrabold text-3xl lg:text-4xl tracking-tighter leading-tight mb-3">
            {post.title}
          </h1>
          {post.summary && (
            <p className="font-serif text-muted-foreground text-lg leading-relaxed mb-4">
              {post.summary}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 font-inter font-medium text-foreground/80">
              <User className="h-4 w-4" />
              {post.author_name || "Member"}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {moment(post.created_date).format("MMMM D, YYYY")}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {post.views_count || 0} views
            </span>
          </div>
        </div>

        {post.featured_image && (
          <div className="max-w-3xl mx-auto px-6 lg:px-8 pb-8">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full rounded-xl object-cover max-h-80"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to posts
        </Link>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-inter"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <div
          className="font-serif text-lg leading-[1.65] prose prose-slate max-w-none
            prose-headings:font-inter prose-headings:tracking-tight
            prose-h2:text-2xl prose-h3:text-xl
            prose-a:text-primary prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Image Gallery */}
        {post.images?.length > 0 && (
          <div className="mt-12">
            <ElevationDivider label="Photo Gallery" />
            <div className="mt-6">
              <ImageGallery images={post.images} />
            </div>
          </div>
        )}

        {/* Like */}
        <div className="mt-12 flex justify-center">
          <LikeButton
            postId={post.id}
            initialCount={post.likes_count || 0}
            onCountChange={(c) => setPost((prev) => ({ ...prev, likes_count: c }))}
          />
        </div>

        {/* Comments */}
        <div className="mt-12">
          <ElevationDivider label="Discussion" />
          <div className="mt-8">
            <CommentSection
              postId={post.id}
              onCountChange={(c) => setPost((prev) => ({ ...prev, comments_count: c }))}
            />
          </div>
        </div>
      </article>
    </div>
  );
}