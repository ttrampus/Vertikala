import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { categoryLabels } from "./TagBadge";
import { SORTS, STATUSES, EMPTY_FILTERS, hasActiveFilters } from "@/lib/postFilters";

// Vrstica za iskanje, filtriranje in razvrščanje nad seznamom objav.
// Sama ničesar ne filtrira — stanje dvigne navzgor, seznam pa skozi
// applyPostFilters() prežene stran, ki ga prikazuje.
//
// Radix Select vrednosti "" ne sprejme (prazen niz pomeni „ni izbire“), zato
// gre za možnost „vse“ po žici poseben ključ, ki se navzven pretvori nazaj v "".
const ALL = "__all__";

export default function PostToolbar({ filters, onChange, shown, total, className = "" }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const active = hasActiveFilters(filters);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Iskanje po naslovu, povzetku ali avtorju…"
            className="pl-9 pr-9 h-9"
            aria-label="Iskanje po objavah"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => set({ q: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Počisti iskanje"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select
          value={filters.category || ALL}
          onValueChange={(v) => set({ category: v === ALL ? "" : v })}
        >
          <SelectTrigger className="h-9 sm:w-[150px]" aria-label="Kategorija">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Vse kategorije</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || ALL}
          onValueChange={(v) => set({ status: v === ALL ? "" : v })}
        >
          <SelectTrigger className="h-9 sm:w-[140px]" aria-label="Stanje">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Vsa stanja</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={(v) => set({ sort: v })}>
          <SelectTrigger className="h-9 sm:w-[170px]" aria-label="Razvrsti">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {active && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-inter">
          <span>
            Prikazanih {shown} od {total} {total === 1 ? "objave" : "objav"}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            className="text-primary hover:underline"
          >
            Počisti filtre
          </button>
        </div>
      )}
    </div>
  );
}

// Prazen seznam po filtriranju ni isto kot „še ni objav“ — sporočilo mora
// povedati, katero od obojega je, sicer je videti kot okvara.
export function NoPostsMessage({ filtered, empty, onReset }) {
  if (!filtered) return <p className="text-muted-foreground text-sm font-inter py-8 text-center">{empty}</p>;
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground text-sm font-inter">Nobena objava ne ustreza iskanju.</p>
      <Button variant="link" size="sm" onClick={onReset}>Počisti filtre</Button>
    </div>
  );
}
