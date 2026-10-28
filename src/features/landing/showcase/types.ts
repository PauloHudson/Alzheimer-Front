/**
 * Tipos da vitrine da landing page. Não fazem parte do contrato com o backend
 * (ver src/types): servem só à demonstração ilustrativa da página inicial.
 */
import type { ConfidenceBand, DiagnosticClass } from "@/types";

export type Modality = "imagem" | "clinico";

export type Plane = "axial" | "coronal" | "sagittal";

/** Posição de uma região em um plano: coordenadas normalizadas 0–1 e faixa de cortes (0–1) onde aparece. */
export interface RegionAnchor {
  x: number;
  y: number;
  slice: [number, number];
}

/** Região destacada pelo mapa de atenção (Grad-CAM). */
export interface AttentionRegion {
  id: string;
  label: string;
  /** Peso relativo da região na sugestão (0–1). */
  weight: number;
  /** Raio do destaque, em fração da largura da imagem. */
  radius: number;
  anchors: Partial<Record<Plane, RegionAnchor>>;
  description: string;
}

/** Contribuição de um fator para a sugestão (SHAP), já traduzida para linguagem clínica. */
export interface FeatureContribution {
  id: string;
  label: string;
  modality: Modality;
  value: string;
  reference?: string;
  /** Positivo = aproxima da classe sugerida; negativo = afasta. */
  contribution: number;
  explanation: string;
  source: string;
}

/** Biomarcador derivado da imagem e comparado a uma referência normativa (abordagem Feature-Augmented). */
export interface Biomarker {
  id: string;
  label: string;
  value: number;
  unit: string;
  /** Percentil para idade e sexo na população de referência. */
  percentile: number;
  referenceRange: string;
  interpretation: string;
}

export interface ShowcasePrediction {
  modelVersion: string;
  generatedAt: string;
  suggested: DiagnosticClass;
  probabilities: Record<DiagnosticClass, number>;
  confidence: ConfidenceBand;
  summary: string;
  regions: AttentionRegion[];
  features: FeatureContribution[];
  biomarkers: Biomarker[];
  /** Avisos específicos do caso (qualidade, fora da distribuição de treino etc.). */
  caveats: string[];
}

