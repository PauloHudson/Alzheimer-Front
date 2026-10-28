import { Cpu, FileWarning } from "lucide-react";
import type { ClinicalCase } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  "Extração do encéfalo (skull strip) e corte no nível ventricular",
  "Inferência do modelo multimodal",
  "Geração do mapa de atenção (Grad-CAM)",
];

/** Estado de processamento (feedback de status — H1 de Nielsen). O backend não informa progresso parcial. */
export function ProcessingState() {
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
            Você pode sair desta tela — o caso aparecerá como “Aguardando revisão” quando a sugestão estiver pronta.
          </p>
        </div>
        <ol className="w-full max-w-md list-decimal space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/** Falha do backend ao processar o exame (ex.: série que não é T1 volumétrica). */
export function FailedState({ data }: { data: ClinicalCase }) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex items-start gap-3 py-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive-soft">
          <FileWarning className="size-5 text-destructive" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Não foi possível analisar o exame</h2>
          <p className="text-sm text-muted-foreground">
            {data.error ?? "O backend não informou o motivo. Tente enviar o exame novamente."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
