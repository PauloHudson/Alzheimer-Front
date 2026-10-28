import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import type { GradCam } from "@/types";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/Logo";
import { ErrorState } from "@/components/ui/states";
import { useCase } from "@/hooks/useCases";
import {
  AGREEMENT_INFO,
  apoe4Alleles,
  ARCHITECTURE_LABEL,
  CLASS_INFO,
  CONFIDENCE_INFO,
  confidenceFromProbabilities,
  FINAL_DIAGNOSIS_LABEL,
  summarizePrediction,
} from "@/lib/domain";
import { formatDate, formatDateTime, formatPercent } from "@/lib/utils";
import { composeGradCam } from "@/features/viewer/heatmap";
import { useAuth } from "@/store/auth";

/** Corte com o mapa de atenção sobreposto, como imagem estática para o relatório. */
function useKeyImage(gradcam: GradCam | undefined) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    if (!gradcam) return;
    let cancelled = false;
    composeGradCam(gradcam.sliceUrl, gradcam.heatmapUrl)
      .then((url) => !cancelled && setImage(url))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [gradcam]);
  return image;
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user)!;
  const { data, isLoading, isError } = useCase(id);
  const prediction = data?.prediction;
  const image = useKeyImage(prediction?.gradcam);

  useEffect(() => {
    if (data) document.title = `Relatório ${data.id} · M-XAI`;
  }, [data]);

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  if (isError || !data || !prediction) return <ErrorState title="Relatório indisponível" />;

  const band = confidenceFromProbabilities(prediction.probabilities);
  const { tabular } = data;

  return (
    <div className="min-h-screen bg-muted/50 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <Button variant="ghost" asChild>
          <Link to={`/app/casos/${data.id}`}>
            <ArrowLeft /> Voltar ao caso
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> Imprimir / salvar PDF
        </Button>
      </div>

      <article className="mx-auto max-w-[210mm] space-y-6 bg-white p-[14mm] text-[13px] leading-relaxed text-slate-900 shadow-elevated print:shadow-none">
        <header className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div>
              <p className="text-lg font-bold">Relatório de apoio à decisão</p>
              <p className="text-xs text-slate-500">M-XAI · sugestão explicada para doença de Alzheimer</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-mono">{data.id}</p>
            <p>Emitido em {formatDateTime(new Date().toISOString())}</p>
            <p>por {user.name}</p>
          </div>
        </header>

        <section className="grid grid-cols-4 gap-4 rounded-lg bg-slate-50 p-4 text-xs">
          <Info label="Paciente" value={`${data.patient.name} (${data.patient.code})`} span />
          <Info label="Idade / sexo" value={`${data.patient.age} anos · ${data.patient.sex}`} />
          <Info label="Data da RM" value={formatDate(data.examDate)} />
          <Info label="Escolaridade" value={`${data.patient.educationYears} anos`} />
          <Info
            label="APOE"
            value={tabular.apoe ? `${tabular.apoe} (${apoe4Alleles(tabular.apoe)} ε4)` : "não informado"}
          />
          <Info
            label="Hipocampo / ICV"
            value={
              tabular.hippocampusMm3 && tabular.icvMm3
                ? `${((tabular.hippocampusMm3 / tabular.icvMm3) * 100).toFixed(2)}%`
                : "não informado"
            }
          />
          <Info
            label="Ventrículos / ICV"
            value={
              tabular.lateralVentriclesMm3 && tabular.icvMm3
                ? `${((tabular.lateralVentriclesMm3 / tabular.icvMm3) * 100).toFixed(2)}%`
                : "não informado"
            }
          />
        </section>

        <section className="grid grid-cols-[1fr_200px] gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sugestão do modelo</h2>
            <p className="text-xl font-semibold" style={{ color: CLASS_INFO[prediction.suggested].color }}>
              {CLASS_INFO[prediction.suggested].label}
            </p>
            <p>
              {CONFIDENCE_INFO[band].label}.{" "}
              {prediction.classes
                .map((k) => `${CLASS_INFO[k].short} ${formatPercent(prediction.probabilities[k] ?? 0)}`)
                .join(" · ")}
            </p>
            <p className="rounded bg-slate-50 p-3">{summarizePrediction(prediction)}</p>
            {prediction.modalityShare && (
              <p className="text-xs text-slate-500">
                Peso na decisão: imagem {formatPercent(prediction.modalityShare.image)} · dados clínicos{" "}
                {formatPercent(prediction.modalityShare.tabular)}.
              </p>
            )}
            {prediction.caveats.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-700">
                {prediction.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>
          {image && (
            <figure className="space-y-1">
              <img src={image} alt="Corte axial com mapa de atenção" className="w-full rounded bg-black" />
              <figcaption className="text-[10px] text-slate-500">
                Corte axial no nível ventricular com o Grad-CAM do logit{" "}
                {CLASS_INFO[prediction.gradcam!.explainedClass].short}
.
              </figcaption>
            </figure>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Decisão do médico</h2>
          {data.decision ? (
            <div className="space-y-2 rounded border p-3">
              <p>
                <strong>{FINAL_DIAGNOSIS_LABEL[data.decision.finalDiagnosis]}</strong> —{" "}
                {AGREEMENT_INFO[data.decision.agreement].label.toLowerCase()}.
              </p>
              <p className="whitespace-pre-line">
                <span className="text-slate-500">Justificativa:</span> {data.decision.justification}
              </p>
              <p className="text-xs text-slate-500">
                {data.decision.decidedBy} · {formatDateTime(data.decision.decidedAt)}
              </p>
            </div>
          ) : (
            <p className="rounded border border-dashed p-3 text-slate-500">Decisão ainda não registrada.</p>
          )}
        </section>

        <footer className="border-t pt-3 text-[10px] leading-relaxed text-slate-500">
          Sugestão gerada por modelo de IA ({ARCHITECTURE_LABEL[prediction.architecture]}, {prediction.modelVersion})
          treinado com dados do ADNI, não validado para a população brasileira. A sugestão não constitui diagnóstico; a
          decisão clínica e sua responsabilidade são do médico.
        </footer>
      </article>
    </div>
  );
}

function Info({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <p className="text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
