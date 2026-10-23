import { CheckCircle2, CircleAlert, MessageCircleQuestion, Users } from "lucide-react";
import type { ClinicalCase } from "@/types";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { cn, formatDate } from "@/lib/utils";

export function ClinicalDataPanel({ data }: { data: ClinicalCase }) {
  const { clinical, acquisition, patient } = data;
  const tests = [
    { id: "mmse", label: "MMSE", value: clinical.mmse, max: 30 },
    { id: "moca", label: "MoCA", value: clinical.moca, max: 30 },
    { id: "cdr-sb", label: "CDR-SB", value: clinical.cdrSb, max: 18 },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border-l-4 border-primary bg-primary-soft/50 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <MessageCircleQuestion className="size-3.5" /> Pergunta clínica
        </p>
        <p className="mt-1 text-sm">{clinical.clinicalQuestion}</p>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {tests.map((t) => (
          <div key={t.id} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">
              <GlossaryTerm id={t.id}>{t.label}</GlossaryTerm>
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {t.value ?? "—"}
              {t.value !== undefined && <span className="text-xs font-normal text-muted-foreground">/{t.max}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Item label="Queixa principal" value={clinical.chiefComplaint} wide />
        <Item label="Escolaridade" value={`${patient.educationYears} anos`} />
        <Item label="Histórico familiar de demência" value={clinical.familyHistory ? "Sim" : "Não"} />
        <Item label="Solicitante" value={data.requestedBy} />
        <Item label="Preparado por" value={`${data.preparedBy} · ${formatDate(data.createdAt)}`} />
      </dl>

      {clinical.familyReport && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" /> Relato da família
          </p>
          <p className="mt-1 text-sm leading-relaxed">{clinical.familyReport}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            O relato não entra no cálculo do modelo — considere-o junto com a sugestão.
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qualidade da aquisição</p>
        <ul className="space-y-1.5 text-sm">
          <QualityItem ok={acquisition.volumetricT1} label={<><GlossaryTerm id="t1-volumetrica">Sequência T1 volumétrica</GlossaryTerm> {acquisition.volumetricT1 ? "presente" : "ausente"}</>} />
          <QualityItem ok={acquisition.fullCoverage} label={`Cobertura do encéfalo ${acquisition.fullCoverage ? "completa" : "incompleta"}`} />
          <QualityItem
            ok={acquisition.motionArtifact === "nenhum"}
            warn={acquisition.motionArtifact === "leve"}
            label={`Artefato de movimento: ${acquisition.motionArtifact}`}
          />
        </ul>
        {acquisition.notes && <p className="mt-2 text-xs text-muted-foreground">Observação do técnico: {acquisition.notes}</p>}
      </div>
    </div>
  );
}

function Item({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function QualityItem({ ok, warn, label }: { ok: boolean; warn?: boolean; label: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="size-4 text-success" />
      ) : (
        <CircleAlert className={cn("size-4", warn ? "text-warning" : "text-destructive")} />
      )}
      {label}
    </li>
  );
}
