import type { ClinicalCase, FactorContribution, FactorId } from "@/types";
import { CLASS_INFO, MARITAL_LABEL } from "@/lib/domain";
import { cn, formatPercent, lowerFirst } from "@/lib/utils";

const FACTOR_LABEL: Record<FactorId, string> = {
  imagem: "Ressonância magnética",
  idade: "Idade",
  sexo: "Sexo",
  escolaridade: "Escolaridade",
  estado_civil: "Estado civil",
  apoe: "APOE",
  icv: "Volume intracraniano (ICV)",
  hipocampo: "Volume do hipocampo",
  ventriculos: "Ventrículos laterais",
};

/** Abaixo disso o valor arredondado seria 0,0 ponto: o fator não moveu a probabilidade. */
const NEUTRAL = 0.0005;

const mm3 = (v?: number) => (v === undefined ? undefined : `${Math.round(v).toLocaleString("pt-BR")} mm³`);
const points = (v: number) =>
  Math.abs(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function signedPoints(v: number) {
  if (Math.abs(v) < NEUTRAL) return points(0);
  return `${v > 0 ? "+" : "−"}${points(v)}`;
}

/** O valor que o médico informou para o fator, para ler a barra junto com o dado. */
function factorValue(id: FactorId, { patient, tabular }: ClinicalCase): string | undefined {
  switch (id) {
    case "imagem":
      return undefined;
    case "idade":
      return `${patient.age} anos`;
    case "sexo":
      return patient.sex === "F" ? "Feminino" : "Masculino";
    case "escolaridade":
      return `${patient.educationYears} anos de estudo`;
    case "estado_civil":
      return tabular.marital && MARITAL_LABEL[tabular.marital];
    case "apoe":
      return tabular.apoe;
    case "icv":
      return mm3(tabular.icvMm3);
    case "hipocampo":
      return mm3(tabular.hippocampusMm3);
    case "ventriculos":
      return mm3(tabular.lateralVentriclesMm3);
  }
}

function Direction({ value }: { value: number }) {
  const info = value > 0 ? CLASS_INFO.AD : CLASS_INFO.CN;
  return (
    <span className="font-medium" style={{ color: info.color }}>
      {info.short}
    </span>
  );
}

/**
 * Quanto cada fator moveu a probabilidade de Alzheimer deste exame: o mais relevante
 * em destaque e, abaixo, todos os fatores em barras que divergem de um eixo central.
 */
export function FactorContributions({ data, factors }: { data: ClinicalCase; factors: FactorContribution[] }) {
  const sorted = [...factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const top = sorted[0]!;
  const topClinical = sorted.find((f) => f.id !== "imagem" && Math.abs(f.contribution) >= NEUTRAL);
  const largest = Math.max(Math.abs(top.contribution), NEUTRAL);
  const { referenceProbability } = data.prediction!;
  const probability = data.prediction!.probabilities.AD;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground">Fator mais relevante</p>
        <p className="mt-0.5 text-lg font-semibold">{FACTOR_LABEL[top.id]}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Moveu o caso {points(top.contribution)} pontos em direção a <Direction value={top.contribution} />.
          {top.id === "imagem" && topClinical && (
            <>
              {" "}
              Entre os dados clínicos, o que mais pesou foi{" "}
              <span className="font-medium text-foreground">{lowerFirst(FACTOR_LABEL[topClinical.id])}</span> (
              {points(topClinical.contribution)} pontos, em direção a <Direction value={topClinical.contribution} />
              ).
            </>
          )}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden>
          <span>← {CLASS_INFO.CN.short}</span>
          <span>{CLASS_INFO.AD.short} →</span>
        </div>
        <ul className="space-y-3" aria-label="Contribuição de cada fator, em pontos de probabilidade de Alzheimer">
          {sorted.map((factor) => {
            const value = factor.imputed ? "Não informado" : factorValue(factor.id, data);
            const width = (Math.abs(factor.contribution) / largest) * 50;
            const neutral = Math.abs(factor.contribution) < NEUTRAL;
            return (
              <li key={factor.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={cn("min-w-0", factor.id === top.id && "font-semibold")}>
                    {FACTOR_LABEL[factor.id]}
                    {value && (
                      <span
                        className={cn(
                          "ml-1.5 text-xs font-normal text-muted-foreground",
                          factor.imputed && "italic",
                        )}
                      >
                        {value}
                      </span>
                    )}
                  </span>
                  <span className={cn("shrink-0 tabular-nums", neutral && "text-muted-foreground")}>
                    {signedPoints(factor.contribution)}
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-muted" aria-hidden>
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  {!neutral && (
                    <div
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        width: `${width}%`,
                        left: factor.contribution > 0 ? "50%" : `${50 - width}%`,
                        backgroundColor: factor.contribution > 0 ? CLASS_INFO.AD.color : CLASS_INFO.CN.color,
                      }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Em pontos de probabilidade de Alzheimer.
        {referenceProbability !== undefined && probability !== undefined && (
          <>
            {" "}
            Um paciente de referência, com os valores médios do treino, teria {formatPercent(referenceProbability)}; as
            contribuições somadas levam aos {formatPercent(probability)} deste caso.
          </>
        )}
        {sorted.some((f) => f.imputed) && " Campos não informados usam o valor médio do treino e ficam em zero."} Mostra o
        que pesou no modelo, não a causa da doença.
      </p>
    </div>
  );
}
