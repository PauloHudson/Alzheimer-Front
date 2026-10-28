import type { DiagnosticClass, Prediction } from "@/types";
import { CLASS_INFO } from "@/lib/domain";
import { cn, formatPercent } from "@/lib/utils";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";

const GLOSSARY_ID: Record<DiagnosticClass, string> = { CN: "cn", MCI: "mci", AD: "ad" };

/** Uma barra por classe do modelo — duas no binário CN × AD, três no modelo CN/MCI/AD. */
export function ProbabilityBars({
  prediction,
  compact = false,
}: {
  prediction: Pick<Prediction, "classes" | "probabilities" | "suggested">;
  compact?: boolean;
}) {
  return (
    <ul className={cn("space-y-2.5", compact && "space-y-2")} aria-label="Probabilidade por classe">
      {prediction.classes.map((key) => {
        const info = CLASS_INFO[key];
        const value = prediction.probabilities[key] ?? 0;
        const isTop = key === prediction.suggested;
        return (
          <li key={key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className={cn("flex items-baseline gap-1.5", isTop ? "font-semibold" : "text-muted-foreground")}>
                {compact ? info.short : <GlossaryTerm id={GLOSSARY_ID[key]}>{info.short}</GlossaryTerm>}
                <span className="font-mono text-[10px] font-normal tracking-wide text-muted-foreground">{info.code}</span>
              </span>
              <span className={cn("tabular-nums", isTop ? "font-semibold" : "text-muted-foreground")}>
                {formatPercent(value)}
              </span>
            </div>
            <div className={cn("overflow-hidden rounded-full bg-muted", compact ? "h-1.5" : "h-2")}>
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${value * 100}%`, backgroundColor: info.color, opacity: isTop ? 1 : 0.45 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
