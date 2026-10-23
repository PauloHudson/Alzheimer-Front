import type { DiagnosticClass } from "@/types";
import { CLASS_INFO } from "@/lib/domain";
import { cn, formatPercent } from "@/lib/utils";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";

const ORDER: DiagnosticClass[] = ["CN", "MCI", "AD"];
const GLOSSARY_ID: Record<DiagnosticClass, string> = { CN: "cn", MCI: "mci", AD: "ad" };

export function ProbabilityBars({
  probabilities,
  suggested,
  compact = false,
}: {
  probabilities: Record<DiagnosticClass, number>;
  suggested: DiagnosticClass;
  compact?: boolean;
}) {
  return (
    <ul className={cn("space-y-2.5", compact && "space-y-1.5")} aria-label="Probabilidade por classe">
      {ORDER.map((key) => {
        const info = CLASS_INFO[key];
        const value = probabilities[key];
        const isTop = key === suggested;
        return (
          <li key={key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className={cn("flex items-center gap-2", isTop ? "font-semibold" : "text-muted-foreground")}>
                <span className="size-2 rounded-full" style={{ backgroundColor: info.color }} aria-hidden />
                {compact ? (
                  info.short
                ) : (
                  <>
                    <GlossaryTerm id={GLOSSARY_ID[key]}>{info.short}</GlossaryTerm>
                    <span className="hidden font-normal text-muted-foreground sm:inline">· {info.label}</span>
                  </>
                )}
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
