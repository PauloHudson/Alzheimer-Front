import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Calendar, ClipboardList, FileText, ShieldAlert, UserRound } from "lucide-react";
import type { ClinicalCase } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { ErrorState } from "@/components/ui/states";
import { ConfidenceMeter, StatusBadge } from "@/components/domain/badges";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { useCase } from "@/hooks/useCases";
import { ApiError } from "@/services/api";
import { CLASS_INFO, CONFIDENCE_INFO, confidenceFromProbabilities } from "@/lib/domain";
import { formatDate, formatPercent } from "@/lib/utils";
import { GradCamViewer } from "@/features/viewer/GradCamViewer";
import { ProbabilityBars } from "./components/ProbabilityBars";
import { ModalityShare } from "./components/ModalityShare";
import { ModelInputsPanel } from "./components/ModelInputsPanel";
import { ModelLimits } from "./components/ModelLimits";
import { DecisionPanel } from "./components/DecisionPanel";
import { DecisionRecord } from "./components/DecisionRecord";
import { FailedState, ProcessingState } from "./components/CaseStates";

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useCase(id);

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
            <Link to="/app">Voltar para os casos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const prediction = data.prediction;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* --------------------------------------------------------- cabeçalho */}
      <div className="space-y-4">
        <Link to="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Casos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{data.patient.name}</h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" />
                {data.patient.code} · {data.patient.age} anos · {data.patient.sex === "F" ? "feminino" : "masculino"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" /> RM em {formatDate(data.examDate)}
              </span>
              <span className="font-mono text-xs">{data.id}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {prediction && (
              <Button variant="outline" asChild>
                <Link to={`/app/casos/${data.id}/relatorio`} target="_blank" rel="noopener">
                  <FileText /> Relatório
                </Link>
              </Button>
            )}
            {prediction && !data.decision && (
              <Button asChild>
                <a href="#decisao">Registrar decisão</a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {data.status === "processando" && <ProcessingState />}
      {data.status === "erro" && <FailedState data={data} />}

      {/* --------------------------------------------------------- explicação */}
      {prediction && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {prediction.gradcam ? (
              <GradCamViewer gradcam={prediction.gradcam} patientCode={data.patient.code} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Este modelo usa só dados clínicos — não há mapa de atenção sobre a imagem.
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <SuggestionSummary data={data} />

            {prediction.modalityShare && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">
                    <GlossaryTerm id="peso-modalidade">De onde veio a sugestão</GlossaryTerm>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ModalityShare share={prediction.modalityShare} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="size-4 text-warning" /> Limites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ModelLimits prediction={prediction} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- dados de entrada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ClipboardList className="size-4 text-muted-foreground" /> Dados enviados ao modelo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ModelInputsPanel data={data} />
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- decisão */}
      {prediction && (data.decision ? <DecisionRecord data={data} /> : <DecisionPanel data={data} />)}
    </div>
  );
}

/** Camada 1 da explicação: o número principal primeiro, o detalhe sob demanda. */
function SuggestionSummary({ data }: { data: ClinicalCase }) {
  const prediction = data.prediction!;
  const info = CLASS_INFO[prediction.suggested];
  const band = confidenceFromProbabilities(prediction.probabilities);
  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: info.color }} />
      <CardContent className="space-y-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">Sugestão do modelo</p>
          <GlossaryTerm id="confianca" className="no-underline">
            <ConfidenceMeter band={band} />
          </GlossaryTerm>
        </div>
        <div>
          <p className="text-4xl font-semibold tabular-nums" style={{ color: info.color }}>
            {formatPercent(prediction.probabilities[prediction.suggested] ?? 0)}
          </p>
          <p className="mt-1 font-medium">{info.label}</p>
        </div>
        <ProbabilityBars prediction={prediction} compact />
        {band === "baixa" && (
          <p className="rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive">
            {CONFIDENCE_INFO.baixa.description}
          </p>
        )}
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Skeleton className="aspect-square max-h-[620px] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
