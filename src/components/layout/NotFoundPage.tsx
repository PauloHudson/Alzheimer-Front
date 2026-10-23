import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card px-6 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary-soft">
          <Compass className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O endereço pode ter mudado ou o caso pode ter sido removido da sua lista.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Página inicial</Link>
          </Button>
          <Button asChild>
            <Link to="/app">Ir para o painel</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
