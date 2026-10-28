import type { Api } from "../contract";
import { request } from "./client";
import type { AuthSession, CaseSummary, ClinicalCase } from "@/types";

/**
 * Implementação HTTP do contrato. Os endpoints abaixo são a proposta de API
 * documentada no README — o backend deve segui-los (ou este arquivo deve ser ajustado).
 */
export const httpApi: Api = {
  auth: {
    login: (input) => request<AuthSession>("POST", "/auth/login", { body: input }),
    register: (input) => request<AuthSession>("POST", "/auth/register", { body: input }),
    logout: () => request<void>("POST", "/auth/logout"),
  },
  cases: {
    list: (filters = {}) =>
      request<CaseSummary[]>("GET", "/cases", {
        query: {
          search: filters.search,
          status: filters.status === "todos" ? undefined : filters.status,
        },
      }),
    get: (id) => request<ClinicalCase>("GET", `/cases/${id}`),
    create: ({ mri, ...data }) => {
      // multipart: os dados do caso vão como JSON no campo `data` e a RM no campo `mri`
      const form = new FormData();
      form.append("data", JSON.stringify(data));
      form.append("mri", mri, mri.name);
      return request<ClinicalCase>("POST", "/cases", { body: form });
    },
    registerDecision: (id, input) => request<ClinicalCase>("POST", `/cases/${id}/decision`, { body: input }),
  },
};
