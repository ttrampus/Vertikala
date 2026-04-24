const categories = ["all", "climbs", "trips", "events", "gear", "training", "news"];

export default function CategoryFilter({ selected, onSelect }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat === "all" ? "" : cat)}
          className={`px-4 py-2 rounded-full text-sm font-inter font-medium whitespace-nowrap transition-all ${
            (cat === "all" && !selected) || selected === cat
              ? "bg-foreground text-background"
              : "bg-card text-muted-foreground hover:bg-accent border border-border"
          }`}
        >
          {cat === "all" ? "All Posts" : cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
      ))}
    </div>
  );
}