import type {
  Agreement,
  CaseStatus,
  ConfidenceBand,
  DiagnosticClass,
  FinalDiagnosis,
  Prediction,
  ReferralUrgency,
  Role,
} from "@/types";

/** Vocabulário clínico exibido ao usuário (Entrega 1, item 6.6). */
export const CLASS_INFO: Record<
  DiagnosticClass,
  { short: string; label: string; description: string; badge: "cn" | "mci" | "ad"; color: string }
> = {
  CN: {
    short: "CN",
    label: "Cognitivamente normal",
    description: "Padrão compatível com envelhecimento sem comprometimento cognitivo.",
    badge: "cn",
    color: "var(--color-cn)",
  },
  MCI: {
    short: "CCL",
    label: "Comprometimento cognitivo leve",
    description: "Declínio além do esperado para a idade, sem perda de autonomia funcional.",
    badge: "mci",
    color: "var(--color-mci)",
  },
  AD: {
    short: "DA",
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
  { label: string; badge: "secondary" | "warning" | "default" | "accent" | "success"; description: string }
> = {
  processando: {
    label: "Em análise",
    badge: "secondary",
    description: "O modelo está processando a RM e os dados clínicos.",
  },
  pendencia: {
    label: "Pendência",
    badge: "warning",
    description: "Há itens obrigatórios de qualidade ou dados clínicos em aberto.",
  },
  aguardando_revisao: {
    label: "Aguardando revisão",
    badge: "default",
    description: "A sugestão está pronta e aguarda a decisão do médico.",
  },
  encaminhado: {
    label: "Encaminhado",
    badge: "accent",
    description: "Aguardando parecer de especialista.",
  },
  concluido: {
    label: "Concluído",
    badge: "success",
    description: "Decisão registrada na trilha de auditoria.",
  },
};

/**
 * Faixas de confiança — o número nunca aparece isolado (RC10).
 * Os limiares são provisórios e devem ser calibrados com a equipe do modelo.
 */
export const CONFIDENCE_INFO: Record<
  ConfidenceBand,
  { label: string; description: string; tone: "destructive" | "warning" | "success" }
> = {
  baixa: {
    label: "Confiança baixa",
    description:
      "As probabilidades estão próximas entre si. Trate a sugestão com cautela e considere encaminhar a um especialista.",
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

export const AGREEMENT_INFO: Record<Agreement, { label: string; description: string }> = {
  concorda: {
    label: "Concordo com a sugestão",
    description: "A evidência apresentada sustenta a classe sugerida pelo modelo.",
  },
  ajusta: {
    label: "Concordo parcialmente",
    description: "Ajusto a classificação ou a conduta com base em informações adicionais.",
  },
  discorda: {
    label: "Discordo da sugestão",
    description: "Minha avaliação clínica diverge da sugestão do modelo.",
  },
};

export const ROLE_INFO: Record<Role, { label: string; short: string; description: string }> = {
  medico_clinico: {
    label: "Médico(a) clínico(a)",
    short: "Clínico",
    description: "Interpreta a sugestão explicada e registra a decisão.",
  },
  neurologista: {
    label: "Neurologista",
    short: "Neurologia",
    description: "Valida casos encaminhados e emite parecer.",
  },
  radiologista: {
    label: "Radiologista",
    short: "Radiologia",
    description: "Consulta a explicação localizada como apoio ao laudo.",
  },
  tecnico: {
    label: "Técnico(a) em radiologia",
    short: "Técnico",
    description: "Prepara o caso e confere qualidade e dados antes do envio.",
  },
};

export const URGENCY_INFO: Record<ReferralUrgency, { label: string; badge: "secondary" | "warning" | "destructive" }> =
  {
    rotina: { label: "Rotina", badge: "secondary" },
    prioritario: { label: "Prioritário", badge: "warning" },
    urgente: { label: "Urgente", badge: "destructive" },
  };

export function canDecide(role: Role) {
  return role === "medico_clinico" || role === "neurologista";
}

export function canCreateCase(role: Role) {
  return role === "tecnico" || role === "medico_clinico";
}
