import { Loader2 } from "lucide-react";
import type { CaseStatus, ConfidenceBand, DiagnosticClass, FinalDiagnosis } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CLASS_INFO, CONFIDENCE_INFO, FINAL_DIAGNOSIS_LABEL, STATUS_INFO } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function ClassBadge({
  value,
  long = false,
  className,
}: {
  value: DiagnosticClass;
  long?: boolean;
  className?: string;
}) {
  const info = CLASS_INFO[value];
  return (
    <Badge variant={info.badge} className={className} title={info.label}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {long ? info.label : info.short}
    </Badge>
  );
}

export function FinalDiagnosisBadge({ value }: { value: FinalDiagnosis }) {
  if (value === "inconclusivo") return <Badge variant="secondary">Inconclusivo</Badge>;
  return (
    <Badge variant="outline" title={FINAL_DIAGNOSIS_LABEL[value]}>
      {CLASS_INFO[value].short}
    </Badge>
  );
}

export function StatusBadge({ status, progress }: { status: CaseStatus; progress?: number }) {
  const info = STATUS_INFO[status];
  return (
    <Badge variant={info.badge} title={info.description}>
      {status === "processando" && <Loader2 className="animate-spin" aria-hidden />}
      {info.label}
      {status === "processando" && progress !== undefined && <span className="tabular-nums">· {progress}%</span>}
    </Badge>
  );
}

const CONFIDENCE_LEVEL: Record<ConfidenceBand, number> = { baixa: 1, moderada: 2, alta: 3 };
const TONE_BG = { destructive: "bg-destructive", warning: "bg-mci", success: "bg-cn" } as const;
const TONE_TEXT = { destructive: "text-destructive", warning: "text-warning", success: "text-success" } as const;

/** Faixa de confiança em 3 níveis — nunca um número isolado (RC10). */
export function ConfidenceMeter({ band, className }: { band: ConfidenceBand; className?: string }) {
  const info = CONFIDENCE_INFO[band];
  const level = CONFIDENCE_LEVEL[band];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={info.description}>
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("w-1 rounded-sm", i <= level ? TONE_BG[info.tone] : "bg-border")}
            style={{ height: 4 + i * 3 }}
          />
        ))}
      </span>
      <span className={cn("text-xs font-medium", TONE_TEXT[info.tone])}>{info.label}</span>
    </span>
  );
}
