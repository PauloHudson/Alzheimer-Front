import type { DiagnosticClass, Sex } from "@/types";
import type { AttentionRegion, Biomarker, FeatureContribution, ShowcasePrediction as Prediction } from "./types";
import { ANATOMY } from "./anatomy";
import { CLASS_INFO, confidenceFromProbabilities } from "@/lib/domain";
import { lowerFirst } from "@/lib/utils";

/**
 * Gera a predição ILUSTRATIVA exibida na landing page (hero e narrativa da
 * rolagem). Não é usada pela aplicação nem pela API simulada.
 * Nenhum valor aqui tem validade clínica.
 */
export interface PredictionProfile {
  probabilities: Record<DiagnosticClass, number>;
  age: number;
  sex: Sex;
  educationYears: number;
  familyHistory: boolean;
  mmse?: number;
  moca?: number;
  cdrSb?: number;
  /** Volumes em cm³ e percentis normativos (idade/sexo). */
  hippocampusLeft: number;
  hippocampusRight: number;
  hippocampusPercentile: number;
  entorhinalThickness: number;
  entorhinalPercentile: number;
  ventricularVolume: number;
  ventricularPercentile: number;
  priorMmse?: number;
  generatedAt: string;
  caveats?: string[];
  summary?: string;
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function suggestedClass(p: Record<DiagnosticClass, number>): DiagnosticClass {
  return (Object.entries(p) as [DiagnosticClass, number][]).sort((a, b) => b[1] - a[1])[0]![0];
}

/** Gravidade 0 (CN) → 1 (AD), usada para dimensionar o mapa de atenção. */
function severity(p: Record<DiagnosticClass, number>) {
  return p.MCI * 0.5 + p.AD * 1;
}

function buildRegions(profile: PredictionProfile, sev: number): AttentionRegion[] {
  const leftDeficit = (100 - percentileFromVolume(profile.hippocampusLeft, profile)) / 100;
  const rightDeficit = (100 - percentileFromVolume(profile.hippocampusRight, profile)) / 100;
  const base = 0.25 + sev * 0.75;

  const regions: AttentionRegion[] = [
    {
      id: "hipocampo-esquerdo",
      label: "Hipocampo esquerdo",
      weight: round(base * (0.55 + leftDeficit * 0.45)),
      radius: 0.075,
      anchors: ANATOMY.hippocampusLeft,
      description:
        "Estrutura central da memória recente. Redução de volume é um dos achados mais associados à doença de Alzheimer.",
    },
    {
      id: "hipocampo-direito",
      label: "Hipocampo direito",
      weight: round(base * (0.5 + rightDeficit * 0.45)),
      radius: 0.075,
      anchors: ANATOMY.hippocampusRight,
      description: "Avaliado em conjunto com o lado esquerdo; assimetria acentuada merece atenção.",
    },
    {
      id: "cortex-entorrinal",
      label: "Córtex entorrinal",
      weight: round(base * (0.35 + (100 - profile.entorhinalPercentile) / 250)),
      radius: 0.06,
      anchors: ANATOMY.entorhinalLeft,
      description: "Uma das primeiras regiões afetadas na doença de Alzheimer; o afinamento costuma preceder sintomas.",
    },
    {
      id: "ventriculos",
      label: "Ventrículos laterais",
      weight: round(0.12 + sev * 0.35 * (profile.ventricularPercentile / 100)),
      radius: 0.1,
      anchors: ANATOMY.ventricles,
      description:
        "Dilatação ventricular acompanha a perda de volume cerebral, mas não é específica de Alzheimer.",
    },
  ];

  if (sev > 0.55) {
    regions.push({
      id: "precuneo",
      label: "Pré-cúneo / cíngulo posterior",
      weight: round(0.2 + (sev - 0.55) * 0.9),
      radius: 0.085,
      anchors: ANATOMY.precuneus,
      description: "Região parietal medial frequentemente envolvida em fases mais avançadas.",
    });
  }

  return regions.sort((a, b) => b.weight - a.weight);
}

/** Aproximação do percentil para um único hipocampo a partir do percentil médio do caso. */
function percentileFromVolume(volume: number, profile: PredictionProfile) {
  const mean = (profile.hippocampusLeft + profile.hippocampusRight) / 2;
  const delta = (volume - mean) / mean;
  return Math.max(1, Math.min(99, Math.round(profile.hippocampusPercentile + delta * 220)));
}

function buildFeatures(profile: PredictionProfile, suggested: DiagnosticClass): FeatureContribution[] {
  const towardDisease = suggested !== "CN";
  const sign = (diseaseDirection: number) => round(towardDisease ? diseaseDirection : -diseaseDirection, 3);
  const pL = percentileFromVolume(profile.hippocampusLeft, profile);
  const pR = percentileFromVolume(profile.hippocampusRight, profile);

  const features: FeatureContribution[] = [
    {
      id: "f-hipocampo-esq",
      label: "Volume do hipocampo esquerdo",
      modality: "imagem",
      value: `${profile.hippocampusLeft.toFixed(2)} cm³`,
      reference: `percentil ${pL} para idade e sexo`,
      contribution: sign((30 - pL) / 90),
      explanation:
        pL < 20
          ? "Volume abaixo do esperado para a idade — padrão semelhante ao de pacientes com declínio cognitivo na base de treino."
          : "Volume dentro da faixa esperada para a idade, o que afasta atrofia hipocampal significativa.",
      source: "RM · segmentação automática (T1 volumétrica)",
    },
    {
      id: "f-hipocampo-dir",
      label: "Volume do hipocampo direito",
      modality: "imagem",
      value: `${profile.hippocampusRight.toFixed(2)} cm³`,
      reference: `percentil ${pR} para idade e sexo`,
      contribution: sign((30 - pR) / 110),
      explanation:
        pR < 20
          ? "Também reduzido; a redução bilateral reforça o padrão neurodegenerativo."
          : "Preservado em relação à idade.",
      source: "RM · segmentação automática (T1 volumétrica)",
    },
    {
      id: "f-entorrinal",
      label: "Espessura do córtex entorrinal",
      modality: "imagem",
      value: `${profile.entorhinalThickness.toFixed(2)} mm`,
      reference: `percentil ${profile.entorhinalPercentile}`,
      contribution: sign((30 - profile.entorhinalPercentile) / 150),
      explanation:
        profile.entorhinalPercentile < 25
          ? "Afinamento cortical em região precocemente afetada na doença de Alzheimer."
          : "Espessura preservada para a idade.",
      source: "RM · medida automática de espessura cortical",
    },
    {
      id: "f-ventriculos",
      label: "Volume ventricular",
      modality: "imagem",
      value: `${profile.ventricularVolume.toFixed(0)} cm³`,
      reference: `percentil ${profile.ventricularPercentile}`,
      contribution: sign((profile.ventricularPercentile - 70) / 260),
      explanation:
        profile.ventricularPercentile > 75
          ? "Ventrículos maiores que o esperado, compatíveis com perda de volume cerebral global."
          : "Volume ventricular sem alteração relevante para a idade.",
      source: "RM · segmentação automática",
    },
  ];

  if (profile.mmse !== undefined) {
    const drop = profile.priorMmse !== undefined ? profile.priorMmse - profile.mmse : 0;
    features.push({
      id: "f-mmse",
      label: "MMSE",
      modality: "clinico",
      value: `${profile.mmse}/30`,
      reference: profile.priorMmse !== undefined ? `anterior: ${profile.priorMmse}/30` : "limítrofe entre 24 e 28",
      contribution: sign((27 - profile.mmse) / 14 + drop * 0.025),
      explanation:
        profile.mmse >= 28
          ? "Pontuação preservada; afasta comprometimento funcional relevante."
          : drop > 0
            ? `Queda de ${drop} ${drop === 1 ? "ponto" : "pontos"} em relação ao exame anterior — a evolução pesa mais que o valor isolado.`
            : "Pontuação limítrofe; deve ser interpretada considerando a escolaridade.",
      source: "Prontuário · teste aplicado na consulta",
    });
  }

  if (profile.moca !== undefined) {
    features.push({
      id: "f-moca",
      label: "MoCA",
      modality: "clinico",
      value: `${profile.moca}/30`,
      reference: "esperado ≥ 26",
      contribution: sign((26 - profile.moca) / 18),
      explanation:
        profile.moca < 26
          ? "Abaixo do ponto de corte; o MoCA é mais sensível que o MMSE para comprometimento leve."
          : "Dentro do esperado.",
      source: "Prontuário · teste aplicado na consulta",
    });
  }

  if (profile.cdrSb !== undefined) {
    features.push({
      id: "f-cdr",
      label: "CDR-SB",
      modality: "clinico",
      value: profile.cdrSb.toFixed(1),
      reference: "0 = sem impacto funcional",
      contribution: sign((profile.cdrSb - 1.5) / 12),
      explanation:
        profile.cdrSb >= 2.5
          ? "Impacto funcional no dia a dia relatado na avaliação."
          : "Impacto funcional discreto ou ausente.",
      source: "Prontuário · entrevista com paciente e acompanhante",
    });
  }

  features.push(
    {
      id: "f-idade",
      label: "Idade",
      modality: "clinico",
      value: `${profile.age} anos`,
      contribution: sign((profile.age - 70) / 180),
      explanation: "A idade aumenta o risco basal, mas contribui pouco isoladamente.",
      source: "Cadastro do paciente",
    },
    {
      id: "f-escolaridade",
      label: "Escolaridade",
      modality: "clinico",
      value: `${profile.educationYears} anos`,
      contribution: sign((8 - profile.educationYears) / 160),
      explanation:
        profile.educationYears >= 12
          ? "Escolaridade alta pode mascarar sintomas iniciais (reserva cognitiva)."
          : "Escolaridade baixa reduz o desempenho esperado em testes de rastreio.",
      source: "Cadastro do paciente",
    },
    {
      id: "f-historico",
      label: "Histórico familiar de demência",
      modality: "clinico",
      value: profile.familyHistory ? "Sim" : "Não",
      contribution: sign(profile.familyHistory ? 0.045 : -0.015),
      explanation: profile.familyHistory
        ? "Parente de primeiro grau com demência aumenta o risco."
        : "Sem histórico familiar relatado.",
      source: "Anamnese",
    },
  );

  return features.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function buildBiomarkers(profile: PredictionProfile): Biomarker[] {
  const total = profile.hippocampusLeft + profile.hippocampusRight;
  return [
    {
      id: "b-hipocampo",
      label: "Volume hipocampal total",
      value: round(total),
      unit: "cm³",
      percentile: profile.hippocampusPercentile,
      referenceRange: profile.sex === "F" ? "5,9 – 7,6 cm³" : "6,3 – 8,1 cm³",
      interpretation:
        profile.hippocampusPercentile < 5
          ? "Claramente reduzido para a idade"
          : profile.hippocampusPercentile < 25
            ? "Reduzido para a idade"
            : "Dentro do esperado",
    },
    {
      id: "b-entorrinal",
      label: "Espessura entorrinal média",
      value: round(profile.entorhinalThickness),
      unit: "mm",
      percentile: profile.entorhinalPercentile,
      referenceRange: "3,0 – 3,8 mm",
      interpretation: profile.entorhinalPercentile < 25 ? "Afinada para a idade" : "Preservada",
    },
    {
      id: "b-ventriculos",
      label: "Volume ventricular",
      value: round(profile.ventricularVolume, 0),
      unit: "cm³",
      percentile: profile.ventricularPercentile,
      referenceRange: "20 – 45 cm³",
      interpretation: profile.ventricularPercentile > 75 ? "Aumentado para a idade" : "Dentro do esperado",
    },
  ];
}

function buildSummary(suggested: DiagnosticClass, features: FeatureContribution[]) {
  const supporting = features.filter((f) => f.contribution > 0).slice(0, 2);
  const opposing = features.find((f) => f.contribution < -0.04);
  const label = lowerFirst(CLASS_INFO[suggested].label);
  if (supporting.length === 0) {
    return `Nenhum fator isolado sustenta com clareza a sugestão de ${label}; ela resulta de contribuições pequenas e próximas entre si. Trate-a como inconclusiva e apoie-se na avaliação clínica.`;
  }
  const support = supporting.map((f) => lowerFirst(f.label)).join(" e ");
  let text = `A sugestão de ${label} se apoia principalmente em: ${support}.`;
  if (opposing) text += ` ${opposing.label} aponta na direção contrária e deve ser considerado.`;
  return text;
}

export function buildPrediction(profile: PredictionProfile): Prediction {
  const suggested = suggestedClass(profile.probabilities);
  const sev = severity(profile.probabilities);
  const features = buildFeatures(profile, suggested);
  const confidence = confidenceFromProbabilities(profile.probabilities);

  const caveats = [...(profile.caveats ?? [])];
  if (profile.age > 85) caveats.push("Idade acima da faixa mais representada nos dados de treino (55–85 anos).");
  if (profile.educationYears < 6)
    caveats.push("Escolaridade baixa é pouco representada no ADNI; a sugestão pode ser menos confiável.");

  return {
    modelVersion: "M-XAI Net",
    generatedAt: profile.generatedAt,
    suggested,
    probabilities: profile.probabilities,
    confidence,
    summary: profile.summary ?? buildSummary(suggested, features),
    regions: buildRegions(profile, sev),
    features,
    biomarkers: buildBiomarkers(profile),
    caveats,
  };
}
