import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  CloudUpload,
  Download,
  FileImage,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/label";
import { Checkbox, RadioCard, RadioGroup, Switch } from "@/components/ui/misc";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { useCreateCase } from "@/hooks/useCases";
import { useAuth } from "@/store/auth";
import { canCreateCase } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { focusFirstError } from "@/lib/forms";
import type { NewCaseInput } from "@/types";

const optionalScore = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)),
    z.number({ invalid_type_error: "Valor inválido" }).min(0, "Mínimo 0").max(max, `Máximo ${max}`).optional(),
  );

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
  identityConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Confirme a identidade do paciente antes de continuar" }),
  }),
  fileName: z.string().min(1, "Anexe o arquivo da RM"),
  fileSizeMb: z.number(),
  volumetricT1: z.boolean(),
  fullCoverage: z.boolean(),
  motionArtifact: z.enum(["nenhum", "leve", "grave"]),
  notes: z.string().optional(),
  mmse: optionalScore(30),
  moca: optionalScore(30),
  cdrSb: optionalScore(18),
  familyHistory: z.boolean(),
  chiefComplaint: z.string().trim().min(5, "Descreva a queixa principal"),
  clinicalQuestion: z.string().trim().min(10, "Formule a pergunta clínica que o médico quer responder"),
  familyReport: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const STEPS: { title: string; description: string; fields: FieldPath<FormInput>[] }[] = [
  {
    title: "Paciente",
    description: "Identificação e confirmação de identidade",
    fields: ["name", "birthDate", "sex", "educationYears", "examDate", "identityConfirmed"],
  },
  {
    title: "Aquisição da RM",
    description: "Arquivo e conferência de qualidade",
    fields: ["fileName", "volumetricT1", "fullCoverage", "motionArtifact"],
  },
  {
    title: "Dados clínicos",
    description: "Testes cognitivos e pergunta clínica",
    fields: ["mmse", "moca", "cdrSb", "chiefComplaint", "clinicalQuestion"],
  },
  { title: "Conferência", description: "Revise antes de liberar o paciente", fields: [] },
];

/** Dados fictícios "importados do prontuário" — evita redigitação (T03, GOMS 3.A). */
const EHR_SAMPLE = {
  mmse: 25,
  moca: 22,
  familyHistory: true,
  chiefComplaint: "Esquecimento de fatos recentes e repetição de perguntas há cerca de 1 ano.",
  clinicalQuestion: "Há padrão de imagem compatível com doença de Alzheimer ou com comprometimento cognitivo leve?",
};

