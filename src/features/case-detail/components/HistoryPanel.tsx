import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { History } from "lucide-react";
import type { ClinicalCase } from "@/types";
import { EmptyState } from "@/components/ui/states";
import { ClassBadge, FinalDiagnosisBadge } from "@/components/domain/badges";
import { formatDate } from "@/lib/utils";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";

/** Comparação com exames anteriores do mesmo paciente (F05). */
export function HistoryPanel({ data }: { data: ClinicalCase }) {
  const series = useMemo(() => {
    const hippocampus = data.prediction?.biomarkers.find((b) => b.id === "b-hipocampo")?.value;
    return [
      ...[...data.priorExams]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({ date: e.date, mmse: e.mmse, moca: e.moca, volume: e.hippocampalVolume, current: false })),
      {
        date: data.examDate,
        mmse: data.clinical.mmse,
        moca: data.clinical.moca,
        volume: hippocampus,
        current: true,
      },
    ].map((point) => ({ ...point, label: formatDate(point.date, "MM/yy") }));
  }, [data]);

  if (data.priorExams.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Primeiro exame deste paciente"
        description="Quando houver exames anteriores, a evolução dos testes cognitivos e do volume hipocampal aparece aqui."
        className="py-8"
      />
    );
  }

  const first = series[0]!;
  const last = series[series.length - 1]!;
  const mmseDelta = first.mmse !== undefined && last.mmse !== undefined ? last.mmse - first.mmse : undefined;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <DeltaCard
          label="MMSE"
          glossary="mmse"
          from={first.mmse}
          to={last.mmse}
          delta={mmseDelta}
          unit="pts"
          since={formatDate(first.date)}
        />
        {(() => {
          const withVolume = series.filter((p) => p.volume !== undefined);
          if (withVolume.length < 2) return null;
          const a = withVolume[0]!;
          const b = withVolume[withVolume.length - 1]!;
          return (
            <DeltaCard
              label="Volume hipocampal"
              glossary="volume-hipocampal"
              from={a.volume}
              to={b.volume}
              delta={Number(((b.volume! - a.volume!) / a.volume! * 100).toFixed(1))}
              unit="%"
              since={formatDate(a.date)}
            />
          );
        })()}
      </div>

      <div className="rounded-lg border p-3">
        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Testes cognitivos ao longo do tempo</p>
        <div className="h-44">
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis domain={[10, 30]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
                formatter={(value: number, name: string) => [`${value}/30`, name.toUpperCase()]}
              />
              <Line type="monotone" dataKey="mmse" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} connectNulls name="mmse" />
              <Line type="monotone" dataKey="moca" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} connectNulls name="moca" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-primary" /> MMSE
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent" /> MoCA
          </span>
        </div>
      </div>

      <ul className="divide-y rounded-lg border text-sm">
        {[...series].reverse().map((point, i) => {
          const exam = data.priorExams.find((e) => e.date === point.date);
          return (
            <li key={`${point.date}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="font-medium">
                {formatDate(point.date)}
                {point.current && <span className="ml-2 text-xs font-normal text-primary">exame atual</span>}
              </span>
              <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {point.mmse !== undefined && <span>MMSE {point.mmse}</span>}
                {point.moca !== undefined && <span>MoCA {point.moca}</span>}
                {point.volume !== undefined && <span>Hipocampo {point.volume.toLocaleString("pt-BR")} cm³</span>}
                {exam?.suggested && <ClassBadge value={exam.suggested} />}
                {exam?.finalDiagnosis && <FinalDiagnosisBadge value={exam.finalDiagnosis} />}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DeltaCard({
  label,
  glossary,
  from,
  to,
  delta,
  unit,
  since,
}: {
  label: string;
  glossary: string;
  from?: number;
  to?: number;
  delta?: number;
  unit: string;
  since: string;
}) {
  const worse = delta !== undefined && delta < 0;
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">
        <GlossaryTerm id={glossary}>{label}</GlossaryTerm> desde {since}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {from?.toLocaleString("pt-BR")} → {to?.toLocaleString("pt-BR")}
      </p>
      {delta !== undefined && (
        <p className={worse ? "text-sm font-medium text-ad" : "text-sm font-medium text-success"}>
          {delta > 0 ? "+" : ""}
          {delta.toLocaleString("pt-BR")} {unit}
        </p>
      )}
    </div>
  );
}
