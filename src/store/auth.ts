import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthSession, User } from "@/types";
import { setAuthToken } from "@/services/http/client";

interface AuthState {
  session: AuthSession | null;
  user: User | null;
  setSession: (session: AuthSession) => void;
  clear: () => void;
}

/**
 * A sessão fica no sessionStorage (e não no localStorage): estações de trabalho
 * clínicas costumam ser compartilhadas, então fechar a aba encerra o acesso.
 */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      setSession: (session) => {
        setAuthToken(session.token);
        set({ session, user: session.user });
      },
      clear: () => {
        setAuthToken(null);
        set({ session: null, user: null });
      },
    }),
    {
      name: "mxai.session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ session: state.session, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (!state?.session) return;
        if (new Date(state.session.expiresAt).getTime() < Date.now()) {
          state.clear();
        } else {
          setAuthToken(state.session.token);
        }
      },
    },
  ),
);
