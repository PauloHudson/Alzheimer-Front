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
import { APOE_OPTIONS, formatLimit, INPUT_LIMITS, MARITAL_LABEL, type LimitedInput } from "@/lib/domain";
import { GLOSSARY_BY_ID } from "@/lib/glossary";
import { AnalysisSteps, ProgressBar } from "@/features/case-detail/components/AnalysisSteps";
import { DateInput } from "@/components/ui/date-input";
import { cn, localToday } from "@/lib/utils";
import { focusFirstError } from "@/lib/forms";

const toNumber = (v: unknown) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v));

function limited(field: LimitedInput) {
  const { min, max, unit } = INPUT_LIMITS[field];
  return z
    .number({ invalid_type_error: "Valor inválido", required_error: "Informe um valor" })
    .min(min, `Mínimo: ${min.toLocaleString("pt-BR")} ${unit}`)
    .max(max, `Máximo: ${max.toLocaleString("pt-BR")} ${unit}`);
}

/** Campo numérico opcional: vazio vira `undefined` (o backend imputa). */
const optionalVolume = (field: LimitedInput) => z.preprocess(toNumber, limited(field).optional());

const help = (id: string) => GLOSSARY_BY_ID[id]?.short;

const NOT_INFORMED = "nao_informado";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dateField = (emptyMessage: string) =>
  z.string().min(1, emptyMessage).regex(ISO_DATE, "Data incompleta ou inexistente. Use dd/mm/aaaa");

