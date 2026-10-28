import { Link, Outlet } from "react-router-dom";
import { ArrowLeft, Eye, FileCheck2, Layers } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MriViewer } from "@/features/landing/showcase/MriViewer";
import { HERO_REGIONS } from "@/features/landing/heroData";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
              <ArrowLeft className="size-4" /> Voltar ao site
            </Link>
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md animate-fade-up">
            <Outlet />
          </div>
        </main>
        <p className="text-center text-xs text-muted-foreground">A IA sugere e explica. O médico decide.</p>
      </div>

      <aside className="relative hidden overflow-hidden bg-[#070b17] dark:border-l dark:border-white/10 dark:bg-[#141416] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="relative">
          <p className="font-mono text-xs tracking-wide text-teal-300">PAC-0417 · CORONAL · CORTE 22/48</p>
          <h2 className="mt-4 max-w-md font-display text-5xl leading-[1.02] text-white text-balance">
            Entenda o porquê da sugestão. Decida com a confiança que a evidência permite.
          </h2>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <MriViewer regions={HERO_REGIONS} atrophy={0.55} compact patientCode="PAC-0417" className="shadow-2xl" />
        </div>

        <ul className="relative grid gap-4 text-sm text-white/80 xl:grid-cols-3">
          {[
            { icon: Eye, text: "Mapa de atenção sobre o corte da RM que o modelo analisou" },
            { icon: Layers, text: "Peso da imagem e dos dados clínicos em cada sugestão" },
            { icon: FileCheck2, text: "Decisão do médico registrada com justificativa" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-2.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-teal-300" />
              {text}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
