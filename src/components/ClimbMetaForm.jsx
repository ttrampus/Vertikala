import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mountain } from "lucide-react";

const CONDITIONS = [
  { value: "excellent", label: "Odlični" },
  { value: "good", label: "Dobri" },
  { value: "demanding", label: "Zahtevni" },
  { value: "dangerous", label: "Nevarni" },
];

export default function ClimbMetaForm({ value = {}, onChange }) {
  const update = (field, val) => onChange({ ...value, [field]: val });

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Mountain className="h-4 w-4 text-primary" />
        <h3 className="font-inter font-semibold text-sm">Podatki o vzponu</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-inter font-medium text-muted-foreground mb-1.5">
            Vrh / cilj
          </label>
          <Input
            value={value.peak || ""}
            onChange={(e) => update("peak", e.target.value)}
            placeholder="npr. Triglav"
          />
        </div>

        <div>
          <label className="block text-xs font-inter font-medium text-muted-foreground mb-1.5">
            Nadmorska višina (m)
          </label>
          <Input
            type="number"
            value={value.elevation_m || ""}
            onChange={(e) => update("elevation_m", e.target.value ? Number(e.target.value) : "")}
            placeholder="npr. 2864"
          />
        </div>

        <div>
          <label className="block text-xs font-inter font-medium text-muted-foreground mb-1.5">
            Ime smeri
          </label>
          <Input
            value={value.route_name || ""}
            onChange={(e) => update("route_name", e.target.value)}
            placeholder="npr. Slovenska smer"
          />
        </div>

        <div>
          <label className="block text-xs font-inter font-medium text-muted-foreground mb-1.5">
            Izhodišče
          </label>
          <Input
            value={value.start_point || ""}
            onChange={(e) => update("start_point", e.target.value)}
            placeholder="npr. Dom na Kredarici"
          />
        </div>

        <div>
          <label className="block text-xs font-inter font-medium text-muted-foreground mb-1.5">
            Ocena težavnosti
          </label>
          <Input
            value={value.grade || ""}
            onChange={(e) => update("grade", e.target.value)}
            placeholder="npr. UIAA III, AD, F"
          />
        </div>

        <div>
          <label className="block text-xs font-inter font-medium text-muted-foreground mb-1.5">
            Čas vzpona (ure)
          </label>
          <Input
            type="number"
            step="0.5"
            value={value.duration_h || ""}
            onChange={(e) => update("duration_h", e.target.value ? Number(e.target.value) : "")}
            placeholder="npr. 4.5"
          />
        </div>

        <div>
          <label className="block text-xs font-inter font-medium text-muted-foreground mb-1.5">
            Razdalja (km)
          </label>
          <Input
            type="number"
            step="0.1"
            value={value.distance_km || ""}
            onChange={(e) => update("distance_km", e.target.value ? Number(e.target.value) : "")}
            placeholder="npr. 12"
          />
        </div>

        <div>
          <label className="block text-xs font-inter font-medium text-muted-foreground mb-1.5">
            Pogoji
          </label>
          <Select
            value={value.conditions || ""}
            onValueChange={(v) => update("conditions", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Izberi pogoje…" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
