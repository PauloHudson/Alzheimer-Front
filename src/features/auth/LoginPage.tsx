import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Clock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { api, USE_MOCK } from "@/services/api";
import { DEMO_PASSWORD, DEMO_USER } from "@/services/mock/seed";
import { useAuth } from "@/store/auth";
import { PasswordInput } from "./PasswordInput";

const schema = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; reason?: string } | null;
  const setSession = useAuth((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const session = await api.auth.login(values);
      setSession(session);
      navigate(state?.from && state.from.startsWith("/app") ? state.from : "/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.");
    }
  };

  const fillDemo = () => {
    setValue("email", DEMO_USER.email, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-4xl leading-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse com seu e-mail institucional.</p>
      </div>

      {state?.reason === "inatividade" && (
        <div className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
          <Clock className="mt-0.5 size-4 shrink-0" />
          Sua sessão foi encerrada após 15 minutos sem atividade, para proteger os dados dos pacientes.
        </div>
      )}

      {error && (
        <div role="alert" className="flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nome@hospital.org.br"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </Field>
        <Field label="Senha" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          {!isSubmitting && <LogIn />} Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link to="/cadastro" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>

      {USE_MOCK && (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-card">
          <div>
            <p className="text-sm font-medium">Conta de demonstração</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <code className="font-mono">{DEMO_USER.email}</code> · senha <code className="font-mono">{DEMO_PASSWORD}</code>
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fillDemo}>
            Preencher
          </Button>
        </div>
      )}
    </div>
  );
}

