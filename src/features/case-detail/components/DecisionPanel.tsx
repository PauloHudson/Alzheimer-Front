import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Check, Gavel, Lock, Plus, Send, Sparkles, Wand2 } from "lucide-react";
import type { Agreement, ClinicalCase, FinalDiagnosis } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCard, RadioGroup } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegisterDecision } from "@/hooks/useCases";
import { AGREEMENT_INFO, CLASS_INFO, FINAL_DIAGNOSIS_LABEL } from "@/lib/domain";
import { cn, lowerFirst } from "@/lib/utils";
import { focusFirstError } from "@/lib/forms";

const CONDUCTS = [
  "Reavaliar em 6 meses com nova RM e testes cognitivos",
  "Solicitar avaliação neuropsicológica",
  "Investigar causas reversíveis (TSH, B12, depressão)",
  "Iniciar acompanhamento com neurologia",
  "Orientar paciente e família sobre sinais de alerta",
];

const schema = z.object({
  agreement: z.enum(["concorda", "ajusta", "discorda"], { required_error: "Indique se concorda com a sugestão" }),
  finalDiagnosis: z.enum(["CN", "MCI", "AD", "inconclusivo"], { required_error: "Selecione sua conclusão" }),
  conduct: z.string().trim().min(5, "Descreva a conduta definida"),
  justification: z.string().trim().min(30, "A justificativa precisa ter ao menos 30 caracteres"),
  evidenceIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

export function DecisionPanel({ data, onRefer }: { data: ClinicalCase; onRefer: () => void }) {
  const prediction = data.prediction!;
  const decide = useRegisterDecision(data.id);
  const [confirming, setConfirming] = useState<FormValues | null>(null);

  const evidenceOptions = useMemo(
    () => [
      ...prediction.features.slice(0, 6).map((f) => ({
        id: f.id,
        label: f.label,
        text: `${f.label}: ${f.value}${f.reference ? ` (${f.reference})` : ""}`,
      })),
      ...prediction.biomarkers.map((b) => ({
        id: b.id,
        label: b.label,
        text: `${b.label}: ${b.value.toLocaleString("pt-BR")} ${b.unit}, percentil ${b.percentile} — ${b.interpretation.toLowerCase()}`,
      })),
      ...data.referrals
        .filter((r) => r.opinion)
        .map((r) => ({
          id: `parecer-${r.id}`,
          label: `Parecer de ${r.opinion!.specialty}`,
          text: `Parecer de ${r.opinion!.author} (${r.opinion!.channel}): ${r.opinion!.conclusion}`,
        })),
    ],
    [prediction, data.referrals],
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { conduct: "", justification: "", evidenceIds: [] },
    shouldFocusError: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  const agreement = watch("agreement");
  const evidenceIds = watch("evidenceIds");
  const finalDiagnosis = watch("finalDiagnosis");

  const pickAgreement = (value: Agreement) => {
    if (value === "concorda") setValue("finalDiagnosis", prediction.suggested, { shouldValidate: true });
  };

  const toggleEvidence = (id: string) => {
    const current = getValues("evidenceIds");
    setValue("evidenceIds", current.includes(id) ? current.filter((e) => e !== id) : [...current, id]);
  };

  const draftJustification = () => {
    const selected = evidenceOptions.filter((e) => evidenceIds.includes(e.id));
    const intro =
      agreement === "discorda"
        ? `Discordo da sugestão do modelo (${lowerFirst(CLASS_INFO[prediction.suggested].label)}).`
        : agreement === "ajusta"
          ? `Concordo parcialmente com a sugestão do modelo (${lowerFirst(CLASS_INFO[prediction.suggested].label)}).`
          : `Concordo com a sugestão do modelo (${lowerFirst(CLASS_INFO[prediction.suggested].label)}).`;
    const lines = selected.map((e) => `- ${e.text}`);
    const text = [intro, lines.length ? "Evidências consideradas:" : "", ...lines, "Avaliação clínica: "]
      .filter(Boolean)
      .join("\n");
    setValue("justification", text, { shouldValidate: false });
  };

  const appendConduct = (text: string) => {
    const current = getValues("conduct").trim();
    if (current.includes(text)) return;
    setValue("conduct", current ? `${current}; ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text, {
      shouldValidate: true,
    });
  };

  const lowConfidenceAgreement = prediction.confidence === "baixa" && agreement === "concorda";
  const diverges = agreement === "concorda" && finalDiagnosis && finalDiagnosis !== prediction.suggested;

  return (
    <Card id="decisao" className="scroll-mt-24">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Gavel className="size-4 text-primary" /> Sua decisão
        </CardTitle>
        <CardDescription>
          A responsabilidade clínica é sua. Depois de registrada, a decisão não pode ser editada — complementos entram
          como adendo.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <form
          ref={formRef}
          onSubmit={handleSubmit(
            (values) => setConfirming(values),
            () => focusFirstError(formRef.current),
          )}
          className="space-y-6"
          noValidate
        >
          {/* 1. concordância */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              1. Em relação à sugestão —{" "}
              <span className="text-muted-foreground">{CLASS_INFO[prediction.suggested].label}</span>
            </legend>
            <Controller
              control={control}
              name="agreement"
              render={({ field }) => (
                <RadioGroup
                  value={field.value ?? ""}
                  onValueChange={(v) => {
                    field.onChange(v as Agreement);
                    pickAgreement(v as Agreement);
                  }}
                  className="grid gap-2 md:grid-cols-3"
                >
                  {(Object.keys(AGREEMENT_INFO) as Agreement[]).map((a) => (
                    <RadioCard key={a} value={a}>
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                          agreement === a ? "border-primary bg-primary text-white" : "border-input",
                        )}
                        aria-hidden
                      >
                        {agreement === a && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span>
                        <span className="block font-medium">{AGREEMENT_INFO[a].label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {AGREEMENT_INFO[a].description}
                        </span>
                      </span>
                    </RadioCard>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.agreement && (
              <p role="alert" className="text-xs text-destructive">
                {errors.agreement.message}
              </p>
            )}
            {lowConfidenceAgreement && (
              <div className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  A confiança do modelo é baixa neste caso. Considere se há evidência clínica suficiente ou{" "}
                  <button type="button" onClick={onRefer} className="font-medium underline underline-offset-2">
                    encaminhe a um especialista
                  </button>
                  .
                </p>
              </div>
            )}
          </fieldset>

          {/* 2. conclusão e conduta */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
            <Field label="2. Sua conclusão" htmlFor="finalDiagnosis" error={errors.finalDiagnosis?.message} required>
              <Controller
                control={control}
                name="finalDiagnosis"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v as FinalDiagnosis)}>
                    <SelectTrigger ref={field.ref} id="finalDiagnosis" aria-invalid={Boolean(errors.finalDiagnosis)}>
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FINAL_DIAGNOSIS_LABEL) as FinalDiagnosis[]).map((d) => (
                        <SelectItem key={d} value={d}>
                          {FINAL_DIAGNOSIS_LABEL[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {diverges && (
                <p className="text-xs text-warning">
                  Sua conclusão difere da sugestão. Se for intencional, marque “Concordo parcialmente” ou “Discordo”.
                </p>
              )}
            </Field>
            <Field label="Conduta" htmlFor="conduct" error={errors.conduct?.message} required>
              <Textarea id="conduct" rows={2} aria-invalid={Boolean(errors.conduct)} {...register("conduct")} />
              <div className="flex flex-wrap gap-1.5">
                {CONDUCTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => appendConduct(c)}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                  >
                    <Plus className="size-3" /> {c}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* 3. evidências e justificativa */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">3. Evidências que sustentam sua decisão</p>
              <p className="text-xs text-muted-foreground">
                Selecione o que você considerou. Elas entram no registro e podem gerar o rascunho da justificativa.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Evidências">
              {evidenceOptions.map((e) => {
                const active = evidenceIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleEvidence(e.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-white"
                        : "text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {active ? <Check className="size-3" /> : <Plus className="size-3" />}
                    {e.label}
                  </button>
                );
              })}
            </div>
            <Field label="Justificativa" htmlFor="justification" error={errors.justification?.message} required>
              <Textarea
                id="justification"
                rows={6}
                aria-invalid={Boolean(errors.justification)}
                placeholder="Explique o raciocínio clínico. Use o botão abaixo para partir das evidências selecionadas."
                {...register("justification")}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={draftJustification}
              disabled={!agreement}
              title={!agreement ? "Indique primeiro se concorda com a sugestão" : undefined}
            >
              <Wand2 /> Gerar rascunho a partir das evidências
            </Button>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={onRefer}>
              <Send /> Prefiro encaminhar a um especialista
            </Button>
            <Button type="submit" size="lg">
              <Sparkles /> Revisar e registrar
            </Button>
          </div>
        </form>
      </CardContent>

      <Dialog open={Boolean(confirming)} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar registro da decisão</DialogTitle>
            <DialogDescription>Confira antes de registrar. Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          {confirming && (
            <dl className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Em relação à sugestão</dt>
                <dd className="font-medium">{AGREEMENT_INFO[confirming.agreement].label}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Conclusão</dt>
                <dd className="font-medium">{FINAL_DIAGNOSIS_LABEL[confirming.finalDiagnosis]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Conduta</dt>
                <dd>{confirming.conduct}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Evidências</dt>
                <dd>{confirming.evidenceIds.length || "nenhuma selecionada"}</dd>
              </div>
            </dl>
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" />A decisão será gravada na trilha de auditoria com seu nome,
            registro e horário.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Voltar e revisar
            </Button>
            <Button
              loading={decide.isPending}
              onClick={() =>
                confirming &&
                decide.mutate(confirming, {
                  onSuccess: () => {
                    setConfirming(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  },
                })
              }
            >
              Registrar decisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
