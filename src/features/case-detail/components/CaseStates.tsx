import { Check, CircleAlert, Cpu, FileWarning, Loader2, PhoneCall } from "lucide-react";
import type { ClinicalCase } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const STEPS = [
  { at: 0, label: "Exame e dados recebidos" },
  { at: 15, label: "Pré-processamento da RM (alinhamento e segmentação)" },
  { at: 45, label: "Inferência do modelo multimodal" },
  { at: 75, label: "Geração da explicação (mapa de atenção e fatores)" },
];

/** Estado de processamento com progresso por etapa (feedback de status — H1 de Nielsen). */
export function ProcessingState({ data }: { data: ClinicalCase }) {
  const progress = data.progress ?? 0;
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="relative flex size-16 items-center justify-center rounded-full bg-primary-soft">
          <Cpu className="size-7 text-primary" />
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Analisando o exame</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Isso costuma levar menos de um minuto. Você pode sair desta tela — o caso aparecerá em “Aguardando revisão”
            quando estiver pronto.
          </p>
        </div>
        <div className="w-full max-w-md space-y-2">
          <Progress value={progress} aria-label="Progresso da análise" />
          <p className="text-right text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {progress}%
          </p>
        </div>
        <ol className="w-full max-w-md space-y-2 text-left text-sm">
          {STEPS.map((step, i) => {
            const next = STEPS[i + 1]?.at ?? 100;
            const done = progress >= next;
            const active = progress >= step.at && !done;
            return (
              <li key={step.label} className={cn("flex items-center gap-2.5", !done && !active && "text-muted-foreground")}>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    done && "border-success bg-success text-white",
                    active && "border-primary",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : active ? <Loader2 className="size-3 animate-spin text-primary" /> : null}
                </span>
                {step.label}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

/** Caso bloqueado por pendência de qualidade/dados (cenário C03, H07). */
export function PendingState({ data }: { data: ClinicalCase }) {
  return (
    <Card className="border-warning/40">
      <CardContent className="space-y-5 py-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-soft">
            <FileWarning className="size-5 text-warning" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Análise bloqueada por pendências</h2>
            <p className="text-sm text-muted-foreground">
              O modelo só é executado quando a aquisição e os dados mínimos atendem aos requisitos. Assim a sugestão não
              é gerada a partir de um exame limitado.
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {data.pendingItems?.map((item) => (
            <li key={item} className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft/60 p-3 text-sm">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              {item}
            </li>
          ))}
        </ul>
        {data.acquisition.notes && (
          <p className="text-sm">
            <span className="text-muted-foreground">Observação do técnico: </span>
            {data.acquisition.notes}
          </p>
        )}
        <div className="flex gap-2.5 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          <PhoneCall className="mt-0.5 size-4 shrink-0" />
          <p>
            Próximo passo: o setor de imagem deve agendar nova aquisição com o protocolo de demência (sequência T1
            volumétrica) e completar os dados clínicos. O solicitante ({data.requestedBy}) foi notificado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
