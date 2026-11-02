import { useEffect, useState } from "react";
import { Cpu, FileWarning } from "lucide-react";
import type { ClinicalCase } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisSteps, ProgressBar } from "./AnalysisSteps";

/**
 * Segundos estimados para passar à inferência e ao mapa de atenção. O backend só informa "processando",
 * então a etapa exibida é uma estimativa pelo tempo decorrido; a última fica ativa até o resultado chegar.
 */
const STEP_STARTS = [25, 60];
const SLOW_AFTER_SECONDS = 180;

/** Estado de processamento (feedback de status — H1 de Nielsen). */
export function ProcessingState({ data }: { data: ClinicalCase }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - new Date(data.createdAt).getTime()) / 1_000));
  const active = 1 + STEP_STARTS.filter((start) => elapsed >= start).length;
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

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
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-1.5">
            <ProgressBar label="Análise em andamento" />
            <p className="text-right text-xs tabular-nums text-muted-foreground">Tempo decorrido: {clock}</p>
          </div>
          <AnalysisSteps active={active} />
          <p className="text-left text-xs text-muted-foreground">
            As etapas são uma estimativa pelo tempo decorrido: o servidor avisa só quando a análise termina.
          </p>
          {elapsed >= SLOW_AFTER_SECONDS && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-left text-xs text-warning">
              Está demorando mais que o esperado. A análise continua no servidor e você pode voltar depois.
            </p>
          )}
        </div>
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
