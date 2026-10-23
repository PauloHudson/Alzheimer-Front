import { Crosshair } from "lucide-react";
import type { AttentionRegion } from "@/types";
import { cn } from "@/lib/utils";

/** Regiões do mapa de atenção em lista: clicar leva o visualizador até a região. */
export function RegionList({
  regions,
  focusId,
  onFocus,
}: {
  regions: AttentionRegion[];
  focusId: string | null;
  onFocus: (id: string | null) => void;
}) {
  const max = Math.max(...regions.map((r) => r.weight), 0.01);
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {regions.map((region) => {
        const active = region.id === focusId;
        return (
          <li key={region.id}>
            <button
              type="button"
              onClick={() => onFocus(active ? null : region.id)}
              aria-pressed={active}
              className={cn(
                "group w-full rounded-lg border p-3 text-left transition-colors",
                active ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300" : "hover:bg-muted/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{region.label}</span>
                <Crosshair
                  className={cn("size-4 shrink-0", active ? "text-amber-500" : "text-muted-foreground group-hover:text-foreground")}
                  aria-hidden
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#facc15,#ef4444)]"
                    style={{ width: `${(region.weight / max) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-[11px] text-muted-foreground">
                  {region.weight / max > 0.75 ? "influência alta" : region.weight / max > 0.4 ? "moderada" : "baixa"}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{region.description}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
