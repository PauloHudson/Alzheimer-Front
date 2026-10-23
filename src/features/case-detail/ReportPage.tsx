import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/Logo";
import { ErrorState } from "@/components/ui/states";
import { useCase } from "@/hooks/useCases";
import { api } from "@/services/api";
import { AGREEMENT_INFO, CLASS_INFO, CONFIDENCE_INFO, FINAL_DIAGNOSIS_LABEL } from "@/lib/domain";
import { formatDate, formatDateTime, formatPercent } from "@/lib/utils";
import { DEFAULT_SLICE } from "@/features/viewer/anatomy";
import { atrophyFromProbabilities, MRI_SIZE, renderHeatmap, renderSlice, tToSlice } from "@/features/viewer/renderMri";
import type { AttentionRegion, DiagnosticClass } from "@/types";
import { useAuth } from "@/store/auth";

/** Corte coronal com o mapa de atenção sobreposto, como imagem estática para o relatório. */
function useKeyImage(regions: AttentionRegion[] | undefined, atrophy: number) {
  return useMemo(() => {
    if (!regions) return null;
    const slice = tToSlice(DEFAULT_SLICE.coronal);
    const canvas = document.createElement("canvas");
    canvas.width = MRI_SIZE;
    canvas.height = MRI_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(renderSlice("coronal", slice, atrophy), 0, 0);
    const heat = document.createElement("canvas");
    heat.width = 128;
    heat.height = 128;
    heat.getContext("2d")!.putImageData(renderHeatmap(regions, "coronal", slice), 0, 0);
    ctx.globalAlpha = 0.6;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(heat, 0, 0, MRI_SIZE, MRI_SIZE);
    return canvas.toDataURL("image/png");
  }, [regions, atrophy]);
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user)!;
  const { data, isLoading, isError } = useCase(id);
  const prediction = data?.prediction;
  const image = useKeyImage(prediction?.regions, atrophyFromProbabilities(prediction?.probabilities));

  useEffect(() => {
    if (data) document.title = `Relatório ${data.id} · M-XAI`;
  }, [data]);

  const print = () => {
    if (data) void api.cases.logEvent(data.id, "relatorio_exportado").catch(() => undefined);
    window.print();
  };

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  if (isError || !data || !prediction) return <ErrorState title="Relatório indisponível" />;

  const opinions = data.referrals.filter((r) => r.opinion);

  return (
    <div className="min-h-screen bg-muted/50 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <Button variant="ghost" asChild>
          <Link to={`/app/casos/${data.id}`}>
            <ArrowLeft /> Voltar ao caso
          </Link>
        </Button>
        <Button onClick={print}>
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
          <Info label="Idade / sexo" value={`${data.patient.age} anos · ${data.patient.sex === "F" ? "F" : "M"}`} />
          <Info label="Escolaridade" value={`${data.patient.educationYears} anos`} />
          <Info label="Data da RM" value={formatDate(data.examDate)} />
          <Info label="Solicitante" value={data.requestedBy} />
          <Info label="MMSE / MoCA" value={`${data.clinical.mmse ?? "—"} / ${data.clinical.moca ?? "—"}`} />
          <Info label="Pergunta clínica" value={data.clinical.clinicalQuestion} span />
        </section>

        <section className="grid grid-cols-[1fr_200px] gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sugestão do modelo</h2>
            <p className="text-xl font-semibold" style={{ color: CLASS_INFO[prediction.suggested].color }}>
              {CLASS_INFO[prediction.suggested].label}
            </p>
            <p>
              {CONFIDENCE_INFO[prediction.confidence].label}.{" "}
              {(Object.keys(prediction.probabilities) as DiagnosticClass[])
                .map((k) => `${CLASS_INFO[k].short} ${formatPercent(prediction.probabilities[k])}`)
                .join(" · ")}
            </p>
            <p className="rounded bg-slate-50 p-3">{prediction.summary}</p>
          </div>
          {image && (
            <figure className="space-y-1">
              <img src={image} alt="Corte coronal com mapa de atenção" className="w-full rounded bg-black" />
              <figcaption className="text-[10px] text-slate-500">
                Corte coronal com mapa de atenção (imagem sintética de demonstração).
              </figcaption>
            </figure>
          )}
        </section>

        <section className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Principais fatores</h2>
            <table className="w-full text-xs">
              <tbody className="divide-y">
                {prediction.features.slice(0, 7).map((f) => (
                  <tr key={f.id}>
                    <td className="py-1.5 pr-2">{f.label}</td>
                    <td className="py-1.5 pr-2 text-slate-500">{f.value}</td>
                    <td className="py-1.5 text-right">{f.contribution >= 0 ? "↑ aproxima" : "↓ afasta"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Biomarcadores</h2>
            <table className="w-full text-xs">
              <tbody className="divide-y">
                {prediction.biomarkers.map((b) => (
                  <tr key={b.id}>
                    <td className="py-1.5 pr-2">{b.label}</td>
                    <td className="py-1.5 pr-2">
                      {b.value.toLocaleString("pt-BR")} {b.unit}
                    </td>
                    <td className="py-1.5 text-right text-slate-500">p{b.percentile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {opinions.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Pareceres de especialistas</h2>
            {opinions.map((r) => (
              <div key={r.id} className="rounded border p-3 text-xs">
                <p className="font-medium">
                  {r.opinion!.author} ({r.opinion!.specialty}, {r.opinion!.channel}) — {formatDate(r.opinion!.date)}
                </p>
                <p className="mt-1">{r.opinion!.conclusion}</p>
                <p className="mt-1 text-slate-500">Recomendação: {r.opinion!.recommendation}</p>
              </div>
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Decisão do médico</h2>
          {data.decision ? (
            <div className="space-y-2 rounded border p-3">
              <p>
                <strong>{FINAL_DIAGNOSIS_LABEL[data.decision.finalDiagnosis]}</strong> —{" "}
                {AGREEMENT_INFO[data.decision.agreement].label.toLowerCase()}.
              </p>
              <p>
                <span className="text-slate-500">Conduta:</span> {data.decision.conduct}
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
          Este relatório apresenta uma sugestão gerada por modelo de IA ({prediction.modelVersion}) treinado com dados do
          ADNI, não validado para a população brasileira. A sugestão não constitui diagnóstico; a decisão clínica e sua
          responsabilidade são do médico. Protótipo acadêmico (FEI, IHC 2026) com dados simulados.
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
