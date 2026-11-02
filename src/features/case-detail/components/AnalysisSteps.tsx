import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const ANALYSIS_STEPS = [
  "Envio do exame",
  "Extração do encéfalo e corte no nível ventricular",
  "Inferência do modelo multimodal",
  "Geração do mapa de atenção (Grad-CAM)",
];

/** Lista de etapas: as anteriores a `active` aparecem concluídas e `detail` acompanha a etapa atual. */
export function AnalysisSteps({ active, detail }: { active: number; detail?: React.ReactNode }) {
  return (
    <ol className="w-full space-y-3 text-left text-sm">
      {ANALYSIS_STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={step} className="flex gap-2.5" aria-current={current ? "step" : undefined}>
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                done && "border-success bg-success text-white",
                current && "border-primary",
              )}
            >
              {done && <Check className="size-3" strokeWidth={3} aria-label="Concluída" />}
              {current && <Loader2 className="size-3 animate-spin text-primary" aria-label="Em andamento" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn(!done && !current && "text-muted-foreground", current && "font-medium")}>{step}</span>
              {current && detail && <span className="mt-1.5 block">{detail}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Barra de progresso: com `value` (0–1) mostra o avanço real; sem ele, indica só que há trabalho em andamento. */
export function ProgressBar({ value, label }: { value?: number; label: string }) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={value === undefined ? undefined : 0}
      aria-valuemax={value === undefined ? undefined : 100}
      aria-valuenow={value === undefined ? undefined : Math.round(value * 100)}
      className="block h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      {value === undefined ? (
        <span className="block h-full w-1/3 animate-indeterminate rounded-full bg-primary" />
      ) : (
        <span
          className="block h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${value * 100}%` }}
        />
      )}
    </span>
  );
}
