const categoryColors = {
  climbs: "bg-blue-500/10 text-blue-600 border-blue-200",
  trips: "bg-green-500/10 text-green-600 border-green-200",
  events: "bg-purple-500/10 text-purple-600 border-purple-200",
  gear: "bg-amber-500/10 text-amber-600 border-amber-200",
  training: "bg-red-500/10 text-red-600 border-red-200",
  news: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
};

export default function TagBadge({ tag, small = false }) {
  const colors = categoryColors[tag] || "bg-muted text-muted-foreground border-border";
  
  return (
    <span className={`inline-flex items-center rounded-full border font-inter font-medium capitalize ${colors} ${
      small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
    }`}>
      {tag}
    </span>
  );
}