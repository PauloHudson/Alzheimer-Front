import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuth } from "@/store/auth";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clear = useAuth((s) => s.clear);

  return useCallback(
    async (reason?: "inatividade") => {
      try {
        await api.auth.logout();
      } catch {
        /* a sessão local é encerrada mesmo se o servidor não responder */
      }
      clear();
      queryClient.clear();
      navigate("/entrar", { replace: true, state: reason ? { reason } : undefined });
    },
    [clear, navigate, queryClient],
  );
}
