import type { DiagnosticClass, Prediction, Sex, TabularInput } from "@/types";
import { apoe4Alleles } from "@/lib/domain";
import { renderHeatmap, renderSlice } from "./syntheticMri";

/**
 * Gerador de predições plausíveis para a API simulada. Não é o modelo: só produz
 * saídas com o mesmo formato e um comportamento coerente com as entradas.
 */

/** Classes do mock. O modelo em uso no backend é o binário CN × AD; troque para testar 3 classes. */
export const MOCK_CLASSES: DiagnosticClass[] = ["CN", "AD"];

export interface PredictionInput {
  age: number;
  sex: Sex;
  educationYears: number;
  tabular: TabularInput;
  seed: number;
  generatedAt: string;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const jitter = (seed: number, salt: number) => ((Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1;

export function buildPrediction(input: PredictionInput): Prediction {
  const { age, educationYears, tabular, seed } = input;
  const icv = tabular.icvMm3;

  let score = (age - 74) / 7 - (educationYears - 14) * 0.06;
  if (tabular.apoe) score += apoe4Alleles(tabular.apoe) * 0.9;
  if (icv && tabular.hippocampusMm3) score += (0.0045 - tabular.hippocampusMm3 / icv) * 900;
  if (icv && tabular.lateralVentriclesMm3) score += (tabular.lateralVentriclesMm3 / icv - 0.025) * 60;
  score += (jitter(seed, 1) - 0.5) * 1.2;

  const pAd = sigmoid(score);
  const probabilities: Prediction["probabilities"] = {};
  if (MOCK_CLASSES.includes("MCI")) {
    const pMci = 1.6 * pAd * (1 - pAd);
    const rest = 1 - pMci;
    probabilities.CN = rest * (1 - pAd);
    probabilities.MCI = pMci;
    probabilities.AD = rest * pAd;
  } else {
    probabilities.CN = 1 - pAd;
    probabilities.AD = pAd;
  }
  const suggested = MOCK_CLASSES.reduce((best, c) =>
    (probabilities[c] ?? 0) > (probabilities[best] ?? 0) ? c : best,
  );

  const caveats: string[] = [];
  if (age < 55 || age > 90) caveats.push(`Idade fora da faixa de treino (55–90 anos).`);
  if (!icv || !tabular.hippocampusMm3 || !tabular.lateralVentriclesMm3) {
    caveats.push("Volumetria incompleta: valores estimados pelo modelo.");
  }
  if (!tabular.apoe) caveats.push("APOE não informado: valor estimado pelo modelo.");

  const atrophy = Math.max(0, Math.min(1, pAd * 0.8 + (age - 65) / 80));
  const imageShare = 0.47 + (jitter(seed, 2) - 0.5) * 0.12;

  return {
    modelVersion: "late_fusion-kfold-centro-d1",
    architecture: "late_fusion",
    generatedAt: input.generatedAt,
    classes: MOCK_CLASSES,
    probabilities,
    suggested,
    gradcam: {
      sliceUrl: renderSlice(atrophy, seed),
      heatmapUrl: renderHeatmap(pAd, seed),
      explainedClass: "AD",
    },
    modalityShare: { image: imageShare, tabular: 1 - imageShare },
    caveats,
  };
}
