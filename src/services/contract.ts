import type {
  AuthSession,
  CaseFilters,
  CaseSummary,
  ClinicalCase,
  DashboardStats,
  DecisionInput,
  LoginInput,
  NewCaseInput,
  OpinionInput,
  ReferralInput,
  RegisterInput,
} from "@/types";

/**
 * Contrato entre a interface e o backend.
 * Tanto a API simulada (mock) quanto a HTTP implementam esta interface —
 * as telas nunca sabem qual das duas está em uso.
 */
export interface Api {
  auth: {
    login(input: LoginInput): Promise<AuthSession>;
    register(input: RegisterInput): Promise<AuthSession>;
    requestPasswordReset(email: string): Promise<void>;
    logout(): Promise<void>;
  };
  cases: {
    list(filters?: CaseFilters): Promise<CaseSummary[]>;
    get(id: string): Promise<ClinicalCase>;
    stats(): Promise<DashboardStats>;
    create(input: NewCaseInput): Promise<ClinicalCase>;
    registerDecision(id: string, input: DecisionInput): Promise<ClinicalCase>;
    addAddendum(id: string, text: string): Promise<ClinicalCase>;
    refer(id: string, input: ReferralInput): Promise<ClinicalCase>;
    registerOpinion(id: string, referralId: string, input: OpinionInput): Promise<ClinicalCase>;
    /** Registra eventos de auditoria disparados pela interface (abertura de caso, exportação). */
    logEvent(id: string, action: "caso_aberto" | "relatorio_exportado"): Promise<void>;
  };
  demo?: {
    reset(): Promise<void>;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
