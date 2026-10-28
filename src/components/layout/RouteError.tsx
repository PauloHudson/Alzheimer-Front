import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Erro inesperado";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive-soft">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Algo deu errado nesta tela</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Nenhuma decisão foi registrada pela metade: registros só são gravados quando confirmados. Detalhe técnico:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{message}</code>
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
        <Button asChild>
          <Link to="/app">Voltar aos casos</Link>
        </Button>
      </div>
    </div>
  );
}
