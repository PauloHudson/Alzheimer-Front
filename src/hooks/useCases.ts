import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/services/api";
import type { CaseFilters, ClinicalCase, DecisionInput, NewCaseInput } from "@/types";

export const caseKeys = {
  all: ["cases"] as const,
  list: (filters: CaseFilters) => ["cases", "list", filters] as const,
  detail: (id: string) => ["cases", "detail", id] as const,
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
    refetchInterval: (query) => (query.state.data?.status === "processando" ? 2_000 : false),
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
    success: (c) => `Caso ${c.id} enviado para análise`,
    error: "Não foi possível enviar o caso",
  });
}

export function useRegisterDecision(id: string) {
  return useCaseMutation((input: DecisionInput) => api.cases.registerDecision(id, input), {
    success: "Decisão registrada",
    error: "Não foi possível registrar a decisão",
  });
}
