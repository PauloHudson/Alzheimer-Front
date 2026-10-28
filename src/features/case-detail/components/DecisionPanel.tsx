import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Check, Gavel, Lock, Sparkles } from "lucide-react";
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
import { AGREEMENT_INFO, CLASS_INFO, confidenceFromProbabilities, FINAL_DIAGNOSIS_LABEL } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { focusFirstError } from "@/lib/forms";

const schema = z.object({
  agreement: z.enum(["concorda", "ajusta", "discorda"], { required_error: "Indique se concorda com a sugestão" }),
  finalDiagnosis: z.enum(["CN", "MCI", "AD", "inconclusivo"], { required_error: "Selecione sua conclusão" }),
  justification: z.string().trim().min(30, "A justificativa precisa ter ao menos 30 caracteres"),
});
type FormValues = z.infer<typeof schema>;

export function DecisionPanel({ data }: { data: ClinicalCase }) {
  const prediction = data.prediction!;
  const decide = useRegisterDecision(data.id);
  const [confirming, setConfirming] = useState<FormValues | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { justification: "" },
    shouldFocusError: false,
  });

  const agreement = watch("agreement");
  const finalDiagnosis = watch("finalDiagnosis");
  const lowConfidenceAgreement =
    confidenceFromProbabilities(prediction.probabilities) === "baixa" && agreement === "concorda";
  const diverges = agreement === "concorda" && finalDiagnosis && finalDiagnosis !== prediction.suggested;

  return (
    <Card id="decisao" className="scroll-mt-24">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Gavel className="size-4 text-primary" /> Sua decisão
        </CardTitle>
        <CardDescription>
          Depois de registrada, a decisão não pode ser editada.
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
                    if (v === "concorda") setValue("finalDiagnosis", prediction.suggested, { shouldValidate: true });
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
                      <span className="font-medium">{AGREEMENT_INFO[a].label}</span>
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
                <p>Confiança baixa: confirme a evidência clínica.</p>
              </div>
            )}
          </fieldset>

          {/* 2. conclusão */}
          <Field
            label="2. Sua conclusão"
            htmlFor="finalDiagnosis"
            error={errors.finalDiagnosis?.message}
            required
            className="max-w-sm"
          >
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
                Difere da sugestão: marque “Concordo parcialmente” ou “Discordo”.
              </p>
            )}
          </Field>

          {/* 3. justificativa */}
          <Field label="3. Justificativa" htmlFor="justification" error={errors.justification?.message} required>
            <Textarea
              id="justification"
              rows={5}
              aria-invalid={Boolean(errors.justification)}
              placeholder="Seu raciocínio clínico"
              {...register("justification")}
            />
          </Field>

          <div className="flex justify-end border-t pt-5">
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
            </dl>
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" />A decisão será gravada com seu nome e horário.
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
