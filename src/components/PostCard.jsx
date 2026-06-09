import { Link } from "react-router-dom";
import { Heart, MessageCircle, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import TagBadge from "./TagBadge";

export default function PostCard({ post, featured = false }) {
  if (featured) {
    return (
      <Link to={`/post/${post.id}`} className="group block relative overflow-hidden rounded-2xl">
        <div className="aspect-[16/9] lg:aspect-[21/9] overflow-hidden">
          {post.featured_image ? (
            <img
              src={post.featured_image}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-accent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
          <div className="flex items-center gap-3 mb-3">
            {post.category && <TagBadge tag={post.category} />}
            <span className="text-white/70 text-sm flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(post.created_date), "MMM d, yyyy")}
            </span>
          </div>
          <h2 className="font-inter font-extrabold text-2xl lg:text-4xl text-white leading-tight mb-2 tracking-tight">
            {post.title}
          </h2>
          {post.summary && (
            <p className="font-serif text-white/80 text-base lg:text-lg max-w-2xl line-clamp-2 leading-relaxed">
              {post.summary}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 text-white/60 text-sm">
            <span className="font-medium text-white/80">{post.author_name || "Član"}</span>
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{post.likes_count || 0}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{post.comments_count || 0}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/post/${post.id}`} className="group block">
      <div className="overflow-hidden rounded-xl mb-4">
        {post.featured_image ? (
          <img
            src={post.featured_image}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-muted to-accent" />
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        {post.category && <TagBadge tag={post.category} small />}
        <span className="text-muted-foreground text-xs">
          {format(new Date(post.created_date), "MMM d, yyyy")}
        </span>
      </div>
      <h3 className="font-inter font-bold text-lg leading-snug mb-1.5 group-hover:text-primary transition-colors tracking-tight">
        {post.title}
      </h3>
      {post.summary && (
        <p className="font-serif text-muted-foreground text-sm line-clamp-2 leading-relaxed">
          {post.summary}
        </p>
      )}
      <div className="flex items-center gap-3 mt-3 text-muted-foreground text-xs">
        <span className="font-medium text-foreground/80">{post.author_name || "Član"}</span>
        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes_count || 0}</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comments_count || 0}</span>
      </div>
    </Link>
  );
}