import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/Logo";
import { MriViewer } from "@/features/viewer/MriViewer";
import { ProbabilityBars } from "@/features/case-detail/components/ProbabilityBars";
import { FeatureContributions } from "@/features/case-detail/components/FeatureContributions";
import { ConfidenceMeter } from "@/components/domain/badges";
import { buildPrediction } from "@/services/mock/prediction";
import { DEMO_PASSWORD, SEED_USERS } from "@/services/mock/seed";
import { useAuth } from "@/store/auth";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import { useRecedeOnScroll } from "@/hooks/useRecedeOnScroll";
import { ROLE_INFO } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { ScanStory } from "./ScanStory";

const NAV = [
  { href: "#problema", label: "O problema" },
  { href: "#explicacao", label: "A explicação" },
  { href: "#quem-usa", label: "Quem usa" },
  { href: "#responsabilidade", label: "Limites" },
  { href: "#faq", label: "Perguntas" },
];

export default function LandingPage() {
  const user = useAuth((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  useSmoothScroll();
  const mainRef = useRef<HTMLElement>(null);
  useRecedeOnScroll(mainRef);

  const sample = useMemo(
    () =>
      buildPrediction({
        probabilities: { CN: 0.16, MCI: 0.58, AD: 0.26 },
        age: 71,
        sex: "M",
        educationYears: 8,
        familyHistory: false,
        mmse: 24,
        moca: 21,
        hippocampusLeft: 2.98,
        hippocampusRight: 3.18,
        hippocampusPercentile: 9,
        entorhinalThickness: 3.02,
        entorhinalPercentile: 18,
        ventricularVolume: 41,
        ventricularPercentile: 66,
        priorMmse: 26,
        generatedAt: new Date().toISOString(),
      }),
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-elevated"
      >
        Pular para o conteúdo
      </a>

      {/* ------------------------------------------------------------ navegação */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Seções">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Button asChild size="sm">
                <Link to="/app">Abrir painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/entrar">Entrar</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/cadastro">Solicitar acesso</Link>
                </Button>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <div className="border-t bg-card px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Seções">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
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
                <Link to="/cadastro">Solicitar acesso</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main id="conteudo" ref={mainRef}>
        {/* ------------------------------------------------------------ abertura */}
        <section data-recede className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[1fr_1.02fr] lg:pt-20">
          <div className="animate-fade-up">
            <p className="font-mono text-xs tracking-wide text-muted-foreground">
              TCC M-XAI Net · Centro Universitário FEI · IHC 2026
            </p>
            <h1 className="mt-6 font-display text-[3.4rem] leading-[0.98] tracking-[-0.01em] text-balance sm:text-7xl">
              A IA sugere e explica. <em className="text-primary">Você decide.</em>
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
              Apoio ao diagnóstico da doença de Alzheimer para o médico clínico que não é especialista em neuroimagem:
              onde o modelo olhou na ressonância, por que chegou à sugestão e o quanto confiar nela.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button size="lg" asChild>
                <Link to={user ? "/app" : "/entrar"}>
                  {user ? "Ir para o painel" : "Acessar demonstração"} <ArrowRight />
                </Link>
              </Button>
              <a
                href="#explicacao"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Ver a explicação passo a passo <ArrowDown className="size-4" />
              </a>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-2 gap-x-8 gap-y-4 border-t pt-6 font-mono text-xs">
              <div>
                <dt className="text-muted-foreground">Entrada</dt>
                <dd className="mt-1 text-foreground">RM T1 3D · MMSE · MoCA</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Saída</dt>
                <dd className="mt-1 text-foreground">CN · CCL · DA + explicação</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Explicação</dt>
                <dd className="mt-1 text-foreground">Grad-CAM · SHAP · biomarcadores</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Decisão</dt>
                <dd className="mt-1 text-foreground">sempre do médico</dd>
              </div>
            </dl>
          </div>

          {/* o produto, como ele é */}
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="rounded-[22px] border bg-card p-2.5 shadow-elevated">
              <div className="flex items-center justify-between px-2 pb-2.5 pt-1">
                <span className="text-sm leading-tight">
                  <span className="block font-medium">Ivo Bittencourt · 71 anos</span>
                  <span className="block font-mono text-[11px] text-muted-foreground">PAC-0417 · RM 23/10</span>
                </span>
                <Badge variant="default">Aguardando revisão</Badge>
              </div>
              <MriViewer regions={sample.regions} atrophy={0.45} compact patientCode="PAC-0417" />
            </div>

            <div className="absolute -bottom-12 -left-3 w-60 rounded-2xl border bg-card p-4 shadow-elevated sm:-left-12">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sugestão do modelo</p>
              <p className="mt-1 font-semibold leading-tight">Comprometimento cognitivo leve</p>
              <ConfidenceMeter band={sample.confidence} className="mt-1" />
              <div className="mt-3">
                <ProbabilityBars probabilities={sample.probabilities} suggested={sample.suggested} compact />
              </div>
            </div>

            <div className="absolute -right-3 top-20 hidden w-72 rounded-2xl border bg-card p-3 shadow-elevated sm:block lg:-right-10">
              <p className="px-1 pb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Por que esta sugestão
              </p>
              <FeatureContributions features={sample.features} suggested={sample.suggested} limit={4} compact />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ problema */}
        <section id="problema" className="scroll-mt-16 border-t bg-card">
          <div data-recede className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div>
              <h2 className="font-display text-5xl leading-[1.02] text-balance">
                O laudo chega. A dúvida volta para quem pediu.
              </h2>
              <div className="mt-10 space-y-7 text-[15px] leading-relaxed">
                <p>
                  <strong className="font-semibold">A fila é de meses.</strong>{" "}
                  <span className="text-muted-foreground">
                    Enquanto o paciente espera um neurologista, o quadro evolui e o médico clínico decide sozinho.
                  </span>
                </p>
                <p>
                  <strong className="font-semibold">O laudo não responde à pergunta clínica.</strong>{" "}
                  <span className="text-muted-foreground">
                    Sem contexto e sem medida objetiva, um caso limítrofe recebe a frase cautelosa de sempre.
                  </span>
                </p>
                <p>
                  <strong className="font-semibold">O raciocínio se perde.</strong>{" "}
                  <span className="text-muted-foreground">
                    O parecer pedido por telefone vira “neuro: sem AD por ora, reavaliar” numa nota de rodapé do
                    prontuário.
                  </span>
                </p>
              </div>
            </div>

            {/* trecho de laudo do cenário C01 */}
            <figure className="self-start">
              <div className="rotate-[0.6deg] rounded-sm border border-slate-300 bg-[#fdfdfb] px-7 py-8 font-mono text-[13px] leading-relaxed text-slate-800 shadow-[0_18px_40px_-20px_rgb(15_23_42/0.35)]">
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
                Laudo de um caso limítrofe sem pergunta clínica, do cenário C01 levantado pela equipe. É o documento
                com que o médico clínico precisa decidir hoje.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ------------------------------------------------------------ explicação guiada pela rolagem */}
        <section id="explicacao" className="scroll-mt-16 bg-[#070b17] text-white">
          <div data-recede className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
            <h2 className="max-w-2xl font-display text-5xl leading-[1.02] text-balance">
              Da imagem à decisão, uma camada por vez.
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-white/65">
              A explicação combina onde o modelo olhou com medidas clínicas que você já conhece. Role para montar a
              sugestão do Sr. Ivo, 71 anos, MMSE 24.
            </p>
          </div>
          <div data-recede className="mx-auto max-w-6xl px-4 sm:px-6">
            <ScanStory prediction={sample} />
          </div>
        </section>

        {/* ------------------------------------------------------------ quem usa */}
        <section id="quem-usa" className="scroll-mt-16">
          <div data-recede className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
              <h2 className="font-display text-5xl leading-[1.02] text-balance">
                Quatro pessoas tocam o mesmo exame.
              </h2>
              <p className="max-w-md leading-relaxed text-muted-foreground lg:justify-self-end">
                A interface acompanha o caminho real do caso: cada perfil vê o que precisa resolver, no momento em que
                ainda dá para resolver.
              </p>
            </div>

            <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
              <span
                aria-hidden
                className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-border md:left-0 md:top-[7px] md:h-px md:w-full"
              />
              {[
                {
                  role: "Técnico em radiologia",
                  when: "No setor de imagem",
                  text: "Confere sequência volumétrica, artefato e dados clínicos com o paciente ainda no aparelho.",
                },
                {
                  role: "Radiologista",
                  when: "Na fila de laudos",
                  text: "Recebe a pergunta clínica junto do exame e usa o volume hipocampal como referência objetiva.",
                },
                {
                  role: "Médico clínico",
                  when: "Na consulta",
                  text: "Interpreta a explicação, decide e registra a justificativa. É para ele que a tela principal existe.",
                  primary: true,
                },
                {
                  role: "Neurologista",
                  when: "Quando encaminhado",
                  text: "Responde à pergunta do encaminhamento com conclusão, critérios e recomendação estruturados.",
                },
              ].map((item) => (
                <li key={item.role} className="relative pl-8 md:pl-0 md:pt-9">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1 size-[15px] rounded-full border-2 bg-background md:top-0",
                      item.primary ? "border-primary bg-primary" : "border-foreground/40",
                    )}
                  />
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{item.when}</p>
                  <h3 className={cn("mt-2 text-lg font-semibold", item.primary && "text-primary")}>{item.role}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ limites */}
        <section id="responsabilidade" className="scroll-mt-16 border-t bg-card">
          <div data-recede className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <h2 className="font-display text-5xl leading-[1.02] text-balance">
                Confiança na medida certa, não confiança máxima.
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
                Uma interface mal projetada também gera confiança excessiva. Por isso o sistema mostra o que o modelo
                faz e, com o mesmo destaque, o que ele não faz.
              </p>
              <p className="mt-8 max-w-md border-l-2 border-warning pl-4 text-sm leading-relaxed text-muted-foreground">
                <strong className="font-semibold text-foreground">Protótipo acadêmico.</strong> Pacientes, imagens de RM
                e sugestões desta demonstração são simulados e não têm validade clínica.
              </p>
            </div>
            <dl className="divide-y border-y">
              {[
                {
                  term: "A decisão é do médico",
                  text: "A tela diz “sugestão”, nunca “diagnóstico”. Discordar do modelo é um caminho previsto, com o mesmo peso de concordar.",
                },
                {
                  term: "Os limites aparecem em cada caso",
                  text: "O modelo foi treinado com dados do ADNI, de população majoritariamente norte-americana e de alta escolaridade. Ainda não foi validado no Brasil.",
                },
                {
                  term: "O registro não se edita",
                  text: "Decisões não são alteradas nem apagadas. Complementos entram como adendo, com autor e horário.",
                },
                {
                  term: "Privacidade por padrão",
                  text: "Listas usam identificador pseudonimizado e a sessão expira após 15 minutos sem uso, porque a estação costuma ser compartilhada.",
                },
              ].map(({ term, text }) => (
                <div key={term} className="grid gap-2 py-6 sm:grid-cols-[13rem_1fr] sm:gap-8">
                  <dt className="font-semibold">{term}</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------------------------------------ perguntas */}
        <section id="faq" className="scroll-mt-16">
          <div data-recede className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <h2 className="font-display text-5xl leading-[1.02] text-balance">Antes de começar</h2>
            <div className="border-t">
              {FAQ.map((item) => (
                <FaqItem key={item.q} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ demonstração */}
        <section id="demo" className="scroll-mt-16 bg-[#070b17] text-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
            <div>
              <h2 className="font-display text-5xl leading-[1.02] text-balance">
                Entre como qualquer um dos quatro perfis.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-white/65">
                Os casos de demonstração vêm dos cenários do projeto: o parecer que se perdeu, o exame que precisou ser
                refeito, a dúvida sobre a autonomia do paciente.
              </p>
              <Button size="lg" asChild className="mt-9 bg-white text-[#070b17] hover:bg-white/90">
                <Link to={user ? "/app" : "/entrar"}>
                  {user ? "Ir para o painel" : "Acessar demonstração"} <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="font-mono text-[11px] uppercase tracking-wider text-white/45">
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-3 font-normal">Perfil</th>
                    <th className="px-5 py-3 font-normal">E-mail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {SEED_USERS.map((u) => (
                    <tr key={u.id}>
                      <td className="px-5 py-3.5">
                        <span className="block font-medium">{ROLE_INFO[u.role].label}</span>
                        <span className="block text-xs text-white/50">{u.name}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[13px] text-teal-200">{u.email}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 font-mono text-xs text-white/55">
                    <td className="px-5 py-3" colSpan={2}>
                      Senha de todas as contas: <span className="text-white">{DEMO_PASSWORD}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Interface derivada do TCC “M-XAI Net: um framework multimodal de IA explicável para diagnóstico da
              doença de Alzheimer”.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Projeto</p>
              <p className="text-muted-foreground">Interação Humano-Computador</p>
              <p className="text-muted-foreground">Centro Universitário FEI · 2026</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Acesso</p>
              <Link to="/entrar" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                Entrar <ArrowUpRight className="size-3.5" />
              </Link>
              <Link to="/cadastro" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                Solicitar acesso <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
        <p className="border-t py-4 text-center font-mono text-[11px] text-muted-foreground">
          Protótipo acadêmico. Não utilizar para decisões clínicas reais.
        </p>
      </footer>
    </div>
  );
}

const FAQ = [
  {
    q: "O sistema faz o diagnóstico?",
    a: "Não. Ele apresenta uma sugestão explicada sobre o padrão observado: cognitivamente normal, comprometimento cognitivo leve ou padrão compatível com Alzheimer. O diagnóstico e a responsabilidade clínica são do médico.",
  },
  {
    q: "Preciso saber interpretar ressonância magnética?",
    a: "Não. O mapa de atenção mostra onde o modelo se apoiou, e os biomarcadores, como o volume do hipocampo, aparecem comparados a pessoas da mesma idade e sexo, em linguagem clínica.",
  },
  {
    q: "Com quais dados o modelo foi treinado?",
    a: "Com dados de pesquisa da Alzheimer's Disease Neuroimaging Initiative (ADNI), de população majoritariamente norte-americana e de alta escolaridade. O desempenho em outras populações ainda precisa ser validado, por isso esse limite aparece em todos os casos.",
  },
  {
    q: "E se eu discordar da sugestão?",
    a: "Registre a decisão normalmente, indicando que discorda e por quê. Discordâncias são esperadas e ajudam a avaliar o modelo. Se tiver dúvida, encaminhe o caso a um especialista sem sair da tela.",
  },
  {
    q: "Como os dados dos pacientes são protegidos?",
    a: "Listas usam identificadores pseudonimizados, a sessão expira por inatividade e todas as ações ficam numa trilha de auditoria. A demonstração não usa nenhum dado real.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="border-b">
      <Collapsible.Trigger className="flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-medium">
        {q}
        <Plus
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-45")}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground animate-fade-in">
        {a}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
