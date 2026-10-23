import type { Api } from "../contract";
import { request } from "./client";
import type {
  AuthSession,
  CaseSummary,
  ClinicalCase,
  DashboardStats,
} from "@/types";

/**
 * Implementação HTTP do contrato. Os endpoints abaixo são a proposta de API
 * documentada no README — o backend deve segui-los (ou este arquivo deve ser ajustado).
 */
export const httpApi: Api = {
  auth: {
    login: (input) => request<AuthSession>("POST", "/auth/login", { body: input }),
    register: (input) => request<AuthSession>("POST", "/auth/register", { body: input }),
    requestPasswordReset: (email) => request<void>("POST", "/auth/password-reset", { body: { email } }),
    logout: () => request<void>("POST", "/auth/logout"),
  },
  cases: {
    list: (filters = {}) =>
      request<CaseSummary[]>("GET", "/cases", {
        query: {
          search: filters.search,
          status: filters.status === "todos" ? undefined : filters.status,
          suggested: filters.suggested === "todos" ? undefined : filters.suggested,
        },
      }),
    get: (id) => request<ClinicalCase>("GET", `/cases/${id}`),
    stats: () => request<DashboardStats>("GET", "/dashboard/stats"),
    // Em produção o arquivo de RM deve ir via upload multipart/assinado; aqui enviamos só os metadados.
    create: (input) => request<ClinicalCase>("POST", "/cases", { body: input }),
    registerDecision: (id, input) => request<ClinicalCase>("POST", `/cases/${id}/decision`, { body: input }),
    addAddendum: (id, text) => request<ClinicalCase>("POST", `/cases/${id}/addenda`, { body: { text } }),
    refer: (id, input) => request<ClinicalCase>("POST", `/cases/${id}/referrals`, { body: input }),
    registerOpinion: (id, referralId, input) =>
      request<ClinicalCase>("POST", `/cases/${id}/referrals/${referralId}/opinion`, { body: input }),
    logEvent: (id, action) => request<void>("POST", `/cases/${id}/events`, { body: { action } }),
  },
};
