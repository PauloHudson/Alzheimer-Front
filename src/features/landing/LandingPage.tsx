import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  CloudUpload,
  Cpu,
  Gavel,
  Menu,
  Plus,
  ScanLine,
  ScanSearch,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/brand/Logo";
import { ProbabilityBars } from "@/features/case-detail/components/ProbabilityBars";
import { ConfidenceMeter } from "@/components/domain/badges";
import { useAuth } from "@/store/auth";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import { useRecedeOnScroll } from "@/hooks/useRecedeOnScroll";
import { cn } from "@/lib/utils";
import { MriViewer } from "./showcase/MriViewer";
import { buildPrediction } from "./showcase/samplePrediction";
import { ScanStory } from "./ScanStory";
import { Reveal } from "./Reveal";

const NAV = [
  { href: "#problema", label: "O problema" },
  { href: "#explicacao", label: "A explicação" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#responsabilidade", label: "Limites" },
  { href: "#faq", label: "Perguntas" },
];

/** Divisão ilustrativa da atribuição entre imagem e dados clínicos no caso de exemplo. */
const SAMPLE_SHARE = { image: 0.46, tabular: 0.54 };

export default function LandingPage() {
  const user = useAuth((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  useSmoothScroll();
  const mainRef = useRef<HTMLElement>(null);
  useRecedeOnScroll(mainRef);
  const scrolled = useScrolled();
  const active = useActiveSection(NAV.map((item) => item.href));
  const floating = scrolled || menuOpen;

  const sample = useMemo(
    () =>
      buildPrediction({
        probabilities: { CN: 0.21, MCI: 0, AD: 0.79 },
        age: 71,
        sex: "M",
        educationYears: 8,
        familyHistory: false,
        hippocampusLeft: 2.98,
        hippocampusRight: 3.18,
        hippocampusPercentile: 9,
        entorhinalThickness: 3.02,
        entorhinalPercentile: 18,
        ventricularVolume: 41,
        ventricularPercentile: 66,
        generatedAt: new Date().toISOString(),
      }),
    [],
  );

  const ctaTo = user ? "/app" : "/entrar";
  const ctaLabel = user ? "Ir para os casos" : "Acessar a plataforma";

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <ScrollProgress />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-elevated"
      >
        Pular para o conteúdo
      </a>

      {/* ------------------------------------------------------------ navegação */}
      {/* No topo, integrado ao fundo; ao rolar, descola da borda e acompanha a página como barra flutuante. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 sm:px-4">
        <div
          className={cn(
            "pointer-events-auto mx-auto border transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            floating
              ? "mt-3 max-w-5xl rounded-2xl border-border bg-background/70 shadow-elevated backdrop-blur-xl"
              : "mt-0 max-w-6xl rounded-none border-transparent bg-transparent",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between transition-all duration-500",
              floating ? "h-14 px-3 sm:px-4" : "h-16 px-1 sm:px-6",
            )}
          >
            <Logo />
            <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Seções">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active === item.href ? "location" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition-colors duration-300",
                    active === item.href
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="hidden items-center gap-2 md:flex">
              <ThemeToggle />
              {user ? (
                <Button asChild size="sm">
                  <Link to="/app">Ir para os casos</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/entrar">Entrar</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/cadastro">Criar conta</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
          {menuOpen && (
            <div className="border-t px-3 pb-3 pt-2 animate-fade-in md:hidden">
              <nav className="flex flex-col gap-1" aria-label="Seções">
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm hover:bg-muted",
                      active === item.href && "bg-muted font-medium",
                    )}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <Link to="/entrar">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/cadastro">Criar conta</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>
      {/* reserva o espaço do cabeçalho fixo */}
      <div aria-hidden className="h-16" />

      <main id="conteudo" ref={mainRef}>
        {/* ------------------------------------------------------------ abertura */}
        <section className="relative isolate">
          <HeroBackdrop />
          <div
            data-recede
            className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-28 pt-14 sm:px-6 lg:grid-cols-[1fr_1.02fr] lg:pt-20"
          >
            <div>
              <p className="inline-flex animate-fade-up items-center rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-card backdrop-blur">
                IA explicável para neuroimagem
              </p>
              <h1 className="mt-6 font-display text-[3.4rem] leading-[0.98] tracking-[-0.01em] text-balance sm:text-7xl">
                <span className="block animate-fade-up [animation-delay:80ms]">A IA sugere e explica.</span>
                <em className="block animate-fade-up bg-gradient-to-r from-primary via-[#6d5dfc] to-accent bg-clip-text pr-2 text-transparent [animation-delay:200ms]">
                  Você decide.
                </em>
              </h1>
              <p className="mt-7 max-w-[34rem] animate-fade-up text-lg leading-relaxed text-muted-foreground [animation-delay:320ms]">
                Veja onde o modelo olhou na ressonância, o que pesou na sugestão e quanto confiar nela.
              </p>
              <div className="mt-9 flex animate-fade-up flex-wrap items-center gap-x-6 gap-y-3 [animation-delay:440ms]">
                <Button size="lg" asChild className="group shadow-[0_10px_30px_-10px_var(--color-primary)]">
                  <Link to={ctaTo}>
                    {ctaLabel} <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <a
                  href="#explicacao"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Ver a explicação passo a passo{" "}
                  <ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                </a>
              </div>
              <dl className="mt-12 grid max-w-md animate-fade-up grid-cols-2 gap-x-8 gap-y-4 border-t pt-6 font-mono text-xs [animation-delay:560ms]">
                {[
                  ["Entrada", "RM T1 · dados clínicos"],
                  ["Saída", "CN × DA + probabilidade"],
                  ["Explicação", "Grad-CAM · imagem × clínica"],
                  ["Decisão", "sempre do médico"],
                ].map(([term, value]) => (
                  <div key={term}>
                    <dt className="text-muted-foreground">{term}</dt>
                    <dd className="mt-1 text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* o produto, como ele é */}
            <div className="animate-fade-up [animation-delay:200ms]">
            <TiltCard className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[36px] bg-gradient-to-br from-primary/25 via-transparent to-accent/25 blur-2xl dark:from-primary/20 dark:to-accent/10" />
              <div className="rounded-[22px] border bg-card/90 p-2.5 shadow-elevated backdrop-blur">
                <div className="flex items-center justify-between px-2 pb-2.5 pt-1">
                  <span className="text-sm leading-tight">
                    <span className="block font-medium">Ivo Bittencourt · 71 anos</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">PAC-0417 · RM 23/10</span>
                  </span>
                  <Badge variant="default">Aguardando revisão</Badge>
                </div>
                <MriViewer regions={sample.regions} atrophy={0.55} compact patientCode="PAC-0417" />
              </div>

              <div className="absolute -bottom-12 -left-3 w-60 animate-float rounded-2xl border bg-card/95 p-4 shadow-elevated backdrop-blur sm:-left-12">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sugestão do modelo</p>
                <p className="mt-1 font-semibold leading-tight">Padrão compatível com Alzheimer</p>
                <ConfidenceMeter band={sample.confidence} className="mt-1" />
                <div className="mt-3">
                  <ProbabilityBars
                    prediction={{ classes: ["CN", "AD"], probabilities: sample.probabilities, suggested: sample.suggested }}
                    compact
                  />
                </div>
              </div>

              <div className="absolute -right-3 top-16 hidden w-64 animate-float rounded-2xl border bg-card/95 p-4 shadow-elevated backdrop-blur [animation-delay:-3.5s] sm:block lg:-right-10">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  De onde veio a sugestão
                </p>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                  <span className="bg-primary" style={{ width: `${SAMPLE_SHARE.image * 100}%` }} />
                  <span className="bg-accent" style={{ width: `${SAMPLE_SHARE.tabular * 100}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <ScanLine className="size-3.5 text-primary" />
                    <dt className="text-muted-foreground">Imagem</dt>
                    <dd className="ml-auto font-semibold tabular-nums">{Math.round(SAMPLE_SHARE.image * 100)}%</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="size-3.5 text-accent" />
                    <dt className="text-muted-foreground">Clínica</dt>
                    <dd className="ml-auto font-semibold tabular-nums">{Math.round(SAMPLE_SHARE.tabular * 100)}%</dd>
                  </div>
                </dl>
              </div>
            </TiltCard>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ problema */}
        <section id="problema" className="scroll-mt-16 border-t bg-card">
          <div data-recede className="mx-auto grid max-w-6xl gap-14 px-4 py-28 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div>
              <Reveal>
                <p className="font-mono text-xs uppercase tracking-wider text-primary">O problema</p>
                <h2 className="mt-4 font-display text-5xl leading-[1.02] text-balance">
                  O laudo chega. A dúvida volta para quem pediu.
                </h2>
              </Reveal>
              <div className="mt-10 space-y-7 text-[15px] leading-relaxed">
                {[
                  [
                    "A fila é de meses.",
                    "O clínico decide sozinho enquanto espera o neurologista.",
                  ],
                  [
                    "O laudo não responde à pergunta clínica.",
                    "O caso limítrofe recebe a frase cautelosa de sempre.",
                  ],
                  [
                    "O raciocínio se perde.",
                    "O parecer por telefone vira uma nota de rodapé.",
                  ],
                ].map(([title, text], i) => (
                  <Reveal key={title} delay={120 + i * 110}>
                    <p className="border-l-2 border-primary/30 pl-4">
                      <strong className="font-semibold">{title}</strong>{" "}
                      <span className="text-muted-foreground">{text}</span>
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal delay={150} className="self-start">
              <figure>
                <div className="rotate-[0.6deg] rounded-sm border border-slate-300 bg-[#fdfdfb] px-7 py-8 font-mono text-[13px] leading-relaxed text-slate-800 shadow-[0_18px_40px_-20px_rgb(15_23_42/0.35)] transition-transform duration-500 hover:rotate-0 hover:scale-[1.01] dark:border-slate-600 dark:bg-[#e9e8e2]">
                  <div className="flex items-baseline justify-between border-b border-dashed border-slate-300 pb-3 text-[11px] uppercase tracking-wider text-slate-500">
                    <span>Laudo · RM de crânio</span>
                    <span>Telerradiologia</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-[7.5rem_1fr] gap-y-1.5 text-[12px]">
                    <dt className="text-slate-500">Indicação</dt>
                    <dd>Investigação de déficit cognitivo</dd>
                    <dt className="text-slate-500">Dados clínicos</dt>
                    <dd>72 anos.</dd>
                    <dt className="text-slate-500">Comparação</dt>
                    <dd>Não há exame anterior.</dd>
                  </dl>
                  <p className="mt-5 text-[11px] uppercase tracking-wider text-slate-500">Impressão</p>
                  <p className="mt-1.5">
                    <span className="highlight-mark">
                      Redução volumétrica hipocampal discreta, que pode ser compatível com a faixa etária.
                    </span>{" "}
                    <span className="highlight-mark">Correlacionar com dados clínicos.</span>
                  </p>
                  <p className="mt-6 text-right text-[11px] text-slate-400">Fila: 41 exames · prazo por laudo</p>
                </div>
                <figcaption className="mt-5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Laudo típico de um caso limítrofe.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------ explicação guiada pela rolagem */}
        <section id="explicacao" className="relative scroll-mt-16 overflow-clip bg-[#070b17] text-white dark:border-y dark:border-white/10 dark:bg-[#141416]">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(91_120_246/0.28),transparent)] blur-2xl dark:bg-[radial-gradient(closest-side,rgb(168_85_247/0.12),transparent)]"
          />
          <div data-recede className="relative mx-auto max-w-6xl px-4 pt-28 sm:px-6">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-wider text-teal-300">A explicação</p>
              <h2 className="mt-4 max-w-2xl font-display text-5xl leading-[1.02] text-balance">
                Da imagem à decisão, uma camada por vez.
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-white/65">
                Role para montar a sugestão do Sr. Ivo, 71 anos.
              </p>
            </Reveal>
          </div>
          <div data-recede className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <ScanStory prediction={sample} share={SAMPLE_SHARE} />
          </div>
        </section>

        {/* ------------------------------------------------------------ como funciona */}
        <section id="como-funciona" className="scroll-mt-16">
          <div data-recede className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
            <Reveal className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-primary">Como funciona</p>
                <h2 className="mt-4 font-display text-5xl leading-[1.02] text-balance">
                  Do exame à decisão em quatro passos.
                </h2>
              </div>
            </Reveal>

            <ol className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: CloudUpload,
                  title: "Envie o exame",
                  text: "RM T1 e dados clínicos do paciente.",
                },
                {
                  icon: Cpu,
                  title: "O modelo analisa",
                  text: "Imagem e clínica viram uma probabilidade.",
                },
                {
                  icon: ScanSearch,
                  title: "Revise a explicação",
                  text: "Mapa de atenção e peso de cada fonte.",
                },
                {
                  icon: Gavel,
                  title: "Registre a decisão",
                  text: "Concorde ou discorde, com justificativa.",
                  primary: true,
                },
              ].map((step, i) => (
                <li key={step.title}>
                  <Reveal delay={i * 120} className="h-full">
                    <div
                      className={cn(
                        "group relative h-full overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-elevated",
                        step.primary && "border-primary/40",
                      )}
                    >
                      <div
                        aria-hidden
                        className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl transition-transform duration-700 group-hover:scale-150"
                      />
                      <div className="relative flex items-center justify-between">
                        <span
                          className={cn(
                            "flex size-11 items-center justify-center rounded-xl transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-110",
                            step.primary ? "bg-primary text-white" : "bg-primary-soft text-primary",
                          )}
                        >
                          <step.icon className="size-5" />
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                      </div>
                      <h3 className="relative mt-6 text-lg font-semibold">{step.title}</h3>
                      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ limites */}
        <section id="responsabilidade" className="scroll-mt-16 border-t bg-card">
          <div data-recede className="mx-auto grid max-w-6xl gap-14 px-4 py-28 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-wider text-primary">Limites</p>
              <h2 className="mt-4 font-display text-5xl leading-[1.02] text-balance">
                Confiança na medida certa, não confiança máxima.
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
                O sistema mostra o que o modelo faz e, com o mesmo destaque, o que ele não faz.
              </p>
            </Reveal>
            <dl className="divide-y border-y">
              {[
                {
                  term: "A decisão é do médico",
                  text: "A tela diz “sugestão”, nunca “diagnóstico”.",
                },
                {
                  term: "Treinado no ADNI",
                  text: "Ainda não validado na população brasileira.",
                },
                {
                  term: "Testes cognitivos ficam de fora",
                  text: "MMSE e MoCA não entram no cálculo.",
                },
                {
                  term: "O registro não se edita",
                  text: "Fica registrado com autor e horário.",
                },
              ].map(({ term, text }, i) => (
                <Reveal key={term} delay={i * 90}>
                  <div className="grid gap-1 py-5 sm:grid-cols-[14rem_1fr] sm:gap-8">
                    <dt className="font-semibold">{term}</dt>
                    <dd className="text-sm leading-relaxed text-muted-foreground">{text}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------------------------------------ perguntas */}
        <section id="faq" className="scroll-mt-16">
          <div data-recede className="mx-auto grid max-w-6xl gap-12 px-4 py-28 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-wider text-primary">Perguntas</p>
              <h2 className="mt-4 font-display text-5xl leading-[1.02] text-balance">Antes de começar</h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="border-t">
                {FAQ.map((item) => (
                  <FaqItem key={item.q} {...item} />
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------ chamada final */}
        <section className="px-4 pb-28 sm:px-6">
          <Reveal className="mx-auto max-w-6xl">
            <div className="relative isolate overflow-hidden rounded-[28px] bg-[#070b17] px-6 py-16 text-white shadow-elevated sm:px-14 sm:py-20 dark:bg-[#18181b] dark:ring-1 dark:ring-white/10">
              <div
                aria-hidden
                className="absolute -left-24 -top-24 -z-10 size-[420px] animate-drift rounded-full bg-[radial-gradient(closest-side,rgb(91_120_246/0.55),transparent)] blur-2xl dark:bg-[radial-gradient(closest-side,rgb(168_85_247/0.32),transparent)]"
              />
              <div
                aria-hidden
                className="absolute -bottom-32 -right-20 -z-10 size-[460px] animate-drift rounded-full bg-[radial-gradient(closest-side,rgb(45_212_191/0.4),transparent)] blur-2xl [animation-delay:-9s] dark:bg-[radial-gradient(closest-side,rgb(34_211_238/0.16),transparent)]"
              />
              <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                <div>
                  <h2 className="font-display text-5xl leading-[1.02] text-balance sm:text-6xl">
                    Explicação em cada sugestão. Decisão sempre sua.
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Button size="lg" asChild className="group bg-white text-[#070b17] hover:bg-white/90 dark:text-[#18181b]">
                    <Link to={ctaTo}>
                      {ctaLabel}{" "}
                      <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  {!user && (
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link to="/cadastro">Criar conta</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Apoio ao diagnóstico explicável da doença de Alzheimer a partir de ressonância magnética e dados
              clínicos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Conteúdo</p>
              {NAV.slice(1, 4).map((item) => (
                <a key={item.href} href={item.href} className="block text-muted-foreground hover:text-foreground">
                  {item.label}
                </a>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-medium">Acesso</p>
              <Link to="/entrar" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                Entrar <ArrowUpRight className="size-3.5" />
              </Link>
              <Link to="/cadastro" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                Criar conta <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
        <p className="border-t py-5 text-center font-mono text-[11px] text-muted-foreground">
          M-XAI · A IA sugere e explica. O médico decide.
        </p>
      </footer>
    </div>
  );
}

const FAQ = [
  {
    q: "O sistema faz o diagnóstico?",
    a: "Não. Ele sugere um padrão, CN ou DA, e explica por quê. A decisão é do médico.",
  },
  {
    q: "Preciso saber interpretar ressonância magnética?",
    a: "Não. O mapa de atenção e o peso de cada fonte aparecem em linguagem clínica.",
  },
  {
    q: "Quais dados entram no modelo?",
    a: "RM T1, idade, sexo, escolaridade, APOE, estado civil e volumetria. O que faltar é estimado pelo modelo.",
  },
  {
    q: "Com quais dados o modelo foi treinado?",
    a: "Com dados do ADNI, uma base de pesquisa norte-americana. Ainda não foi validado no Brasil.",
  },
  {
    q: "E se eu discordar da sugestão?",
    a: "Registre que discorda e por quê. Discordar é um caminho previsto.",
  },
  {
    q: "Como os dados dos pacientes são protegidos?",
    a: "Listas usam identificadores pseudonimizados e a sessão expira por inatividade.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="border-b">
      <Collapsible.Trigger className="group flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-medium transition-colors hover:text-primary">
        {q}
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
            open ? "rotate-45 border-primary bg-primary text-white" : "text-muted-foreground group-hover:border-primary/50",
          )}
        >
          <Plus className="size-3.5" />
        </span>
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <p className="pb-5 pr-10 text-sm leading-relaxed text-muted-foreground">{a}</p>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/** Fundo da abertura: dois brilhos suaves que derivam devagar (neutros no modo escuro). */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-32 size-[560px] animate-drift rounded-full bg-[radial-gradient(closest-side,rgb(47_74_192/0.18),transparent)] blur-2xl dark:bg-[radial-gradient(closest-side,rgb(168_85_247/0.13),transparent)]" />
      <div className="absolute -right-32 top-24 size-[520px] animate-drift rounded-full bg-[radial-gradient(closest-side,rgb(13_148_136/0.16),transparent)] blur-2xl [animation-delay:-9s] dark:bg-[radial-gradient(closest-side,rgb(34_211_238/0.07),transparent)]" />
    </div>
  );
}

/** Inclina levemente o conteúdo na direção do ponteiro, dando profundidade ao produto. */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(1200px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
    });
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={cn("transition-transform duration-300 ease-out [transform-style:preserve-3d]", className)}
    >
      {children}
    </div>
  );
}

/** Barra fina no topo que acompanha o quanto da página já foi lido. */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary via-[#6d5dfc] to-accent"
    />
  );
}

/** Seção visível no momento (a última cujo topo já passou de 35% da tela), para destacar o link no menu. */
function useActiveSection(hrefs: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = hrefs.join(",");
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const href of key.split(",")) {
        const el = document.querySelector(href);
        if (el && el.getBoundingClientRect().top <= line) current = href;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);
  return active;
}

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}
