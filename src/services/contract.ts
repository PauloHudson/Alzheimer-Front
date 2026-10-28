import type {
  AuthSession,
  CaseFilters,
  CaseSummary,
  ClinicalCase,
  DecisionInput,
  LoginInput,
  NewCaseInput,
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
    logout(): Promise<void>;
  };
  cases: {
    list(filters?: CaseFilters): Promise<CaseSummary[]>;
    get(id: string): Promise<ClinicalCase>;
    /** Cria o caso e dispara a inferência; devolve o caso já com status "processando". */
    create(input: NewCaseInput): Promise<ClinicalCase>;
    registerDecision(id: string, input: DecisionInput): Promise<ClinicalCase>;
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
