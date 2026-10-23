import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { OpinionChannel, Referral, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCard, RadioGroup } from "@/components/ui/misc";
import { useRegisterOpinion } from "@/hooks/useCases";

const schema = z.object({
  author: z.string().trim().min(3, "Informe quem emitiu o parecer"),
  channel: z.enum(["sistema", "telefone", "presencial"]),
  conclusion: z.string().trim().min(10, "Descreva a conclusão do especialista"),
  criteria: z
    .string()
    .trim()
    .min(5, "Informe ao menos um critério")
    .transform((s) =>
      s
        .split("\n")
        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean),
    ),
  recommendation: z.string().trim().min(5, "Informe a recomendação"),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const CHANNELS: { value: OpinionChannel; label: string; hint: string }[] = [
  { value: "telefone", label: "Telefone", hint: "Contato informal entre colegas" },
  { value: "presencial", label: "Presencial", hint: "Discussão de caso ou consulta" },
  { value: "sistema", label: "Pelo sistema", hint: "O especialista respondeu aqui" },
];

/**
 * Registro estruturado de parecer — inclusive quando obtido por telefone, para que critérios
 * e recomendação não se percam (cenário C02, hipótese H06).
 */
export function OpinionDialog({
  caseId,
  referral,
  user,
  open,
  onOpenChange,
}: {
  caseId: string;
  referral: Referral;
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const registerOpinion = useRegisterOpinion(caseId);
  const isSpecialist = user.role === "neurologista";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      author: isSpecialist ? user.name : (referral.specialist ?? ""),
      channel: isSpecialist ? "sistema" : "telefone",
      conclusion: "",
      criteria: "",
      recommendation: "",
    },
  });

  const onSubmit = (values: FormOutput) =>
    registerOpinion.mutate(
      { referralId: referral.id, input: { ...values, specialty: referral.specialty } },
      { onSuccess: () => onOpenChange(false) },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isSpecialist ? "Emitir parecer" : "Registrar parecer recebido"}</DialogTitle>
          <DialogDescription>
            Registre conclusão, critérios e recomendação. Quem retomar o caso verá o raciocínio completo, não só a
            conclusão.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <span className="text-muted-foreground">Pergunta do encaminhamento: </span>
          {referral.question}
        </div>

        <form id="opinion-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
            <Field label="Especialista" htmlFor="author" error={errors.author?.message} required>
              <Input id="author" disabled={isSpecialist} {...register("author")} />
            </Field>
            <Field label="Como o parecer foi obtido" required>
              <Controller
                control={control}
                name="channel"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-3 gap-2">
                    {CHANNELS.map((c) => (
                      <RadioCard key={c.value} value={c.value} className="flex-col gap-0.5 p-2.5" title={c.hint}>
                        <span className="text-sm font-medium">{c.label}</span>
                      </RadioCard>
                    ))}
                  </RadioGroup>
                )}
              />
            </Field>
          </div>
          <Field label="Conclusão" htmlFor="conclusion" error={errors.conclusion?.message} required>
            <Textarea
              id="conclusion"
              rows={2}
              placeholder="Ex.: Compatível com comprometimento cognitivo leve, sem elementos fortes para Alzheimer neste momento."
              {...register("conclusion")}
            />
          </Field>
          <Field
            label="Critérios considerados"
            htmlFor="criteria"
            error={errors.criteria?.message}
            hint="Um critério por linha — o que sustentou a conclusão."
            required
          >
            <Textarea
              id="criteria"
              rows={4}
              placeholder={"Redução hipocampal discreta e simétrica\nAutonomia preservada nas atividades instrumentais"}
              {...register("criteria")}
            />
          </Field>
          <Field label="Recomendação" htmlFor="recommendation" error={errors.recommendation?.message} required>
            <Textarea
              id="recommendation"
              rows={2}
              placeholder="Ex.: Reavaliar em 6 meses com nova RM volumétrica e MoCA."
              {...register("recommendation")}
            />
          </Field>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="opinion-form" loading={registerOpinion.isPending}>
            Registrar parecer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
