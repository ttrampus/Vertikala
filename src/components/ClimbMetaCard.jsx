import { Mountain, Clock, Ruler, TrendingUp, MapPin, Navigation } from "lucide-react";

const CONDITIONS_LABEL = {
  excellent: { label: "Odlični", color: "text-green-500", bg: "bg-green-500/10" },
  good: { label: "Dobri", color: "text-blue-500", bg: "bg-blue-500/10" },
  demanding: { label: "Zahtevni", color: "text-amber-500", bg: "bg-amber-500/10" },
  dangerous: { label: "Nevarni", color: "text-red-500", bg: "bg-red-500/10" },
};

function StatCell({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-inter">{label}</span>
      </div>
      <span className={`font-inter font-bold text-sm ${accent || "text-foreground"}`}>{value}</span>
    </div>
  );
}

export default function ClimbMetaCard({ meta }) {
  if (!meta || Object.keys(meta).length === 0) return null;

  const cond = CONDITIONS_LABEL[meta.conditions];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-5">
        <Mountain className="h-5 w-5 text-primary" />
        <h3 className="font-inter font-bold text-base">Podatki o vzponu</h3>
        {cond && (
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-inter font-semibold ${cond.bg} ${cond.color}`}>
            {cond.label} pogoji
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {meta.peak && (
          <StatCell icon={Mountain} label="Vrh" value={meta.peak} accent="text-primary" />
        )}
        {meta.elevation_m && (
          <StatCell icon={TrendingUp} label="Nadmorska višina" value={`${meta.elevation_m} m`} />
        )}
        {meta.grade && (
          <StatCell icon={Navigation} label="Težavnost" value={meta.grade} />
        )}
        {meta.duration_h && (
          <StatCell icon={Clock} label="Čas vzpona" value={`${meta.duration_h} h`} />
        )}
        {meta.distance_km && (
          <StatCell icon={Ruler} label="Razdalja" value={`${meta.distance_km} km`} />
        )}
        {meta.route_name && (
          <StatCell icon={Navigation} label="Smer" value={meta.route_name} />
        )}
        {meta.start_point && (
          <StatCell icon={MapPin} label="Izhodišče" value={meta.start_point} />
        )}
      </div>
    </div>
  );
}
