import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, ArrowLeft, Calendar, User, Eye } from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import TagBadge from "../components/TagBadge";
import LikeButton from "../components/LikeButton";
import CommentSection from "../components/CommentSection";
import ImageGallery from "../components/ImageGallery";
import Lightbox from "../components/Lightbox";
import ElevationDivider from "../components/ElevationDivider";
import ClimbMetaCard from "../components/ClimbMetaCard";
import TripSignupButton from "../components/TripSignupButton";

export default function PostDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const bodyRef = useRef(null);
  const [bodyLightbox, setBodyLightbox] = useState({ images: [], index: null });

  // Click-to-enlarge for images inside the post body (rendered via
  // dangerouslySetInnerHTML, so plain <img> tags with no React handlers).
  const handleBodyClick = (e) => {
    const img = e.target.closest("img");
    if (!img || !bodyRef.current?.contains(img)) return;
    if (img.closest("a")) return; // linked images keep their link behavior
    const imgs = [...bodyRef.current.querySelectorAll("img")].filter((el) => !el.closest("a"));
    setBodyLightbox({ images: imgs.map((el) => el.src), index: imgs.indexOf(img) });
  };

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

    if (error || (!isAdmin && (data?.status !== "published" || data?.deleted_at))) {
      console.error("Error loading post:", error);
      setLoading(false);
      return;
    }

    let resolvedPost = { ...data };
    // Resolve the author's CURRENT identity (name + avatar) from their profile,
    // so the post header reflects profile changes rather than the name captured
    // when the post was written.
    if (data.created_by_id) {
      const { data: authorProfile } = await supabase
        .from("profile")
        .select("display_name, avatar_url")
        .eq("id", data.created_by_id)
        .single();
      if (authorProfile) {
        if (authorProfile.display_name) resolvedPost.author_name = authorProfile.display_name;
        resolvedPost.author_avatar = authorProfile.avatar_url || null;
      }
    }
    setPost(resolvedPost);

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
        <p className="font-serif text-lg text-muted-foreground">Objava ni najdena</p>
        <Link to="/" className="text-primary hover:underline font-inter text-sm">← Nazaj na domačo stran</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
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
              {post.author_avatar
                ? <img src={post.author_avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                : <User className="h-4 w-4" />}
              {post.author_name || "Član"}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(new Date(post.created_date), "d. MMMM yyyy", { locale: sl })}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {post.views_count || 0} ogledov
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
          Nazaj na objave
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

        {/* Climb metadata card */}
        {post.climb_metadata && Object.keys(post.climb_metadata).length > 0 && (
          <ClimbMetaCard meta={post.climb_metadata} />
        )}

        {/* Body */}
        <div
          ref={bodyRef}
          onClick={handleBodyClick}
          className="font-serif text-lg leading-[1.65] prose prose-slate dark:prose-invert max-w-none
            prose-headings:font-inter prose-headings:tracking-tight
            prose-h2:text-2xl prose-h3:text-xl
            prose-a:text-primary prose-img:rounded-xl prose-img:cursor-zoom-in"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, {
            ADD_TAGS: ["iframe"],
            ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "src", "width", "height", "data-type", "data-video-type", "data-youtube-id", "controls"],
          }) }}
        />
        <Lightbox
          images={bodyLightbox.images}
          index={bodyLightbox.index}
          onClose={() => setBodyLightbox((s) => ({ ...s, index: null }))}
        />

        {/* Image Gallery */}
        {post.images?.length > 0 && (
          <div className="mt-12">
            <ElevationDivider label="Galerija fotografij" />
            <div className="mt-6">
              <ImageGallery images={post.images} />
            </div>
          </div>
        )}

        {/* Trip signup — only for events category */}
        {post.category === "events" && (
          <div className="mt-12">
            <ElevationDivider label="Prijava na izlet" />
            <div className="mt-6">
              <TripSignupButton postId={post.id} />
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
          <ElevationDivider label="Razprava" />
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