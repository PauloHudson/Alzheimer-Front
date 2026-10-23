import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Inbox,
  Loader2,
  MessageSquareText,
  PlusCircle,
  Send,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useAuth } from "@/store/auth";
import { useCaseList, useDashboardStats } from "@/hooks/useCases";
import { CasesTable } from "@/features/cases/CasesTable";
import { canCreateCase, CLASS_INFO, ROLE_INFO } from "@/lib/domain";
import { cn, formatRelative } from "@/lib/utils";
import type { CaseStatus, CaseSummary, Role } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** O que cada perfil precisa resolver primeiro (Entrega 3 — papéis no fluxo). */
const QUEUE_BY_ROLE: Record<Role, { statuses: CaseStatus[]; title: string; description: string }> = {
  medico_clinico: {
    statuses: ["aguardando_revisao"],
    title: "Aguardando sua revisão",
    description: "Casos com sugestão pronta. Os mais recentes primeiro.",
  },
  neurologista: {
    statuses: ["encaminhado", "aguardando_revisao"],
    title: "Encaminhados e em revisão",
    description: "Casos que pedem seu parecer ou validação.",
  },
  radiologista: {
    statuses: ["aguardando_revisao", "encaminhado"],
    title: "Casos com explicação disponível",
    description: "Use a explicação localizada como referência ao laudar.",
  },
  tecnico: {
    statuses: ["pendencia", "processando"],
    title: "Pendências e envios recentes",
    description: "Resolva pendências enquanto ainda é possível corrigir a aquisição.",
  },
};

