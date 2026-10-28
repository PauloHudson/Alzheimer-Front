import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, FilterX, Loader2, PlusCircle, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useCaseList } from "@/hooks/useCases";
import { useAuth } from "@/store/auth";
import { STATUS_INFO } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { CasesTable } from "./CasesTable";
import type { CaseStatus } from "@/types";

const KPIS: { status: CaseStatus; label: string; icon: typeof Clock; tone: string }[] = [
  { status: "aguardando_revisao", label: "Aguardando revisão", icon: Clock, tone: "text-primary bg-primary-soft" },
  { status: "processando", label: "Em análise", icon: Loader2, tone: "text-accent bg-accent-soft" },
  { status: "concluido", label: "Concluídos", icon: CheckCircle2, tone: "text-success bg-success-soft" },
  { status: "erro", label: "Com falha", icon: AlertTriangle, tone: "text-destructive bg-destructive-soft" },
];

/** Primeiro nome sem o título (Dr., Dra.). */
function firstName(name: string) {
  return name.split(" ").find((part) => !/^dra?\.?$/i.test(part)) ?? name;
}

export default function CasesPage() {
  const user = useAuth((s) => s.user)!;
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as CaseStatus | null) ?? "todos";
  const urlSearch = params.get("busca") ?? "";
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => setSearch(urlSearch), [urlSearch]);

  // debounce da busca para não consultar a cada tecla
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (search === urlSearch) return;
      const next = new URLSearchParams(params);
      if (search) next.set("busca", search);
      else next.delete("busca");
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(id);
  }, [search, urlSearch, params, setParams]);

  const setStatus = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === "todos" || value === status) next.delete("status");
    else next.set("status", value);
    setParams(next, { replace: true });
  };

  const { data, isLoading, isError, refetch } = useCaseList({ search: urlSearch, status });
  const all = useCaseList();
  const counts = useMemo(() => {
    const result: Partial<Record<CaseStatus, number>> = {};
    for (const c of all.data ?? []) result[c.status] = (result[c.status] ?? 0) + 1;
    return result;
  }, [all.data]);
  const hasFilters = status !== "todos" || urlSearch !== "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {firstName(user.name)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe os exames enviados para análise.</p>
        </div>
        <Button asChild>
          <Link to="/app/casos/novo">
            <PlusCircle /> Novo caso
          </Link>
        </Button>
      </div>

      {/* indicadores — clicar filtra a lista */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const selected = status === kpi.status;
          return (
            <button
              key={kpi.status}
              type="button"
              onClick={() => setStatus(kpi.status)}
              aria-pressed={selected}
              className={cn(
                "rounded-xl border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40",
                selected && "border-primary ring-1 ring-primary",
              )}
            >
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className={cn("flex size-7 items-center justify-center rounded-lg", kpi.tone)}>
                  <kpi.icon className={cn("size-3.5", kpi.status === "processando" && counts.processando && "animate-spin")} />
                </span>
                {kpi.label}
              </span>
              {all.isLoading ? (
                <Skeleton className="mt-4 h-8 w-12" />
              ) : (
                <span className="mt-3 block text-3xl font-semibold tabular-nums">{counts[kpi.status] ?? 0}</span>
              )}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <h2 className="font-semibold md:mr-auto">Casos</h2>
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou prontuário"
              aria-label="Buscar casos"
              className="h-9 pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 md:w-48" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {(Object.keys(STATUS_INFO) as CaseStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_INFO[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
              <FilterX /> Limpar
            </Button>
          )}
        </div>

        {isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <CasesTable
            cases={data}
            loading={isLoading}
            empty={
              hasFilters ? (
                <EmptyState
                  icon={SearchX}
                  title="Nenhum caso encontrado"
                  description="Revise a busca ou remova o filtro."
                  action={
                    <Button variant="outline" size="sm" onClick={() => setParams({}, { replace: true })}>
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={PlusCircle}
                  title="Nenhum caso ainda"
                  description="Envie uma RM para receber a primeira sugestão."
                  action={
                    <Button size="sm" asChild>
                      <Link to="/app/casos/novo">Novo caso</Link>
                    </Button>
                  }
                />
              )
            }
          />
        )}
      </Card>
    </div>
  );
}
