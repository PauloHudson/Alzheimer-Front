import { CheckCircle2, Lock } from "lucide-react";
import type { ClinicalCase } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGREEMENT_INFO, CLASS_INFO, FINAL_DIAGNOSIS_LABEL } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";

/** Decisão registrada: somente leitura (não há edição). */
export function DecisionRecord({ data }: { data: ClinicalCase }) {
  const decision = data.decision!;
  return (
    <Card className="border-success/30">
      <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-success-soft/40">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-success" /> Decisão registrada
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {decision.decidedBy} · {formatDateTime(decision.decidedAt)}
          </p>
        </div>
        <Badge variant="secondary">
          <Lock /> Somente leitura
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Conclusão</dt>
            <dd className="mt-0.5 font-semibold">{FINAL_DIAGNOSIS_LABEL[decision.finalDiagnosis]}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Em relação à sugestão</dt>
            <dd className="mt-0.5">
              {AGREEMENT_INFO[decision.agreement].label}
              {data.prediction && (
                <span className="block text-xs text-muted-foreground">
                  Sugestão: {CLASS_INFO[data.prediction.suggested].label}
                </span>
              )}
            </dd>
          </div>
        </dl>
        <div>
          <p className="text-xs text-muted-foreground">Justificativa</p>
          <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">
            {decision.justification}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
