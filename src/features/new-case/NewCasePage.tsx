import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CloudUpload, FileImage, Trash2 } from "lucide-react";
import type { ApoeGenotype, MaritalStatus, NewCaseInput } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCard, RadioGroup } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { useCreateCase } from "@/hooks/useCases";
import { USE_MOCK } from "@/services/api";
import { APOE_OPTIONS, MARITAL_LABEL } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { focusFirstError } from "@/lib/forms";

/** Campo numérico opcional: vazio vira `undefined` (o backend imputa). */
const optionalVolume = z.preprocess(
  (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)),
  z.number({ invalid_type_error: "Valor inválido" }).positive("Deve ser positivo").optional(),
);

const NOT_INFORMED = "nao_informado";

const schema = z.object({
  name: z.string().trim().min(5, "Informe o nome completo do paciente"),
  birthDate: z
    .string()
    .min(1, "Informe a data de nascimento")
    .refine((v) => {
      const age = (Date.now() - new Date(v).getTime()) / (365.25 * 86_400_000);
      return age >= 18 && age <= 110;
    }, "Data de nascimento fora do intervalo esperado"),
  sex: z.enum(["F", "M"], { required_error: "Selecione o sexo" }),
  educationYears: z.coerce.number().min(0, "Mínimo 0").max(30, "Máximo 30"),
  examDate: z.string().min(1, "Informe a data do exame"),
  mri: z.instanceof(File, { message: "Anexe a série T1 do exame" }),
  apoe: z.string(),
  marital: z.string(),
  icvMm3: optionalVolume,
  hippocampusMm3: optionalVolume,
  lateralVentriclesMm3: optionalVolume,
  notes: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function NewCasePage() {
  const navigate = useNavigate();
  const createCase = useCreateCase();
  const formRef = useRef<HTMLFormElement>(null);
  const [dragging, setDragging] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: {
      name: "",
      birthDate: "",
      educationYears: 12,
      examDate: today,
      apoe: NOT_INFORMED,
      marital: NOT_INFORMED,
      notes: "",
    },
  });

  const mri = watch("mri") as File | undefined;
  const setFile = (file: File | undefined) => file && setValue("mri", file, { shouldValidate: true });

  const submit = (v: FormValues) => {
    const input: NewCaseInput = {
      patient: { name: v.name, birthDate: v.birthDate, sex: v.sex, educationYears: v.educationYears },
      examDate: v.examDate,
      mri: v.mri,
      notes: v.notes || undefined,
      tabular: {
        apoe: v.apoe === NOT_INFORMED ? undefined : (v.apoe as ApoeGenotype),
        marital: v.marital === NOT_INFORMED ? undefined : (v.marital as MaritalStatus),
        icvMm3: v.icvMm3,
        hippocampusMm3: v.hippocampusMm3,
        lateralVentriclesMm3: v.lateralVentriclesMm3,
      },
    };
    createCase.mutate(input, { onSuccess: (created) => navigate(`/app/casos/${created.id}`) });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link to="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Casos
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Novo caso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A RM e os dados abaixo são o que o modelo usa. Campos clínicos opcionais em branco são estimados pelo modelo
          a partir de casos parecidos.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit(submit, () => focusFirstError(formRef.current))}
        className="space-y-6"
        noValidate
      >
        {/* ---------------------------------------------- paciente */}
        <Card>
          <CardHeader>
            <CardTitle>Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nome completo" htmlFor="name" error={errors.name?.message} required>
              <Input id="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Data de nascimento" htmlFor="birthDate" error={errors.birthDate?.message} required>
                <Input id="birthDate" type="date" max={today} aria-invalid={Boolean(errors.birthDate)} {...register("birthDate")} />
              </Field>
              <Field label="Escolaridade (anos)" htmlFor="educationYears" error={errors.educationYears?.message} required>
                <Input id="educationYears" type="number" min={0} max={30} {...register("educationYears")} />
              </Field>
              <Field label="Data do exame" htmlFor="examDate" error={errors.examDate?.message} required>
                <Input id="examDate" type="date" max={today} {...register("examDate")} />
              </Field>
            </div>
            <Field label="Sexo" error={errors.sex?.message} required>
              <Controller
                control={control}
                name="sex"
                render={({ field }) => (
                  <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="grid max-w-sm grid-cols-2 gap-2">
                    <RadioCard value="F" className="justify-center py-2.5 font-medium">Feminino</RadioCard>
                    <RadioCard value="M" className="justify-center py-2.5 font-medium">Masculino</RadioCard>
                  </RadioGroup>
                )}
              />
            </Field>
          </CardContent>
        </Card>

        {/* ---------------------------------------------- RM */}
        <Card>
          <CardHeader>
            <CardTitle>Ressonância magnética</CardTitle>
            <CardDescription>Série T1 volumétrica (MPRAGE) completa — o backend extrai o corte que vai para a CNN.</CardDescription>
          </CardHeader>
          <CardContent>
            {mri ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary-soft">
                  <FileImage className="size-5 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{mri.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {mri.size ? `${(mri.size / 1_048_576).toFixed(1)} MB · ` : ""}pronto para envio
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover arquivo"
                  onClick={() => setValue("mri", undefined as unknown as File, { shouldValidate: true })}
                >
                  <Trash2 />
                </Button>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  setFile(e.dataTransfer.files[0]);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                  dragging ? "border-primary bg-primary-soft/50" : "hover:border-primary/40 hover:bg-muted/40",
                  errors.mri && "border-destructive",
                )}
              >
                <CloudUpload className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium">Arraste o arquivo ou clique para selecionar</span>
                <span className="text-xs text-muted-foreground">Série DICOM compactada (.zip) ou NIfTI (.nii, .nii.gz)</span>
                <input
                  type="file"
                  className="sr-only"
                  accept=".zip,.nii,.gz"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
                {USE_MOCK && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(new File([], "RM_T1_MPRAGE_exemplo.zip", { type: "application/zip" }));
                    }}
                    className="mt-1 text-xs font-medium text-primary hover:underline"
                  >
                    Usar exame de exemplo
                  </button>
                )}
              </label>
            )}
            {errors.mri && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {errors.mri.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ---------------------------------------------- dados clínicos */}
        <Card>
          <CardHeader>
            <CardTitle>Dados clínicos</CardTitle>
            <CardDescription>
              Testes cognitivos (MMSE, MoCA, CDR) não entram no modelo: o diagnóstico de treino foi derivado deles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Genótipo APOE" htmlFor="apoe" hint="O modelo usa o número de alelos ε4.">
                <Controller
                  control={control}
                  name="apoe"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="apoe">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NOT_INFORMED}>Não informado</SelectItem>
                        {APOE_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Estado civil" htmlFor="marital">
                <Controller
                  control={control}
                  name="marital"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="marital">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NOT_INFORMED}>Não informado</SelectItem>
                        {(Object.keys(MARITAL_LABEL) as MaritalStatus[])
                          .filter((m) => m !== "Unknown")
                          .map((m) => (
                            <SelectItem key={m} value={m}>
                              {MARITAL_LABEL[m]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                <GlossaryTerm id="volumetria">Volumetria</GlossaryTerm> (FreeSurfer, mm³)
              </legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Volume intracraniano (ICV)" htmlFor="icvMm3" error={errors.icvMm3?.message}>
                  <Input id="icvMm3" type="number" min={0} placeholder="ex.: 1 500 000" {...register("icvMm3")} />
                </Field>
                <Field label="Hipocampo (soma E + D)" htmlFor="hippocampusMm3" error={errors.hippocampusMm3?.message}>
                  <Input id="hippocampusMm3" type="number" min={0} placeholder="ex.: 7 000" {...register("hippocampusMm3")} />
                </Field>
                <Field
                  label="Ventrículos laterais"
                  htmlFor="lateralVentriclesMm3"
                  error={errors.lateralVentriclesMm3?.message}
                >
                  <Input
                    id="lateralVentriclesMm3"
                    type="number"
                    min={0}
                    placeholder="ex.: 30 000"
                    {...register("lateralVentriclesMm3")}
                  />
                </Field>
              </div>
            </fieldset>

            <Field label="Observações" htmlFor="notes" hint="Opcional — não entram no modelo.">
              <Textarea id="notes" rows={2} {...register("notes")} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={createCase.isPending}>
            <CloudUpload /> Enviar para análise
          </Button>
        </div>
      </form>
    </div>
  );
}