export default function NewCasePage() {
  const user = useAuth((s) => s.user)!;
  const navigate = useNavigate();
  const createCase = useCreateCase();
  const [step, setStep] = useState(0);
  const [imported, setImported] = useState(false);
  const [dragging, setDragging] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: {
      name: "",
      birthDate: "",
      educationYears: 8,
      examDate: today,
      fileName: "",
      fileSizeMb: 0,
      volumetricT1: true,
      fullCoverage: true,
      motionArtifact: "nenhum",
      notes: "",
      mmse: "" as unknown as number,
      moca: "" as unknown as number,
      cdrSb: "" as unknown as number,
      familyHistory: false,
      chiefComplaint: "",
      clinicalQuestion: "",
      familyReport: "",
    },
  });
  const {
    register,
    control,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = form;

  const values = watch();

  /** Pendências que bloqueiam o envio para análise (H07 — conferir antes de liberar o paciente). */
  const blocking = useMemo(() => {
    const items: string[] = [];
    if (!values.volumetricT1) items.push("Sequência T1 volumétrica ausente");
    if (!values.fullCoverage) items.push("Cobertura incompleta do encéfalo");
    if (values.motionArtifact === "grave") items.push("Artefato de movimento grave");
    const hasTest = [values.mmse, values.moca].some((v) => v !== "" && v !== undefined && v !== null);
    if (!hasTest) items.push("Nenhum teste cognitivo (MMSE ou MoCA)");
    return items;
  }, [values.volumetricT1, values.fullCoverage, values.motionArtifact, values.mmse, values.moca]);

  const warnings = useMemo(() => {
    const items: string[] = [];
    if (values.motionArtifact === "leve") items.push("Artefato de movimento leve — volumes podem ter pequena imprecisão");
    if (!values.familyReport) items.push("Sem relato de familiar ou acompanhante");
    return items;
  }, [values.motionArtifact, values.familyReport]);

  const formRef = useRef<HTMLFormElement>(null);
  const [attempted, setAttempted] = useState(false);

  // Depois de uma tentativa de avançar, os erros acompanham a digitação. Sem isso, a mensagem só
  // sumiria no blur e o layout se deslocaria no meio do clique seguinte do usuário.
  useEffect(() => {
    if (!attempted) return;
    const subscription = watch((_, { name }) => {
      if (name) void trigger(name);
    });
    return () => subscription.unsubscribe();
  }, [attempted, watch, trigger]);

  const next = async () => {
    const ok = await trigger(STEPS[step]!.fields);
    if (ok) {
      setAttempted(false);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo({ top: 0 });
    } else {
      setAttempted(true);
      focusFirstError(formRef.current);
    }
  };

  const onFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      setValue("fileName", file.name, { shouldValidate: true });
      setValue("fileSizeMb", Math.round((file.size / 1_048_576) * 10) / 10);
    },
    [setValue],
  );

  const importFromEhr = () => {
    setValue("mmse", EHR_SAMPLE.mmse, { shouldValidate: true });
    setValue("moca", EHR_SAMPLE.moca, { shouldValidate: true });
    setValue("familyHistory", EHR_SAMPLE.familyHistory);
    if (!values.chiefComplaint) setValue("chiefComplaint", EHR_SAMPLE.chiefComplaint, { shouldValidate: true });
    if (!values.clinicalQuestion) setValue("clinicalQuestion", EHR_SAMPLE.clinicalQuestion, { shouldValidate: true });
    setImported(true);
  };

  const submit = (v: FormValues) => {
    const input: NewCaseInput = {
      patient: { name: v.name, birthDate: v.birthDate, sex: v.sex, educationYears: v.educationYears },
      examDate: v.examDate,
      fileName: v.fileName,
      fileSizeMb: v.fileSizeMb,
      identityConfirmed: v.identityConfirmed,
      acquisition: {
        volumetricT1: v.volumetricT1,
        fullCoverage: v.fullCoverage,
        motionArtifact: v.motionArtifact,
        notes: v.notes || undefined,
      },
      clinical: {
        mmse: v.mmse,
        moca: v.moca,
        cdrSb: v.cdrSb,
        familyHistory: v.familyHistory,
        chiefComplaint: v.chiefComplaint,
        clinicalQuestion: v.clinicalQuestion,
        familyReport: v.familyReport || undefined,
      },
    };
    createCase.mutate(input, { onSuccess: (created) => navigate(`/app/casos/${created.id}`) });
  };

  if (!canCreateCase(user.role)) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center text-sm text-muted-foreground">
        Seu perfil não cria casos. <Link to="/app/casos" className="text-primary hover:underline">Ver casos</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link to="/app/casos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Casos
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Novo caso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faça a conferência enquanto o paciente ainda está no setor — depois que ele sai, corrigir custa uma
          reconvocação.
        </p>
      </div>

      {/* indicador de etapas */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && setStep(i)}
              className="w-full text-left disabled:cursor-default"
              aria-current={i === step ? "step" : undefined}
            >
              <span className={cn("block h-1 rounded-full", i <= step ? "bg-primary" : "bg-border")} />
              <span className="mt-2 flex items-center gap-1.5 text-xs font-medium sm:text-sm">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                    i < step ? "bg-primary text-white" : i === step ? "border-2 border-primary text-primary" : "border text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn("truncate", i > step && "text-muted-foreground")}>{s.title}</span>
              </span>
              <span className="mt-0.5 hidden text-xs text-muted-foreground md:block">{s.description}</span>
            </button>
          </li>
        ))}
      </ol>

      <form ref={formRef} onSubmit={handleSubmit(submit, () => focusFirstError(formRef.current))} noValidate>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card>
            {/* ---------------------------------------------- 1. paciente */}
            {step === 0 && (
              <>
                <CardHeader>
                  <CardTitle>Paciente</CardTitle>
                  <CardDescription>Use os dados do pedido médico e confira com o paciente ou acompanhante.</CardDescription>
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
                  <div
                    className={cn(
                      "rounded-lg border p-4",
                      errors.identityConfirmed ? "border-destructive bg-destructive-soft/40" : "bg-muted/30",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Controller
                        control={control}
                        name="identityConfirmed"
                        render={({ field }) => (
                          <Checkbox
                            id="identity"
                            checked={field.value === true}
                            onCheckedChange={(v) => field.onChange(v === true)}
                            className="mt-0.5"
                          />
                        )}
                      />
                      <Label htmlFor="identity" className="space-y-1 font-normal leading-snug">
                        <span className="flex items-center gap-1.5 font-medium">
                          <ShieldCheck className="size-4 text-accent" /> Confirmei a identidade do paciente
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Nome e data de nascimento conferidos com documento ou acompanhante. Evita associar imagens e
                          dados a pacientes diferentes.
                        </span>
                      </Label>
                    </div>
                    {errors.identityConfirmed && (
                      <p role="alert" className="mt-2 text-xs text-destructive">{errors.identityConfirmed.message}</p>
                    )}
                  </div>
                </CardContent>
              </>
            )}

            {/* ---------------------------------------------- 2. aquisição */}
            {step === 1 && (
              <>
                <CardHeader>
                  <CardTitle>Aquisição da RM</CardTitle>
                  <CardDescription>Anexe o exame e registre a qualidade em linguagem de aquisição.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {values.fileName ? (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                      <span className="flex size-10 items-center justify-center rounded-md bg-primary-soft">
                        <FileImage className="size-5 text-primary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{values.fileName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {values.fileSizeMb ? `${values.fileSizeMb} MB · ` : ""}pronto para envio
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover arquivo"
                        onClick={() => setValue("fileName", "", { shouldValidate: true })}
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
                        onFile(e.dataTransfer.files[0]);
                      }}
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                        dragging ? "border-primary bg-primary-soft/50" : "hover:border-primary/40 hover:bg-muted/40",
                        errors.fileName && "border-destructive",
                      )}
                    >
                      <CloudUpload className="size-8 text-muted-foreground" />
                      <span className="text-sm font-medium">Arraste o arquivo ou clique para selecionar</span>
                      <span className="text-xs text-muted-foreground">DICOM (.dcm, .zip) ou NIfTI (.nii, .nii.gz)</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".dcm,.zip,.nii,.gz"
                        onChange={(e) => onFile(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setValue("fileName", "RM_cranio_T1_3D.zip", { shouldValidate: true });
                          setValue("fileSizeMb", 184.6);
                        }}
                        className="mt-1 text-xs font-medium text-primary hover:underline"
                      >
                        Usar exame de exemplo
                      </button>
                    </label>
                  )}
                  {errors.fileName && <p role="alert" className="-mt-3 text-xs text-destructive">{errors.fileName.message}</p>}

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Conferência de qualidade</p>
                    <ToggleRow
                      label={<><GlossaryTerm id="t1-volumetrica">Sequência T1 volumétrica</GlossaryTerm> adquirida</>}
                      hint="Obrigatória para medir o hipocampo."
                      checked={values.volumetricT1}
                      onChange={(v) => setValue("volumetricT1", v)}
                    />
                    <ToggleRow
                      label="Cobertura completa do encéfalo"
                      hint="Incluindo lobos temporais e cerebelo."
                      checked={values.fullCoverage}
                      onChange={(v) => setValue("fullCoverage", v)}
                    />
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium">Artefato de movimento</p>
                      <Controller
                        control={control}
                        name="motionArtifact"
                        render={({ field }) => (
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="mt-2 grid grid-cols-3 gap-2">
                            {(["nenhum", "leve", "grave"] as const).map((level) => (
                              <RadioCard
                                key={level}
                                value={level}
                                className={cn(
                                  "justify-center py-2 font-medium capitalize",
                                  level === "grave" && "data-[state=checked]:border-destructive data-[state=checked]:bg-destructive-soft data-[state=checked]:ring-destructive",
                                )}
                              >
                                {level}
                              </RadioCard>
                            ))}
                          </RadioGroup>
                        )}
                      />
                      {values.motionArtifact === "grave" && (
                        <p className="mt-2 text-xs text-destructive">
                          Se o paciente tolerar, repita a sequência agora. Com artefato grave a análise fica bloqueada.
                        </p>
                      )}
                    </div>
                    <Field label="Observações da aquisição" htmlFor="notes">
                      <Textarea id="notes" rows={2} placeholder="Ex.: paciente inquieto; sequência coronal repetida." {...register("notes")} />
                    </Field>
                  </div>
                </CardContent>
              </>
            )}

            {/* ---------------------------------------------- 3. dados clínicos */}
            {step === 2 && (
              <>
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle>Dados clínicos</CardTitle>
                    <CardDescription>O modelo usa os testes; a pergunta clínica acompanha o caso até quem decide.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={importFromEhr} disabled={imported}>
                    {imported ? <CheckCircle2 /> : <Download />} {imported ? "Importado" : "Importar do prontuário"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {imported && (
                    <p className="rounded-lg bg-success-soft px-3 py-2 text-xs text-success">
                      MMSE, MoCA e histórico familiar importados do prontuário. Confira os valores.
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="MMSE (0–30)" htmlFor="mmse" error={errors.mmse?.message}>
                      <Input id="mmse" type="number" min={0} max={30} {...register("mmse")} />
                    </Field>
                    <Field label="MoCA (0–30)" htmlFor="moca" error={errors.moca?.message}>
                      <Input id="moca" type="number" min={0} max={30} {...register("moca")} />
                    </Field>
                    <Field label="CDR-SB (0–18)" htmlFor="cdrSb" error={errors.cdrSb?.message} hint="Opcional">
                      <Input id="cdrSb" type="number" min={0} max={18} step={0.5} {...register("cdrSb")} />
                    </Field>
                  </div>
                  <ToggleRow
                    label="Histórico familiar de demência"
                    hint="Parente de primeiro grau."
                    checked={values.familyHistory}
                    onChange={(v) => setValue("familyHistory", v)}
                  />
                  <Field label="Queixa principal" htmlFor="chiefComplaint" error={errors.chiefComplaint?.message} required>
                    <Textarea id="chiefComplaint" rows={2} {...register("chiefComplaint")} />
                  </Field>
                  <Field
                    label="Pergunta clínica"
                    htmlFor="clinicalQuestion"
                    error={errors.clinicalQuestion?.message}
                    hint="O que o médico solicitante quer saber com este exame?"
                    required
                  >
                    <Textarea id="clinicalQuestion" rows={2} {...register("clinicalQuestion")} />
                  </Field>
                  <Field label="Relato de familiar ou acompanhante" htmlFor="familyReport" hint="Opcional — episódios do dia a dia.">
                    <Textarea id="familyReport" rows={2} {...register("familyReport")} />
                  </Field>
                </CardContent>
              </>
            )}

            {/* ---------------------------------------------- 4. conferência */}
            {step === 3 && (
              <>
                <CardHeader>
                  <CardTitle>Conferência final</CardTitle>
                  <CardDescription>Último momento em que a correção ainda é barata.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <Summary label="Paciente" value={`${values.name} · ${values.sex === "F" ? "feminino" : "masculino"}`} />
                    <Summary label="Nascimento" value={values.birthDate ? new Date(values.birthDate).toLocaleDateString("pt-BR") : "—"} />
                    <Summary label="Arquivo" value={values.fileName || "—"} />
                    <Summary label="Testes" value={`MMSE ${values.mmse || "—"} · MoCA ${values.moca || "—"} · CDR-SB ${values.cdrSb || "—"}`} />
                    <Summary label="Pergunta clínica" value={values.clinicalQuestion} wide />
                  </dl>
                  {blocking.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive-soft/60 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                        <CircleAlert className="size-4" /> {blocking.length} item(ns) obrigatório(s) pendente(s)
                      </p>
                      <ul className="list-disc space-y-1 pl-6 text-sm text-destructive">
                        {blocking.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground">
                        Se ainda for possível, corrija com o paciente no setor. Caso contrário, salve com pendência — o
                        médico solicitante será avisado e o caso não será analisado até ser corrigido.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success-soft/60 p-4 text-sm text-success">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                      Todos os itens obrigatórios conferidos. O paciente pode ser liberado.
                    </div>
                  )}
                  {warnings.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {warnings.map((w) => (
                        <li key={w} className="flex items-center gap-1.5">
                          <CircleAlert className="size-3.5 text-warning" /> {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </>
            )}

            <div className="flex items-center justify-between gap-3 border-t p-5">
              <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft /> Voltar
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={() => void next()}>
                  Continuar <ArrowRight />
                </Button>
              ) : blocking.length > 0 ? (
                <Button type="submit" variant="outline" loading={createCase.isPending}>
                  <Save /> Salvar com pendência
                </Button>
              ) : (
                <Button type="submit" loading={createCase.isPending}>
                  <CloudUpload /> Enviar para análise
                </Button>
              )}
            </div>
          </Card>

          {/* checklist sempre visível */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Checklist do caso</CardTitle>
                <CardDescription>Atualiza enquanto você preenche.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <ChecklistItem ok={values.identityConfirmed === true} label="Identidade confirmada" />
                  <ChecklistItem ok={Boolean(values.fileName)} label="RM anexada" />
                  <ChecklistItem ok={values.volumetricT1} label="T1 volumétrica" />
                  <ChecklistItem ok={values.fullCoverage} label="Cobertura completa" />
                  <ChecklistItem ok={values.motionArtifact !== "grave"} label="Sem artefato grave" />
                  <ChecklistItem ok={!blocking.includes("Nenhum teste cognitivo (MMSE ou MoCA)")} label="Teste cognitivo" />
                  <ChecklistItem ok={(values.clinicalQuestion ?? "").trim().length >= 10} label="Pergunta clínica" />
                </ul>
              </CardContent>
            </Card>
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Preparado por <strong className="text-foreground">{user.name}</strong>. O registro fica na trilha de
              auditoria do caso.
            </p>
          </aside>
        </div>
      </form>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2", ok ? "text-foreground" : "text-muted-foreground")}>
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full border",
          ok && "border-success bg-success text-white",
        )}
      >
        {ok && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      {label}
    </li>
  );
}

function Summary({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
