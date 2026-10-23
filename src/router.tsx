import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/store/auth";
import { AppShell } from "@/components/layout/AppShell";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { RouteError } from "@/components/layout/RouteError";

const LandingPage = lazy(() => import("@/features/landing/LandingPage"));
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/ForgotPasswordPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const CasesPage = lazy(() => import("@/features/cases/CasesPage"));
const CaseDetailPage = lazy(() => import("@/features/case-detail/CaseDetailPage"));
const ReportPage = lazy(() => import("@/features/case-detail/ReportPage"));
const NewCasePage = lazy(() => import("@/features/new-case/NewCasePage"));
const GlossaryPage = lazy(() => import("@/features/glossary/GlossaryPage"));
const NotFoundPage = lazy(() => import("@/components/layout/NotFoundPage"));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <Loader2 className="size-6 animate-spin text-primary" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

function RequireAuth() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

function GuestOnly() {
  const user = useAuth((s) => s.user);
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: "/", element: withSuspense(<LandingPage />) },
      {
        element: <GuestOnly />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: "/entrar", element: withSuspense(<LoginPage />) },
              { path: "/cadastro", element: withSuspense(<RegisterPage />) },
              { path: "/recuperar-senha", element: withSuspense(<ForgotPasswordPage />) },
            ],
          },
        ],
      },
      {
        path: "/app",
        element: <RequireAuth />,
        children: [
          { path: "casos/:id/relatorio", element: withSuspense(<ReportPage />) },
          {
            element: <AppShell />,
            children: [
              { index: true, element: withSuspense(<DashboardPage />) },
              { path: "casos", element: withSuspense(<CasesPage />) },
              { path: "casos/novo", element: withSuspense(<NewCasePage />) },
              { path: "casos/:id", element: withSuspense(<CaseDetailPage />) },
              { path: "glossario", element: withSuspense(<GlossaryPage />) },
            ],
          },
        ],
      },
      { path: "*", element: withSuspense(<NotFoundPage />) },
    ],
  },
], {
  // adota desde já o comportamento do React Router v7, facilitando a atualização futura
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
