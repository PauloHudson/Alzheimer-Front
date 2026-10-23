import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send } from "lucide-react";
import type { ClinicalCase, ReferralUrgency } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCard, RadioGroup } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReferCase } from "@/hooks/useCases";
import { lowerFirst } from "@/lib/utils";
import { CLASS_INFO, CONFIDENCE_INFO, URGENCY_INFO } from "@/lib/domain";

const SPECIALTIES = ["Neurologia", "Geriatria", "Psiquiatria", "Neuropsicologia"];

const schema = z.object({
  specialty: z.string().min(1, "Selecione a especialidade"),
  specialist: z.string().optional(),
  urgency: z.enum(["rotina", "prioritario", "urgente"]),
  reason: z.string().trim().min(15, "Descreva o motivo em ao menos 15 caracteres"),
  question: z.string().trim().min(10, "Formule a pergunta que o especialista deve responder"),
});
type FormValues = z.infer<typeof schema>;

export function ReferralDialog({
  data,
  open,
  onOpenChange,
}: {
  data: ClinicalCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const refer = useReferCase(data.id);
  const prediction = data.prediction;

  const defaultReason = prediction
    ? `Sugestão do modelo: ${lowerFirst(CLASS_INFO[prediction.suggested].label)} (${lowerFirst(CONFIDENCE_INFO[prediction.confidence].label)}). MMSE ${data.clinical.mmse ?? "—"}${data.clinical.moca !== undefined ? `, MoCA ${data.clinical.moca}` : ""}.`
    : "";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      specialty: "Neurologia",
      specialist: "",
      urgency: prediction?.confidence === "baixa" ? "prioritario" : "rotina",
      reason: defaultReason,
      question: data.clinical.clinicalQuestion,
    },
  });

  useEffect(() => {
    if (open) refer.reset();
  }, [open]);

  const onSubmit = (values: FormValues) =>
    refer.mutate(values, {
      onSuccess: () => {
        onOpenChange(false);
        reset();
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Encaminhar a especialista</DialogTitle>
          <DialogDescription>
            A sugestão, as evidências e os dados clínicos seguem junto com o caso — o especialista não precisa
            reavaliar do zero.
          </DialogDescription>
        </DialogHeader>
        <form id="referral-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Especialidade" htmlFor="specialty" error={errors.specialty?.message} required>
              <Controller
                control={control}
                name="specialty"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="specialty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Especialista (opcional)" htmlFor="specialist" hint="Deixe em branco para a fila da especialidade">
              <Input id="specialist" placeholder="Ex.: Dr. César Andrade de Melo" {...register("specialist")} />
            </Field>
          </div>

          <Field label="Urgência" required>
            <Controller
              control={control}
              name="urgency"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as ReferralUrgency)}
                  className="grid grid-cols-3 gap-2"
                >
                  {(Object.keys(URGENCY_INFO) as ReferralUrgency[]).map((u) => (
                    <RadioCard key={u} value={u} className="justify-center py-2.5 font-medium">
                      {URGENCY_INFO[u].label}
                    </RadioCard>
                  ))}
                </RadioGroup>
              )}
            />
          </Field>

          <Field label="Motivo do encaminhamento" htmlFor="reason" error={errors.reason?.message} required>
            <Textarea id="reason" rows={3} aria-invalid={Boolean(errors.reason)} {...register("reason")} />
          </Field>
          <Field
            label="Pergunta ao especialista"
            htmlFor="question"
            error={errors.question?.message}
            hint="Uma pergunta objetiva ajuda o especialista a responder o que você precisa decidir."
            required
          >
            <Textarea id="question" rows={2} aria-invalid={Boolean(errors.question)} {...register("question")} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="referral-form" loading={refer.isPending}>
            {!refer.isPending && <Send />} Encaminhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