const schema = z
  .object({
    name: z.string().trim().min(5, "Informe o nome completo do paciente"),
    birthDate: dateField("Informe a data de nascimento").refine((v) => {
      const age = (Date.now() - new Date(v).getTime()) / (365.25 * 86_400_000);
      return age >= 18 && age <= 110;
    }, "Confira o ano: a idade precisa estar entre 18 e 110 anos"),
    sex: z.enum(["F", "M"], { required_error: "Selecione o sexo" }),
    educationYears: z.preprocess(toNumber, limited("educationYears").int("Use um número inteiro")),
    examDate: dateField("Informe a data do exame").refine((v) => v <= localToday(), "A data do exame não pode estar no futuro"),
    mri: z.instanceof(File, { message: "Anexe a série T1 do exame" }),
    apoe: z.string(),
    marital: z.string(),
    icvMm3: optionalVolume("icvMm3"),
    hippocampusMm3: optionalVolume("hippocampusMm3"),
    lateralVentriclesMm3: optionalVolume("lateralVentriclesMm3"),
    notes: z.string().optional(),
  })
  .refine((v) => v.examDate >= v.birthDate, {
    path: ["examDate"],
    message: "A data do exame não pode ser anterior ao nascimento",
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

/** Atalhos que preenchem os anos de estudo; a duração usual de cada nível no Brasil. */
const EDUCATION_LEVELS = [
  { label: "Sem estudo formal", years: 0 },
  { label: "Fundamental", years: 9 },
  { label: "Médio", years: 12 },
  { label: "Superior", years: 16 },
  { label: "Pós-graduação", years: 18 },
];

/** Idade completa na data do exame, ou `undefined` enquanto as datas não estiverem válidas. */
function ageAtExam(birth?: string, exam?: string) {
  if (!birth || !exam || !ISO_DATE.test(birth) || !ISO_DATE.test(exam) || exam < birth) return undefined;
  return Number(exam.slice(0, 4)) - Number(birth.slice(0, 4)) - (exam.slice(5) < birth.slice(5) ? 1 : 0);
}

function ageHint(age?: number) {
  if (age === undefined) return "A idade é calculada na data do exame";
  const outOfRange = age < 55 || age > 90;
  return `${age} anos na data do exame${outOfRange ? " · fora da faixa de treino (55 a 90)" : ""}`;
}

export default function NewCasePage() {
  const navigate = useNavigate();
  const [uploaded, setUploaded] = useState(0);
  const createCase = useCreateCase(setUploaded);
  const formRef = useRef<HTMLFormElement>(null);
  const [dragging, setDragging] = useState(false);

  const today = localToday();
  const {
    register,
    control,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: {
      name: "",
      birthDate: "",
      examDate: today,
      apoe: NOT_INFORMED,
      marital: NOT_INFORMED,
      notes: "",
    },
  });

  const mri = watch("mri") as File | undefined;
  const age = ageAtExam(watch("birthDate"), watch("examDate"));
  const educationYears = watch("educationYears") as string | number | undefined;
  const setFile = (file: File | undefined) => file && setValue("mri", file, { shouldValidate: true });

  // valida enquanto digita, para o valor fora da faixa aparecer antes do envio
  const numeric = (field: LimitedInput) => ({
    ...register(field, { onChange: () => void trigger(field) }),
    "aria-invalid": Boolean(errors[field]),
    min: INPUT_LIMITS[field].min,
    max: INPUT_LIMITS[field].max,
  });

  const submit = (v: FormValues) => {
    setUploaded(0);
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Data de nascimento"
                htmlFor="birthDate"
                error={errors.birthDate?.message}
                hint={ageHint(age)}
                info={help("idade")}
                required
              >
                <Controller
                  control={control}
                  name="birthDate"
                  render={({ field }) => (
                    <DateInput
                      id="birthDate"
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      max={today}
                      invalid={Boolean(errors.birthDate)}
                      calendarLabel="Abrir calendário da data de nascimento"
                    />
                  )}
                />
              </Field>
              <Field
                label="Data do exame"
                htmlFor="examDate"
                error={errors.examDate?.message}
                hint="Dia em que a RM foi feita"
                info={help("data-exame")}
                required
              >
                <Controller
                  control={control}
                  name="examDate"
                  render={({ field }) => (
                    <DateInput
                      id="examDate"
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      max={today}
                      invalid={Boolean(errors.examDate)}
                      calendarLabel="Abrir calendário da data do exame"
                    />
                  )}
                />
              </Field>
            </div>
            <Field label="Sexo" error={errors.sex?.message} info={help("sexo")} required>
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
            <Field
              label="Escolaridade (anos de estudo)"
              htmlFor="educationYears"
              error={errors.educationYears?.message}
              hint={formatLimit("educationYears")}
              info={help("escolaridade")}
              required
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input id="educationYears" type="number" placeholder="anos" className="w-24" {...numeric("educationYears")} />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Preencher pelo nível de estudo">
                  {EDUCATION_LEVELS.map((level) => {
                    const active = educationYears !== "" && educationYears !== undefined && Number(educationYears) === level.years;
                    return (
                      <button
                        key={level.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setValue("educationYears", level.years, { shouldValidate: true })}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          active ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {level.label} <span className="tabular-nums opacity-70">· {level.years}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
              <Field label="Genótipo APOE" htmlFor="apoe" info={help("apoe")}>
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
              <Field label="Estado civil" htmlFor="marital" info={help("estado-civil")}>
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
                <Field
                  label="Volume intracraniano (ICV)"
                  htmlFor="icvMm3"
                  error={errors.icvMm3?.message}
                  hint={formatLimit("icvMm3")}
                  info={help("icv")}
                >
                  <Input id="icvMm3" type="number" placeholder="ex.: 1500000" {...numeric("icvMm3")} />
                </Field>
                <Field
                  label="Hipocampo (soma E + D)"
                  htmlFor="hippocampusMm3"
                  error={errors.hippocampusMm3?.message}
                  hint={formatLimit("hippocampusMm3")}
                  info={help("hipocampo")}
                >
                  <Input id="hippocampusMm3" type="number" placeholder="ex.: 7000" {...numeric("hippocampusMm3")} />
                </Field>
                <Field
                  label="Ventrículos laterais"
                  htmlFor="lateralVentriclesMm3"
                  error={errors.lateralVentriclesMm3?.message}
                  hint={formatLimit("lateralVentriclesMm3")}
                  info={help("ventriculos")}
                >
                  <Input id="lateralVentriclesMm3" type="number" placeholder="ex.: 30000" {...numeric("lateralVentriclesMm3")} />
                </Field>
              </div>
            </fieldset>

            <Field label="Observações" htmlFor="notes" hint="Opcional — não entram no modelo.">
              <Textarea id="notes" rows={2} {...register("notes")} />
            </Field>
          </CardContent>
        </Card>

        {createCase.isPending && (
          <Card>
            <CardContent className="py-5" role="status">
              <AnalysisSteps active={0} detail={<UploadDetail fraction={uploaded} sizeBytes={mri?.size ?? 0} />} />
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={createCase.isPending}>
            {!createCase.isPending && <CloudUpload />} {createCase.isPending ? "Enviando…" : "Enviar para análise"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function UploadDetail({ fraction, sizeBytes }: { fraction: number; sizeBytes: number }) {
  if (fraction >= 1) {
    return (
      <span className="block space-y-1.5">
        <ProgressBar label="Aguardando o servidor" />
        <span className="block text-xs text-muted-foreground">Exame enviado. Aguardando o servidor confirmar…</span>
      </span>
    );
  }
  const mb = (bytes: number) => (bytes / 1_048_576).toFixed(0);
  return (
    <span className="block space-y-1.5">
      <ProgressBar value={fraction} label="Envio do exame" />
      <span className="block text-xs tabular-nums text-muted-foreground">
        {Math.round(fraction * 100)}%{sizeBytes > 0 && ` · ${mb(sizeBytes * fraction)} de ${mb(sizeBytes)} MB`}
      </span>
    </span>
  );
}
