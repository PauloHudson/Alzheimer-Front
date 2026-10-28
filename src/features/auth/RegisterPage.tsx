import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/misc";
import { api } from "@/services/api";
import { useAuth } from "@/store/auth";
import { PasswordInput } from "./PasswordInput";

const schema = z
  .object({
    name: z.string().trim().min(5, "Informe o nome completo"),
    email: z.string().trim().email("E-mail inválido"),
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
      .regex(/\d/, "Inclua ao menos um número"),
    confirm: z.string(),
    consent: z.literal(true, { errorMap: () => ({ message: "É preciso aceitar os termos para continuar" }) }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não coincidem" });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = async ({ confirm: _c, consent: _k, ...values }: FormValues) => {
    setError(null);
    try {
      const session = await api.auth.register(values);
      setSession(session);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    }
  };

  const invalid = (name: keyof FormValues) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-4xl leading-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">O acesso é restrito a profissionais de saúde.</p>
      </div>

      {error && (
        <div role="alert" className="flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Nome completo" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" {...invalid("name")} {...register("name")} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...invalid("email")} {...register("email")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" htmlFor="password" error={errors.password?.message} hint="8+ caracteres, letras e números" required>
            <PasswordInput id="password" autoComplete="new-password" {...invalid("password")} {...register("password")} />
          </Field>
          <Field label="Confirmar senha" htmlFor="confirm" error={errors.confirm?.message} required>
            <PasswordInput id="confirm" autoComplete="new-password" {...invalid("confirm")} {...register("confirm")} />
          </Field>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-start gap-2.5">
            <Controller
              control={control}
              name="consent"
              render={({ field }) => (
                <Checkbox
                  id="consent"
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  className="mt-0.5"
                  aria-invalid={Boolean(errors.consent)}
                />
              )}
            />
            <Label htmlFor="consent" className="text-sm font-normal leading-snug text-muted-foreground">
              Declaro que sou profissional de saúde, que usarei os dados de pacientes apenas para fins assistenciais
              (LGPD, art. 11) e que entendo que as sugestões do sistema não substituem o julgamento clínico.
            </Label>
          </div>
          {errors.consent && (
            <p role="alert" className="text-xs text-destructive">
              {errors.consent.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/entrar" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
