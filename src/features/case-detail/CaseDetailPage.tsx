import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  History,
  Info,
  ListTree,
  Microscope,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/misc";
import { ErrorState } from "@/components/ui/states";
import { ConfidenceMeter, StatusBadge } from "@/components/domain/badges";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { useCase } from "@/hooks/useCases";
import { useAuth } from "@/store/auth";
import { api, ApiError } from "@/services/api";
import { canDecide, CLASS_INFO, CONFIDENCE_INFO } from "@/lib/domain";
import { cn, formatDate } from "@/lib/utils";
import { MriViewer } from "@/features/viewer/MriViewer";
import { atrophyFromProbabilities } from "@/features/viewer/renderMri";
import { ProbabilityBars } from "./components/ProbabilityBars";
import { FeatureContributions } from "./components/FeatureContributions";
import { BiomarkerPanel } from "./components/BiomarkerPanel";
import { RegionList } from "./components/RegionList";
import { HistoryPanel } from "./components/HistoryPanel";
import { ClinicalDataPanel } from "./components/ClinicalDataPanel";
import { ModelLimits } from "./components/ModelLimits";
import { AuditTimeline } from "./components/AuditTimeline";
import { OpinionCard, PendingReferralCard } from "./components/ReferralPanel";
import { ReferralDialog } from "./components/ReferralDialog";
import { OpinionDialog } from "./components/OpinionDialog";
import { DecisionPanel } from "./components/DecisionPanel";
import { DecisionRecord } from "./components/DecisionRecord";
import { PendingState, ProcessingState } from "./components/CaseStates";

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user)!;
  const { data, isLoading, isError, error, refetch } = useCase(id);
  const [focusRegion, setFocusRegion] = useState<string | null>(null);
  const [referOpen, setReferOpen] = useState(false);
  const [opinionFor, setOpinionFor] = useState<string | null>(null);

  // registra a abertura do caso na trilha de auditoria (uma vez por visita)
  const logged = useRef<string | null>(null);
  useEffect(() => {
    if (data?.prediction && logged.current !== data.id) {
      logged.current = data.id;
      void api.cases.logEvent(data.id, "caso_aberto").catch(() => undefined);
    }
  }, [data?.id, data?.prediction]);

  // avisa quando a análise termina com o usuário na tela
  const previousStatus = useRef(data?.status);
  useEffect(() => {
    if (previousStatus.current === "processando" && data?.status === "aguardando_revisao") {
      toast.success("Análise concluída", { description: "A sugestão explicada está pronta para sua revisão." });
    }
    previousStatus.current = data?.status;
  }, [data?.status]);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="p-6">
        <ErrorState
          title={notFound ? "Caso não encontrado" : undefined}
          description={notFound ? "Verifique o endereço ou volte para a lista de casos." : undefined}
          onRetry={notFound ? undefined : () => void refetch()}
        />
        <div className="mt-2 text-center">
          <Button variant="link" asChild>
            <Link to="/app/casos">Voltar para os casos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const prediction = data.prediction;
  const pendingReferral = data.referrals.find((r) => r.status === "aguardando");
  const answered = data.referrals.filter((r) => r.opinion);
  const decider = canDecide(user.role);
  const canRefer = decider && !data.decision && Boolean(prediction);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* --------------------------------------------------------- cabeçalho */}
      <div className="space-y-4">
        <Link to="/app/casos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Casos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{data.patient.name}</h1>
              <StatusBadge status={data.status} progress={data.progress} />
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" />
                {data.patient.code} · {data.patient.age} anos · {data.patient.sex === "F" ? "feminino" : "masculino"} ·{" "}
                {data.patient.educationYears} anos de estudo
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" /> RM em {formatDate(data.examDate)}
              </span>
              <span className="font-mono text-xs">{data.id}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canRefer && !pendingReferral && (
              <Button variant="outline" onClick={() => setReferOpen(true)}>
                <Send /> Encaminhar
              </Button>
            )}
            {prediction && (
              <Button variant="outline" asChild>
                <Link to={`/app/casos/${data.id}/relatorio`} target="_blank" rel="noopener">
                  <FileText /> Relatório
                </Link>
              </Button>
            )}
            {decider && prediction && !data.decision && (
              <Button asChild>
                <a href="#decisao">Registrar decisão</a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- pareceres */}
      {(answered.length > 0 || pendingReferral) && (
        <section aria-label="Pareceres de especialistas" className="space-y-3">
          {answered.map((r) => (
            <OpinionCard key={r.id} referral={r} defaultOpen={!data.decision} />
          ))}
          {pendingReferral && (
            <PendingReferralCard
              referral={pendingReferral}
              canRegister={decider}
              onRegisterOpinion={() => setOpinionFor(pendingReferral.id)}
            />
          )}
        </section>
      )}

      {data.status === "processando" && <ProcessingState data={data} />}
      {data.status === "pendencia" && <PendingState data={data} />}

      {/* --------------------------------------------------------- explicação */}
      {prediction && (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <MriViewer
                regions={prediction.regions}
                atrophy={atrophyFromProbabilities(prediction.probabilities)}
                patientCode={data.patient.code}
                focusRegionId={focusRegion}
                onFocusRegion={setFocusRegion}
                className="min-h-[420px]"
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Regiões destacadas pelo <GlossaryTerm id="mapa-atencao">mapa de atenção</GlossaryTerm>
                  </CardTitle>
                  <CardDescription>Clique em uma região para levá-la ao visualizador.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RegionList regions={prediction.regions} focusId={focusRegion} onFocus={setFocusRegion} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <SuggestionSummary data={data} />

              <Card>
                <Tabs defaultValue="fatores">
                  <div className="border-b px-4 pt-4">
                    <TabsList className="h-auto w-full flex-wrap justify-start bg-transparent p-0">
                      {[
                        { value: "fatores", label: "Fatores", icon: ListTree },
                        { value: "biomarcadores", label: "Biomarcadores", icon: Microscope },
                        { value: "historico", label: "Histórico", icon: History, count: data.priorExams.length },
                        { value: "clinicos", label: "Dados clínicos", icon: ClipboardList },
                      ].map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="rounded-none border-b-2 border-transparent px-3 pb-2.5 data-[state=active]:border-primary data-[state=active]:shadow-none"
                        >
                          <tab.icon /> {tab.label}
                          {tab.count ? (
                            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{tab.count}</span>
                          ) : null}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <div className="p-4">
                    <TabsContent value="fatores" className="mt-0 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        <GlossaryTerm id="contribuicao-fatores">Contribuição de cada fator</GlossaryTerm> para a sugestão
                        deste paciente. Clique para ver a explicação e a origem do dado.
                      </p>
                      <FeatureContributions features={prediction.features} suggested={prediction.suggested} limit={6} />
                    </TabsContent>
                    <TabsContent value="biomarcadores" className="mt-0">
                      <BiomarkerPanel biomarkers={prediction.biomarkers} />
                    </TabsContent>
                    <TabsContent value="historico" className="mt-0">
                      <HistoryPanel data={data} />
                    </TabsContent>
                    <TabsContent value="clinicos" className="mt-0">
                      <ClinicalDataPanel data={data} />
                    </TabsContent>
                  </div>
                </Tabs>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ShieldAlert className="size-4 text-warning" /> Limites desta sugestão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ModelLimits prediction={prediction} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* --------------------------------------------------------- decisão */}
          {data.decision ? (
            <DecisionRecord data={data} canAddendum={decider} />
          ) : decider ? (
            <DecisionPanel data={data} onRefer={() => (pendingReferral ? toast.info("Já existe um encaminhamento aguardando parecer.") : setReferOpen(true))} />
          ) : (
            <Card>
              <CardContent className="flex items-start gap-3 py-5 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Você está vendo este caso como <strong className="text-foreground">{user.role === "tecnico" ? "técnico" : "radiologista"}</strong>.
                  A decisão clínica é registrada pelo médico responsável ({data.requestedBy}).
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* --------------------------------------------------------- auditoria */}
      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="flex items-center gap-2 font-semibold">
                <BookOpen className="size-4 text-muted-foreground" /> Trilha de auditoria
              </span>
              <span className="text-sm text-muted-foreground">{data.audit.length} eventos registrados — somente leitura</span>
            </span>
            <span className="text-sm font-medium text-primary group-open:hidden">Mostrar</span>
            <span className="hidden text-sm font-medium text-primary group-open:inline">Ocultar</span>
          </summary>
          <div className="px-5 pb-5 pl-8">
            <AuditTimeline events={data.audit} />
          </div>
        </details>
      </Card>

      <ReferralDialog data={data} open={referOpen} onOpenChange={setReferOpen} />
      {opinionFor && (
        <OpinionDialog
          caseId={data.id}
          referral={data.referrals.find((r) => r.id === opinionFor)!}
          user={user}
          open
          onOpenChange={(open) => !open && setOpinionFor(null)}
        />
      )}
    </div>
  );
}

/** Camada 1 da explicação: resumo da sugestão (RC08 — resumo primeiro, detalhe sob demanda). */
function SuggestionSummary({ data }: { data: NonNullable<ReturnType<typeof useCase>["data"]> }) {
  const prediction = data.prediction!;
  const info = CLASS_INFO[prediction.suggested];
  const confidence = CONFIDENCE_INFO[prediction.confidence];
  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: info.color }} />
      <CardContent className="space-y-5 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sugestão do modelo</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: info.color }}>
              {info.label}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{info.description}</p>
          </div>
          <div className="text-right">
            <ConfidenceMeter band={prediction.confidence} />
            <p className="mt-1 text-xs text-muted-foreground">
              <GlossaryTerm id="confianca">o que isso significa?</GlossaryTerm>
            </p>
          </div>
        </div>

        <ProbabilityBars probabilities={prediction.probabilities} suggested={prediction.suggested} />

        <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">{prediction.summary}</p>

        <p
          className={cn(
            "rounded-lg border p-3 text-xs leading-relaxed",
            prediction.confidence === "baixa"
              ? "border-destructive/30 bg-destructive-soft text-destructive"
              : "text-muted-foreground",
          )}
        >
          {confidence.description}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8" aria-busy>
      <Skeleton className="h-4 w-16" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Skeleton className="aspect-square max-h-[620px] rounded-xl bg-slate-200" />
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
