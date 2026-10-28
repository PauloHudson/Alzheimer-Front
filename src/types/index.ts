/**
 * Tipos de domínio da interface M-XAI.
 *
 * Estes tipos são o contrato entre o front-end e a API de inferência. Eles
 * espelham o que o pipeline de treino (`Back/…/src/multimodal`) consegue
 * produzir hoje — nada aqui exige uma saída que o modelo ainda não gera.
 */

// ---------------------------------------------------------------- usuários

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

// ---------------------------------------------------------------- pacientes

/** O backend usa `Female`/`Male` (PTGENDER da ADNI); a API faz a conversão. */
export type Sex = "F" | "M";

export interface Patient {
  id: string;
  name: string;
  /** Identificador pseudonimizado exibido em listas (LGPD — minimização). */
  code: string;
  birthDate: string;
  /** Idade na data do exame — coluna `age` do modelo. */
  age: number;
  sex: Sex;
  /** Coluna `educ` do modelo. */
  educationYears: number;
}

// ---------------------------------------------------------------- entradas tabulares

/** Genótipo APOE no formato da ADNI (coluna `apoe`; o backend deriva `apoe4_alleles`). */
export type ApoeGenotype = "ε2/ε2" | "ε2/ε3" | "ε2/ε4" | "ε3/ε3" | "ε3/ε4" | "ε4/ε4";

/** Estado civil no formato da ADNI (coluna `marital`, MARISTAT). */
export type MaritalStatus = "Married" | "Widowed" | "Divorced" | "Never married" | "Unknown";

/**
 * Variáveis clínicas que entram no ramo tabular, além de idade, sexo e
 * escolaridade (que vêm do paciente). Escores cognitivos (MMSE, MoCA, CDR)
 * ficam de fora de propósito: o rótulo da ADNI é derivado deles.
 *
 * Tudo é opcional — o pipeline imputa valores ausentes (KNNImputer).
 */
export interface TabularInput {
  apoe?: ApoeGenotype;
  marital?: MaritalStatus;
  /**
   * Volumetria do FreeSurfer, em mm³. O backend normaliza pelo ICV para obter
   * `etiv`, `hippocampus_norm` e `ventricle_norm`.
   */
  icvMm3?: number;
  hippocampusMm3?: number;
  lateralVentriclesMm3?: number;
}

// ---------------------------------------------------------------- modelo

/** CN = cognitivamente normal · MCI = comprometimento cognitivo leve · AD = doença de Alzheimer */
export type DiagnosticClass = "CN" | "MCI" | "AD";

export type ConfidenceBand = "baixa" | "moderada" | "alta";

export type Architecture = "late_fusion" | "early_fusion" | "image_only" | "tabular_only";

/**
 * Grad-CAM da `layer4` da ResNet50 sobre o corte axial que entrou na CNN.
 * Ambas as imagens têm o mesmo tamanho (224×224).
 */
export interface GradCam {
  /** Corte axial no nível ventricular, já pré-processado (PNG em tons de cinza; URL ou data URI). */
  sliceUrl: string;
  /** Mapa normalizado em [0, 1] como PNG em tons de cinza (0 = preto, 1 = branco). A interface aplica a paleta. */
  heatmapUrl: string;
  /** Classe cujo logit foi explicado (o pipeline explica sempre AD). */
  explainedClass: DiagnosticClass;
}

export interface Prediction {
  modelVersion: string;
  architecture: Architecture;
  generatedAt: string;
  /** Classes do modelo na ordem de saída — `["CN", "AD"]` no binário atual, `["CN", "MCI", "AD"]` no de 3 classes. */
  classes: DiagnosticClass[];
  probabilities: Partial<Record<DiagnosticClass, number>>;
  suggested: DiagnosticClass;
  /** Ausente em `tabular_only`, que não tem ramo de imagem. */
  gradcam?: GradCam;
  /**
   * Fração da atribuição SHAP (|SHAP|) na entrada da MLP de fusão. Só existe
   * nas arquiteturas de fusão. Soma 1.
   */
  modalityShare?: { image: number; tabular: number };
  /** Avisos específicos do caso (qualidade, fora da distribuição de treino etc.). */
  caveats: string[];
}

// ---------------------------------------------------------------- caso clínico

export type CaseStatus = "processando" | "erro" | "aguardando_revisao" | "concluido";

export type FinalDiagnosis = DiagnosticClass | "inconclusivo";

export type Agreement = "concorda" | "ajusta" | "discorda";

export interface Decision {
  agreement: Agreement;
  finalDiagnosis: FinalDiagnosis;
  justification: string;
  decidedBy: string;
  decidedAt: string;
}

export interface ClinicalCase {
  id: string;
  patient: Patient;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  examDate: string;
  createdBy: string;
  tabular: TabularInput;
  /** Observações livres; não entram no modelo. */
  notes?: string;
  prediction?: Prediction;
  /** Mensagem do backend quando status = "erro" (ex.: falha no skull strip). */
  error?: string;
  decision?: Decision;
}

/** Versão resumida usada na lista de casos. */
export type CaseSummary = Pick<ClinicalCase, "id" | "status" | "createdAt" | "updatedAt" | "examDate"> & {
  patient: Pick<Patient, "id" | "name" | "code" | "age" | "sex">;
  suggested?: DiagnosticClass;
  probabilities?: Prediction["probabilities"];
  finalDiagnosis?: FinalDiagnosis;
};

export interface CaseFilters {
  search?: string;
  status?: CaseStatus | "todos";
}

// ---------------------------------------------------------------- entradas

export interface NewCaseInput {
  patient: {
    name: string;
    birthDate: string;
    sex: Sex;
    educationYears: number;
  };
  examDate: string;
  tabular: TabularInput;
  notes?: string;
  /** Série T1 (DICOM zipado ou NIfTI). Vai como multipart no campo `mri`. */
  mri: File;
}

export interface DecisionInput {
  agreement: Agreement;
  finalDiagnosis: FinalDiagnosis;
  justification: string;
}
