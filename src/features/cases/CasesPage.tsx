import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FilterX, PlusCircle, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useCaseList } from "@/hooks/useCases";
import { useAuth } from "@/store/auth";
import { canCreateCase, CLASS_INFO, STATUS_INFO } from "@/lib/domain";
import { CasesTable } from "./CasesTable";
import type { CaseStatus, DiagnosticClass } from "@/types";

export default function CasesPage() {
  const user = useAuth((s) => s.user)!;
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as CaseStatus | null) ?? "todos";
  const suggested = (params.get("sugestao") as DiagnosticClass | null) ?? "todos";
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

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "todos") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const { data, isLoading, isError, refetch } = useCaseList({ search: urlSearch, status, suggested });
  const hasFilters = status !== "todos" || suggested !== "todos" || urlSearch !== "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Casos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Exames enviados para análise, ordenados pelo que precisa de ação primeiro.
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

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, prontuário (PAC-…) ou número do caso"
              aria-label="Buscar casos"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <Select value={status} onValueChange={(v) => setParam("status", v)}>
              <SelectTrigger className="md:w-48" aria-label="Filtrar por status">
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
            <Select value={suggested} onValueChange={(v) => setParam("sugestao", v)}>
              <SelectTrigger className="md:w-56" aria-label="Filtrar por sugestão">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as sugestões</SelectItem>
                {(Object.keys(CLASS_INFO) as DiagnosticClass[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CLASS_INFO[c].short} — {CLASS_INFO[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
              <FilterX /> Limpar
            </Button>
          )}
        </div>

        {!isLoading && data && (
          <p className="border-b bg-muted/30 px-5 py-2 text-xs text-muted-foreground" aria-live="polite">
            {data.length} {data.length === 1 ? "caso encontrado" : "casos encontrados"}
          </p>
        )}

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
                  title="Nenhum caso corresponde aos filtros"
                  description="Revise a busca ou remova algum filtro para ver mais resultados."
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
                  description="Envie uma RM e os dados clínicos de um paciente para receber a primeira sugestão explicada."
                />
              )
            }
          />
        )}
      </Card>
    </div>
  );
}
