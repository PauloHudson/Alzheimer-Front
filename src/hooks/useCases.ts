import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/services/api";
import type {
  CaseFilters,
  ClinicalCase,
  DecisionInput,
  NewCaseInput,
  OpinionInput,
  ReferralInput,
} from "@/types";

export const caseKeys = {
  all: ["cases"] as const,
  list: (filters: CaseFilters) => ["cases", "list", filters] as const,
  detail: (id: string) => ["cases", "detail", id] as const,
  stats: ["cases", "stats"] as const,
};

/** Atualiza a lista com frequência maior enquanto houver caso em processamento. */
export function useCaseList(filters: CaseFilters = {}) {
  return useQuery({
    queryKey: caseKeys.list(filters),
    queryFn: () => api.cases.list(filters),
    refetchInterval: (query) =>
      query.state.data?.some((c) => c.status === "processando") ? 2_000 : 30_000,
  });
}

export function useCase(id: string | undefined) {
  return useQuery({
    queryKey: caseKeys.detail(id ?? ""),
    queryFn: () => api.cases.get(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "processando" ? 1_500 : false),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: caseKeys.stats,
    queryFn: () => api.cases.stats(),
    refetchInterval: 30_000,
  });
}

function useCaseMutation<TVars>(
  fn: (vars: TVars) => Promise<ClinicalCase>,
  messages: { success: string | ((c: ClinicalCase) => string); error?: string },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (updated) => {
      queryClient.setQueryData(caseKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["cases", "list"] });
      void queryClient.invalidateQueries({ queryKey: caseKeys.stats });
      toast.success(typeof messages.success === "function" ? messages.success(updated) : messages.success);
    },
    onError: (error) => {
      toast.error(messages.error ?? "Não foi possível concluir a ação", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
}

export function useCreateCase() {
  return useCaseMutation((input: NewCaseInput) => api.cases.create(input), {
    success: (c) =>
      c.status === "pendencia"
        ? `Caso ${c.id} salvo com pendências`
        : `Caso ${c.id} enviado para análise`,
    error: "Não foi possível enviar o caso",
  });
}

export function useRegisterDecision(id: string) {
  return useCaseMutation((input: DecisionInput) => api.cases.registerDecision(id, input), {
    success: "Decisão registrada na trilha de auditoria",
    error: "Não foi possível registrar a decisão",
  });
}

export function useAddAddendum(id: string) {
  return useCaseMutation((text: string) => api.cases.addAddendum(id, text), {
    success: "Adendo incluído",
  });
}

export function useReferCase(id: string) {
  return useCaseMutation((input: ReferralInput) => api.cases.refer(id, input), {
    success: "Caso encaminhado ao especialista",
    error: "Não foi possível encaminhar o caso",
  });
}

export function useRegisterOpinion(id: string) {
  return useCaseMutation(
    ({ referralId, input }: { referralId: string; input: OpinionInput }) =>
      api.cases.registerOpinion(id, referralId, input),
    { success: "Parecer registrado no caso" },
  );
}
