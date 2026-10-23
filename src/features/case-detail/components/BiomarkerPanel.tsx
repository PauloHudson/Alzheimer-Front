import type { Biomarker } from "@/types";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { cn } from "@/lib/utils";

const GLOSSARY: Record<string, string> = {
  "b-hipocampo": "volume-hipocampal",
  "b-entorrinal": "espessura-cortical",
};

/**
 * Biomarcadores derivados da imagem comparados a uma referência por idade e sexo —
 * a parte "Feature-Augmented" da explicação: medidas com significado clínico conhecido.
 */
export function BiomarkerPanel({ biomarkers }: { biomarkers: Biomarker[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Medidas automáticas da RM comparadas a pessoas da mesma idade e sexo (
        <GlossaryTerm id="percentil">percentil normativo</GlossaryTerm>).
      </p>
      <ul className="space-y-3">
        {biomarkers.map((b) => {
          // para ventrículos, valores altos é que são alterados
          const inverted = b.id === "b-ventriculos";
          const risk = inverted ? 100 - b.percentile : b.percentile;
          const tone = risk < 5 ? "destructive" : risk < 25 ? "warning" : "success";
          return (
            <li key={b.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {GLOSSARY[b.id] ? <GlossaryTerm id={GLOSSARY[b.id]!}>{b.label}</GlossaryTerm> : b.label}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {b.value.toLocaleString("pt-BR")} <span className="text-sm font-normal text-muted-foreground">{b.unit}</span>
                </p>
              </div>
              <div className="relative mt-3 h-2 rounded-full" aria-hidden>
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: inverted
                      ? "linear-gradient(90deg, var(--color-cn-soft) 0 75%, var(--color-mci-soft) 75% 95%, var(--color-ad-soft) 95%)"
                      : "linear-gradient(90deg, var(--color-ad-soft) 0 5%, var(--color-mci-soft) 5% 25%, var(--color-cn-soft) 25%)",
                  }}
                />
                <div
                  className={cn(
                    "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow",
                    tone === "destructive" && "bg-ad",
                    tone === "warning" && "bg-mci",
                    tone === "success" && "bg-cn",
                  )}
                  style={{ left: `${b.percentile}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" aria-hidden>
                <span>p0</span>
                <span>p50</span>
                <span>p100</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span
                  className={cn(
                    "font-medium",
                    tone === "destructive" && "text-ad",
                    tone === "warning" && "text-warning",
                    tone === "success" && "text-success",
                  )}
                >
                  Percentil {b.percentile} · {b.interpretation}
                </span>
                <span className="text-muted-foreground">Referência: {b.referenceRange}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
