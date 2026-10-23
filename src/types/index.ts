/**
 * Tipos de domínio da interface M-XAI.
 *
 * Estes tipos são o contrato esperado entre o front-end e o futuro backend.
 * Os nomes seguem o vocabulário clínico das Entregas 1–5 (signos do usuário),
 * não estruturas internas do modelo.
 */

// ---------------------------------------------------------------- usuários

export type Role = "medico_clinico" | "neurologista" | "radiologista" | "tecnico";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Registro profissional (CRM para médicos, CRTR para técnicos). */
  registry: string;
  institution: string;
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
  role: Role;
  registry: string;
  institution: string;
}

// ---------------------------------------------------------------- pacientes

export type Sex = "F" | "M";

export interface Patient {
  id: string;
  name: string;
  /** Identificador pseudonimizado exibido em listas (LGPD — minimização). */
  code: string;
  birthDate: string;
  age: number;
  sex: Sex;
  educationYears: number;
}

// ---------------------------------------------------------------- modelo

/** CN = cognitivamente normal · MCI = comprometimento cognitivo leve · AD = doença de Alzheimer */
export type DiagnosticClass = "CN" | "MCI" | "AD";

export type ConfidenceBand = "baixa" | "moderada" | "alta";

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

export interface Prediction {
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

// ---------------------------------------------------------------- caso clínico

export type CaseStatus =
  | "processando"
  | "pendencia"
  | "aguardando_revisao"
  | "encaminhado"
  | "concluido";

export type AcquisitionArtifact = "nenhum" | "leve" | "grave";

export interface AcquisitionQuality {
  volumetricT1: boolean;
  fullCoverage: boolean;
  motionArtifact: AcquisitionArtifact;
  notes?: string;
}

export interface ClinicalData {
  mmse?: number;
  moca?: number;
  cdrSb?: number;
  familyHistory: boolean;
  chiefComplaint: string;
  clinicalQuestion: string;
  familyReport?: string;
}

/** Exame anterior do mesmo paciente, usado na comparação longitudinal (F05). */
export interface PriorExam {
  id: string;
  date: string;
  mmse?: number;
  moca?: number;
  hippocampalVolume?: number;
  suggested?: DiagnosticClass;
  finalDiagnosis?: FinalDiagnosis;
}

export type FinalDiagnosis = DiagnosticClass | "inconclusivo";

export type Agreement = "concorda" | "ajusta" | "discorda";

export interface Decision {
  agreement: Agreement;
  finalDiagnosis: FinalDiagnosis;
  conduct: string;
  justification: string;
  /** IDs de fatores/regiões que o médico usou como evidência. */
  evidenceIds: string[];
  decidedBy: string;
  decidedAt: string;
}

export interface Addendum {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export type ReferralUrgency = "rotina" | "prioritario" | "urgente";
export type OpinionChannel = "sistema" | "telefone" | "presencial";

/** Parecer de especialista registrado de forma estruturada (H06 / cenário C02). */
export interface SpecialistOpinion {
  author: string;
  specialty: string;
  channel: OpinionChannel;
  date: string;
  conclusion: string;
  criteria: string[];
  recommendation: string;
}

export interface Referral {
  id: string;
  specialty: string;
  specialist?: string;
  reason: string;
  question: string;
  urgency: ReferralUrgency;
  createdAt: string;
  createdBy: string;
  status: "aguardando" | "respondido";
  opinion?: SpecialistOpinion;
}

export type AuditAction =
  | "caso_criado"
  | "analise_concluida"
  | "caso_aberto"
  | "decisao_registrada"
  | "adendo"
  | "encaminhado"
  | "parecer_registrado"
  | "relatorio_exportado"
  | "pendencia";

export interface AuditEvent {
  id: string;
  action: AuditAction;
  actor: string;
  at: string;
  detail: string;
}

export interface ClinicalCase {
  id: string;
  patient: Patient;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  examDate: string;
  requestedBy: string;
  preparedBy: string;
  acquisition: AcquisitionQuality;
  clinical: ClinicalData;
  prediction?: Prediction;
  /** 0–100 enquanto status = "processando". */
  progress?: number;
  pendingItems?: string[];
  priorExams: PriorExam[];
  decision?: Decision;
  addenda: Addendum[];
  referrals: Referral[];
  audit: AuditEvent[];
}

/** Versão resumida usada em listas e no painel. */
export type CaseSummary = Pick<
  ClinicalCase,
  "id" | "status" | "createdAt" | "updatedAt" | "examDate" | "requestedBy" | "progress"
> & {
  patient: Pick<Patient, "id" | "name" | "code" | "age" | "sex">;
  suggested?: DiagnosticClass;
  confidence?: ConfidenceBand;
  topProbability?: number;
  finalDiagnosis?: FinalDiagnosis;
  agreement?: Agreement;
  hasOpinion: boolean;
  pendingCount: number;
};

export interface CaseFilters {
  search?: string;
  status?: CaseStatus | "todos";
  suggested?: DiagnosticClass | "todos";
}

export interface DashboardStats {
  awaitingReview: number;
  processing: number;
  referred: number;
  pending: number;
  completedThisMonth: number;
  agreement: Record<Agreement, number>;
  bySuggestion: Record<DiagnosticClass, number>;
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
  fileName: string;
  fileSizeMb: number;
  acquisition: AcquisitionQuality;
  clinical: ClinicalData;
  identityConfirmed: boolean;
}

export interface DecisionInput {
  agreement: Agreement;
  finalDiagnosis: FinalDiagnosis;
  conduct: string;
  justification: string;
  evidenceIds: string[];
}

export interface ReferralInput {
  specialty: string;
  specialist?: string;
  reason: string;
  question: string;
  urgency: ReferralUrgency;
}

export type OpinionInput = Omit<SpecialistOpinion, "date"> & { date?: string };
