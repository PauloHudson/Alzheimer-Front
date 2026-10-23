import { useState } from "react";
import { CheckCircle2, Lock, NotebookPen } from "lucide-react";
import type { ClinicalCase } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAddAddendum } from "@/hooks/useCases";
import { AGREEMENT_INFO, CLASS_INFO, FINAL_DIAGNOSIS_LABEL } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";

/** Decisão registrada: somente leitura, com adendos (CRUD de edição não existe — Entrega 1, seção 8). */
export function DecisionRecord({ data, canAddendum }: { data: ClinicalCase; canAddendum: boolean }) {
  const decision = data.decision!;
  const addAddendum = useAddAddendum(data.id);
  const [text, setText] = useState("");
  const [writing, setWriting] = useState(false);

  const evidenceLabels = decision.evidenceIds.map((id) => {
    const feature = data.prediction?.features.find((f) => f.id === id);
    const biomarker = data.prediction?.biomarkers.find((b) => b.id === id);
    const referral = data.referrals.find((r) => `parecer-${r.id}` === id);
    return feature?.label ?? biomarker?.label ?? (referral ? `Parecer de ${referral.specialty}` : id);
  });

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
        <dl className="grid gap-4 sm:grid-cols-3">
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
          <div>
            <dt className="text-xs text-muted-foreground">Conduta</dt>
            <dd className="mt-0.5">{decision.conduct}</dd>
          </div>
        </dl>

        <div>
          <p className="text-xs text-muted-foreground">Justificativa</p>
          <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">
            {decision.justification}
          </p>
        </div>

        {evidenceLabels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Evidências consideradas:</span>
            {evidenceLabels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {data.addenda.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adendos</p>
            <ul className="space-y-2">
              {data.addenda.map((a) => (
                <li key={a.id} className="rounded-lg border-l-2 border-primary bg-muted/30 px-3 py-2 text-sm">
                  <p className="whitespace-pre-line">{a.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.author} · {formatDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canAddendum &&
          (writing ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Ex.: Resultado do TSH normal; mantida a conduta."
                aria-label="Texto do adendo"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setWriting(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={text.trim().length < 5}
                  loading={addAddendum.isPending}
                  onClick={() =>
                    addAddendum.mutate(text.trim(), {
                      onSuccess: () => {
                        setText("");
                        setWriting(false);
                      },
                    })
                  }
                >
                  Incluir adendo
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setWriting(true)}>
              <NotebookPen /> Incluir adendo
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
