import { Lock } from "lucide-react";

// Marks a post/ascent as visible to logged-in members only, not the public.
// Matches the pill treatment already used for post categories (TagBadge).
export default function PrivateBadge({ small = false }) {
  return (
    <span
      title="Vidno samo prijavljenim članom"
      className={`inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground font-inter font-medium flex-shrink-0 ${
        small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      <Lock className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />
      Zasebno
    </span>
  );
}
