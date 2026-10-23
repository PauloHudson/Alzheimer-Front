import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { api } from "@/services/api";

const schema = z.object({ email: z.string().trim().email("E-mail inválido") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    await api.auth.requestPasswordReset(email);
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft">
          <MailCheck className="size-6 text-success" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-4xl leading-tight">Verifique seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Se houver uma conta associada a <strong className="text-foreground">{sentTo}</strong>, você receberá um
            link para criar uma nova senha. O link expira em 30 minutos.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/entrar">Voltar para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-4xl leading-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">Informe seu e-mail e enviaremos um link para redefinir a senha.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Enviar link
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link to="/entrar" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
