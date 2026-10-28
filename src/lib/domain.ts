import type {
  Agreement,
  ApoeGenotype,
  Architecture,
  CaseStatus,
  ConfidenceBand,
  DiagnosticClass,
  FinalDiagnosis,
  MaritalStatus,
  Prediction,
} from "@/types";
import { formatPercent, lowerFirst } from "@/lib/utils";

/**
 * Vocabulário clínico exibido ao usuário. `short` é o nome legível usado na
 * interface; `code` é a sigla, mostrada só como apoio ao lado do nome.
 */
export const CLASS_INFO: Record<
  DiagnosticClass,
  { short: string; code: string; label: string; description: string; badge: "cn" | "mci" | "ad"; color: string }
> = {
  CN: {
    short: "Normal",
    code: "CN",
    label: "Cognitivamente normal",
    description: "Padrão compatível com envelhecimento sem comprometimento cognitivo.",
    badge: "cn",
    color: "var(--color-cn)",
  },
  MCI: {
    short: "Comprometimento leve",
    code: "CCL",
    label: "Comprometimento cognitivo leve",
    description: "Declínio além do esperado para a idade, sem perda de autonomia funcional.",
    badge: "mci",
    color: "var(--color-mci)",
  },
  AD: {
    short: "Alzheimer",
    code: "DA",
    label: "Padrão compatível com Alzheimer",
    description: "Achados de imagem e clínicos semelhantes aos de pacientes com doença de Alzheimer.",
    badge: "ad",
    color: "var(--color-ad)",
  },
};

export const FINAL_DIAGNOSIS_LABEL: Record<FinalDiagnosis, string> = {
  CN: "Cognitivamente normal",
  MCI: "Comprometimento cognitivo leve",
  AD: "Doença de Alzheimer provável",
  inconclusivo: "Inconclusivo — requer investigação",
};

export const STATUS_INFO: Record<
  CaseStatus,
  { label: string; badge: "secondary" | "destructive" | "default" | "success"; description: string }
> = {
  processando: {
    label: "Em análise",
    badge: "secondary",
    description: "O modelo está processando a RM e os dados clínicos.",
  },
  erro: {
    label: "Falha na análise",
    badge: "destructive",
    description: "O backend não conseguiu processar o exame.",
  },
  aguardando_revisao: {
    label: "Aguardando revisão",
    badge: "default",
    description: "A sugestão está pronta e aguarda a decisão do médico.",
  },
  concluido: {
    label: "Concluído",
    badge: "success",
    description: "Decisão do médico registrada.",
  },
};

/**
 * Faixas de confiança — o número nunca aparece isolado.
 * Os limiares são provisórios: o README do backend mostra que a calibração não
 * transfere entre coortes, então eles precisam ser revistos com a equipe do modelo.
 */
export const CONFIDENCE_INFO: Record<
  ConfidenceBand,
  { label: string; description: string; tone: "destructive" | "warning" | "success" }
> = {
  baixa: {
    label: "Confiança baixa",
    description: "As probabilidades estão próximas entre si. Trate a sugestão com cautela.",
    tone: "destructive",
  },
  moderada: {
    label: "Confiança moderada",
    description: "Há uma classe predominante, mas com margem relevante para as demais. Confira as evidências.",
    tone: "warning",
  },
  alta: {
    label: "Confiança alta",
    description:
      "Uma classe predomina com margem clara. Confiança alta do modelo não substitui a avaliação clínica.",
    tone: "success",
  },
};

export function confidenceFromProbabilities(p: Prediction["probabilities"]): ConfidenceBand {
  const sorted = Object.values(p).sort((a, b) => b - a);
  const top = sorted[0] ?? 0;
  const margin = top - (sorted[1] ?? 0);
  if (top >= 0.72 && margin >= 0.4) return "alta";
  if (top >= 0.55 && margin >= 0.2) return "moderada";
  return "baixa";
}

/** Frase-resumo montada a partir das probabilidades — o modelo não gera texto. */
export function summarizePrediction(prediction: Prediction) {
  const top = prediction.probabilities[prediction.suggested] ?? 0;
  const others = prediction.classes
    .filter((c) => c !== prediction.suggested)
    .map((c) => `${CLASS_INFO[c].short} ${formatPercent(prediction.probabilities[c] ?? 0)}`)
    .join(", ");
  return `O modelo atribui ${formatPercent(top)} de probabilidade a ${lowerFirst(
    CLASS_INFO[prediction.suggested].label,
  )} (${others}).`;
}

export const AGREEMENT_INFO: Record<Agreement, { label: string; description: string }> = {
  concorda: {
    label: "Concordo com a sugestão",
    description: "A evidência apresentada sustenta a classe sugerida pelo modelo.",
  },
  ajusta: {
    label: "Concordo parcialmente",
    description: "Ajusto a classificação com base em informações adicionais.",
  },
  discorda: {
    label: "Discordo da sugestão",
    description: "Minha avaliação clínica diverge da sugestão do modelo.",
  },
};

export const ARCHITECTURE_LABEL: Record<Architecture, string> = {
  late_fusion: "Fusão tardia (ResNet50 + Random Forest)",
  early_fusion: "Fusão precoce (ResNet50 + MLP)",
  image_only: "Só imagem (ResNet50)",
  tabular_only: "Só dados clínicos (MLP)",
};

export const APOE_OPTIONS: ApoeGenotype[] = ["ε2/ε2", "ε2/ε3", "ε2/ε4", "ε3/ε3", "ε3/ε4", "ε4/ε4"];

export const MARITAL_LABEL: Record<MaritalStatus, string> = {
  Married: "Casado(a)",
  Widowed: "Viúvo(a)",
  Divorced: "Divorciado(a)",
  "Never married": "Nunca casou",
  Unknown: "Não informado",
};

/** Número de alelos ε4 — o mesmo `apoe4_alleles` que o backend deriva. */
export function apoe4Alleles(genotype: ApoeGenotype) {
  return (genotype.match(/4/g) ?? []).length;
}
