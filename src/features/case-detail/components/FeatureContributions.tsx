import { useState } from "react";
import { Brain, ChevronDown, ClipboardList, FileSearch } from "lucide-react";
import type { DiagnosticClass, FeatureContribution, Modality } from "@/types";
import { CLASS_INFO } from "@/lib/domain";
import { cn } from "@/lib/utils";

const MODALITY_ICON: Record<Modality, typeof Brain> = { imagem: Brain, clinico: ClipboardList };
const MODALITY_LABEL: Record<Modality, string> = { imagem: "Imagem", clinico: "Clínico" };

/**
 * Contribuição de cada fator para a sugestão (SHAP), em gráfico divergente:
 * para a direita aproxima da classe sugerida, para a esquerda afasta.
 * Cada fator expande uma explicação e a origem do dado (RC09 — origem visível).
 */
export function FeatureContributions({
  features,
  suggested,
  limit,
  compact = false,
  highlightIds = [],
  onHover,
}: {
  features: FeatureContribution[];
  suggested: DiagnosticClass;
  limit?: number;
  compact?: boolean;
  highlightIds?: string[];
  onHover?: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState<Modality | "todos">("todos");
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = features.filter((f) => filter === "todos" || f.modality === filter);
  const max = Math.max(...features.map((f) => Math.abs(f.contribution)), 0.01);
  const visible = limit && !showAll ? filtered.slice(0, limit) : filtered;
  const classLabel = CLASS_INFO[suggested].short;

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-md bg-muted p-0.5 text-xs" role="group" aria-label="Filtrar por tipo de dado">
            {(["todos", "imagem", "clinico"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilter(m)}
                aria-pressed={filter === m}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  filter === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "todos" ? "Todos" : MODALITY_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm bg-slate-400" /> afasta de {classLabel}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ backgroundColor: CLASS_INFO[suggested].color }} /> aproxima de{" "}
              {classLabel}
            </span>
          </div>
        </div>
      )}

      <ul className="divide-y rounded-lg border">
        {visible.map((feature) => {
          const Icon = MODALITY_ICON[feature.modality];
          const width = (Math.abs(feature.contribution) / max) * 50;
          const positive = feature.contribution >= 0;
          const expanded = open === feature.id;
          const highlighted = highlightIds.includes(feature.id);
          return (
            <li
              key={feature.id}
              onMouseEnter={() => onHover?.(feature.id)}
              onMouseLeave={() => onHover?.(null)}
              className={cn("transition-colors", highlighted && "bg-primary-soft/50")}
            >
              <button
                type="button"
                disabled={compact}
                onClick={() => setOpen(expanded ? null : feature.id)}
                aria-expanded={compact ? undefined : expanded}
                className={cn(
                  "grid w-full items-center gap-3 px-3 text-left",
                  compact
                    ? "grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] py-1.5"
                    : "grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] py-2.5 hover:bg-muted/50",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-label={MODALITY_LABEL[feature.modality]} />
                  <span className="min-w-0">
                    <span className={cn("block font-medium", compact ? "text-xs leading-snug" : "truncate text-sm")}>
                      {feature.label}
                    </span>
                    {!compact && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {feature.value}
                        {feature.reference && ` · ${feature.reference}`}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="relative h-3 flex-1" aria-hidden>
                    <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <span
                      className="absolute inset-y-0.5 rounded-sm transition-[width] duration-500"
                      style={{
                        width: `${width}%`,
                        left: positive ? "50%" : `${50 - width}%`,
                        backgroundColor: positive ? CLASS_INFO[suggested].color : "rgb(148 163 184)",
                      }}
                    />
                  </span>
                  <span className="sr-only">
                    {positive ? "Aproxima" : "Afasta"} da classe sugerida, peso {Math.abs(feature.contribution).toFixed(2)}
                  </span>
                  {!compact && (
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
                    />
                  )}
                </span>
              </button>
              {expanded && (
                <div className="space-y-2 px-3 pb-3 pl-8 text-sm animate-fade-in">
                  <p className="leading-relaxed text-muted-foreground">{feature.explanation}</p>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    <FileSearch className="size-3" /> Origem: {feature.source}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {limit && filtered.length > limit && !compact && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showAll ? "Mostrar menos" : `Mostrar todos os ${filtered.length} fatores`}
        </button>
      )}
    </div>
  );
}
