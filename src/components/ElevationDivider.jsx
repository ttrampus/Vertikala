export default function ElevationDivider({ label }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-border" />
      {label && (
        <span className="text-[10px] font-inter font-medium tracking-[0.2em] uppercase text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}