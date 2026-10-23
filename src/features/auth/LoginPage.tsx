import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Clock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar } from "@/components/ui/misc";
import { api, USE_MOCK } from "@/services/api";
import { DEMO_PASSWORD, SEED_USERS } from "@/services/mock/seed";
import { useAuth } from "@/store/auth";
import { ROLE_INFO } from "@/lib/domain";
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

  const fillDemo = (email: string) => {
    setValue("email", email, { shouldValidate: true });
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
        <div className="flex justify-end">
          <Link to="/recuperar-senha" className="text-sm font-medium text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          {!isSubmitting && <LogIn />} Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link to="/cadastro" className="font-medium text-primary hover:underline">
          Solicitar acesso
        </Link>
      </p>

      {USE_MOCK && (
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm font-medium">Contas de demonstração</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Clique em um perfil para preencher. Senha: <code className="font-mono">{DEMO_PASSWORD}</code>
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SEED_USERS.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => fillDemo(user.email)}
                className="flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/40"
              >
                <Avatar name={user.name} className="size-8 text-xs" />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-medium">{user.name.replace(/^Dra?\. /, "")}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE_INFO[user.role].short}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