export default function DashboardPage() {
  const user = useAuth((s) => s.user)!;
  const stats = useDashboardStats();
  const cases = useCaseList();
  const queue = QUEUE_BY_ROLE[user.role];

  const queueCases = useMemo(
    () => cases.data?.filter((c) => queue.statuses.includes(c.status)),
    [cases.data, queue.statuses],
  );
  const opinions = useMemo(() => cases.data?.filter((c) => c.hasOpinion && c.status !== "concluido"), [cases.data]);
  const firstName = user.name.replace(/^Dra?\.\s*/, "").split(" ")[0];
  const title = user.name.match(/^Dra?\./)?.[0];

  const kpis = [
    { key: "aguardando_revisao", label: "Aguardando revisão", value: stats.data?.awaitingReview, icon: Inbox, tone: "text-primary bg-primary-soft" },
    { key: "processando", label: "Em análise", value: stats.data?.processing, icon: Loader2, tone: "text-muted-foreground bg-muted" },
    { key: "encaminhado", label: "Aguardando parecer", value: stats.data?.referred, icon: Send, tone: "text-accent bg-accent-soft" },
    { key: "pendencia", label: "Com pendência", value: stats.data?.pending, icon: FileWarning, tone: "text-warning bg-warning-soft" },
    { key: "concluido", label: "Concluídos (30 dias)", value: stats.data?.completedThisMonth, icon: CheckCircle2, tone: "text-success bg-success-soft" },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting()}, {title ? `${title} ` : ""}
            {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ROLE_INFO[user.role].label} · {user.institution}
          </p>
        </div>
        {canCreateCase(user.role) && (
          <Button asChild>
            <Link to="/app/casos/novo">
              <PlusCircle /> Novo caso
            </Link>
          </Button>
        )}
      </div>

      {/* indicadores */}
      <section aria-label="Resumo dos casos" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Link
            key={kpi.key}
            to={`/app/casos?status=${kpi.key}`}
            className="group rounded-lg border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated"
          >
            <div className="flex items-center justify-between">
              <span className={cn("flex size-8 items-center justify-center rounded-md", kpi.tone)}>
                <kpi.icon className={cn("size-4", kpi.key === "processando" && (kpi.value ?? 0) > 0 && "animate-spin")} />
              </span>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            {stats.isLoading ? (
              <Skeleton className="mt-3 h-7 w-10" />
            ) : (
              <p className="mt-3 text-2xl font-semibold tabular-nums">{kpi.value ?? "—"}</p>
            )}
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-4 border-b">
            <div className="space-y-1">
              <CardTitle>{queue.title}</CardTitle>
              <CardDescription>{queue.description}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/casos">
                Ver todos <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          {cases.isError ? (
            <ErrorState onRetry={() => void cases.refetch()} />
          ) : (
            <CasesTable
              dense
              cases={queueCases}
              loading={cases.isLoading}
              empty={
                <EmptyState
                  icon={CheckCircle2}
                  title="Nada pendente por aqui"
                  description="Quando um novo caso estiver pronto para você, ele aparece nesta lista."
                />
              }
            />
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="size-4 text-accent" /> Pareceres registrados
              </CardTitle>
              <CardDescription>Casos em aberto com parecer de especialista disponível.</CardDescription>
            </CardHeader>
            <CardContent>
              {cases.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : opinions?.length ? (
                <ul className="space-y-2">
                  {opinions.map((c) => (
                    <OpinionRow key={c.id} item={c} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum parecer aguardando sua leitura.</p>
              )}
            </CardContent>
          </Card>

          <AgreementCard
            loading={stats.isLoading}
            agreement={stats.data?.agreement}
            bySuggestion={stats.data?.bySuggestion}
          />
        </div>
      </div>
    </div>
  );
}

function OpinionRow({ item }: { item: CaseSummary }) {
  return (
    <li>
      <Link
        to={`/app/casos/${item.id}`}
        className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{item.patient.name}</span>
          <span className="block text-xs text-muted-foreground">
            {item.patient.code} · atualizado {formatRelative(item.updatedAt)}
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

const AGREEMENT_COLORS = { concorda: "#15803d", ajusta: "#d97706", discorda: "#64748b" };
const AGREEMENT_LABEL = { concorda: "Concordou", ajusta: "Ajustou", discorda: "Discordou" };

/**
 * Comparar as próprias decisões com as sugestões ajuda a calibrar a confiança no modelo
 * (objetivo de "confiança proporcional", Entrega 1, item 7.3).
 */
function AgreementCard({
  loading,
  agreement,
  bySuggestion,
}: {
  loading: boolean;
  agreement?: Record<"concorda" | "ajusta" | "discorda", number>;
  bySuggestion?: Record<"CN" | "MCI" | "AD", number>;
}) {
  const data = agreement
    ? (Object.keys(agreement) as (keyof typeof agreement)[]).map((key) => ({
        key,
        name: AGREEMENT_LABEL[key],
        value: agreement[key],
      }))
    : [];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" /> Suas decisões × sugestões
        </CardTitle>
        <CardDescription>Discordar faz parte do uso: o modelo apoia, não decide.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-36" />
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma decisão registrada ainda.</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative size-32 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={2} strokeWidth={0}>
                    {data.map((d) => (
                      <Cell key={d.key} fill={AGREEMENT_COLORS[d.key]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tabular-nums">{total}</span>
                <span className="text-[10px] text-muted-foreground">decisões</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2 text-sm">
              {data.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: AGREEMENT_COLORS[d.key] }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {bySuggestion && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Sugestões geradas, por classe</p>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              {(Object.keys(bySuggestion) as (keyof typeof bySuggestion)[]).map((k) => {
                const sum = Object.values(bySuggestion).reduce((a, b) => a + b, 0) || 1;
                return (
                  <div
                    key={k}
                    style={{ width: `${(bySuggestion[k] / sum) * 100}%`, backgroundColor: CLASS_INFO[k].color }}
                    title={`${CLASS_INFO[k].label}: ${bySuggestion[k]}`}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {(Object.keys(bySuggestion) as (keyof typeof bySuggestion)[]).map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ backgroundColor: CLASS_INFO[k].color }} />
                  {CLASS_INFO[k].short} {bySuggestion[k]}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
