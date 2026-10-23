import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/services/api";
import { useAuth } from "@/store/auth";
import { setUnauthorizedHandler } from "@/services/http/client";
import { router } from "./router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
});

setUnauthorizedHandler(() => {
  useAuth.getState().clear();
  queryClient.clear();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
        <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4500 }} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
