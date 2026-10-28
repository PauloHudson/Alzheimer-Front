import type { ClinicalCase } from "@/types";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { apoe4Alleles, MARITAL_LABEL } from "@/lib/domain";
import { cn } from "@/lib/utils";

const mm3 = (v?: number) => (v === undefined ? undefined : `${v.toLocaleString("pt-BR")} mm³`);

/** Exatamente o que entrou no ramo tabular, para o médico conferir o que o modelo viu. */
export function ModelInputsPanel({ data }: { data: ClinicalCase }) {
  const { patient, tabular } = data;
  const icv = tabular.icvMm3;
  const ratio = (v?: number) => (v !== undefined && icv ? `${((v / icv) * 100).toFixed(2)}% do ICV` : undefined);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Idade" value={`${patient.age} anos`} />
        <Tile label="Sexo" value={patient.sex === "F" ? "Feminino" : "Masculino"} />
        <Tile label="Escolaridade" value={`${patient.educationYears} anos`} />
        <Tile label="Estado civil" value={tabular.marital && MARITAL_LABEL[tabular.marital]} />
        <Tile
          label={<GlossaryTerm id="apoe">APOE</GlossaryTerm>}
          value={tabular.apoe}
          hint={tabular.apoe && `${apoe4Alleles(tabular.apoe)} alelo(s) ε4`}
        />
        <Tile label={<GlossaryTerm id="volumetria">ICV</GlossaryTerm>} value={mm3(icv)} />
        <Tile label="Hipocampo" value={mm3(tabular.hippocampusMm3)} hint={ratio(tabular.hippocampusMm3)} />
        <Tile
          label="Ventrículos laterais"
          value={mm3(tabular.lateralVentriclesMm3)}
          hint={ratio(tabular.lateralVentriclesMm3)}
        />
      </dl>
      {data.notes && (
        <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Observações (fora do modelo): </span>
          {data.notes}
        </p>
      )}
    </div>
  );
}

function Tile({ label, value, hint }: { label: React.ReactNode; value?: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background/40 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-medium", !value && "font-normal italic text-muted-foreground")}>
        {value ?? "Imputado"}
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}
