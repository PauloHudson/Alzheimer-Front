import { useNavigate } from "react-router-dom";
import { ChevronRight, MessageSquareText, TriangleAlert } from "lucide-react";
import type { CaseSummary } from "@/types";
import { ClassBadge, ConfidenceMeter, FinalDiagnosisBadge, StatusBadge } from "@/components/domain/badges";
import { Skeleton } from "@/components/ui/misc";
import { Hint } from "@/components/ui/tooltip";
import { cn, formatDate, formatRelative } from "@/lib/utils";

export function CasesTable({
  cases,
  loading,
  empty,
  dense = false,
}: {
  cases?: CaseSummary[];
  loading?: boolean;
  empty?: React.ReactNode;
  dense?: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="divide-y">
        {Array.from({ length: dense ? 4 : 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="hidden h-5 w-20 sm:block" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!cases?.length) return <>{empty}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="hidden border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground md:table-header-group">
          <tr>
            <th className="px-5 py-2.5 font-medium">Paciente</th>
            <th className="px-3 py-2.5 font-medium">Sugestão do modelo</th>
            {!dense && <th className="px-3 py-2.5 font-medium">Decisão</th>}
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Atualizado</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {cases.map((c) => (
            <tr
              key={c.id}
              onClick={() => navigate(`/app/casos/${c.id}`)}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/app/casos/${c.id}`)}
              tabIndex={0}
              className="group cursor-pointer outline-none transition-colors hover:bg-muted/40 focus-visible:bg-primary-soft/40"
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      c.patient.sex === "F" ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary",
                    )}
                    aria-hidden
                  >
                    {c.patient.name
                      .split(" ")
                      .filter((p) => p.length > 2)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{c.patient.name}</span>
                      {c.hasOpinion && (
                        <Hint content="Há parecer de especialista registrado neste caso">
                          <MessageSquareText className="size-3.5 shrink-0 text-accent" aria-label="Parecer registrado" />
                        </Hint>
                      )}
                      {c.pendingCount > 0 && (
                        <Hint content={`${c.pendingCount} pendência(s) de qualidade ou dados`}>
                          <TriangleAlert className="size-3.5 shrink-0 text-warning" aria-label="Pendências" />
                        </Hint>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.patient.code} · {c.patient.age} anos · {c.patient.sex === "F" ? "Feminino" : "Masculino"}
                      <span className="hidden sm:inline"> · RM {formatDate(c.examDate)}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 md:hidden">
                      <StatusBadge status={c.status} progress={c.progress} />
                      {c.suggested && <ClassBadge value={c.suggested} />}
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden px-3 py-3 md:table-cell">
                {c.suggested && c.confidence ? (
                  <div className="space-y-1">
                    <ClassBadge value={c.suggested} long={!dense} />
                    <ConfidenceMeter band={c.confidence} className="flex" />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {c.status === "processando" ? "Em análise…" : "Indisponível"}
                  </span>
                )}
              </td>
              {!dense && (
                <td className="hidden px-3 py-3 md:table-cell">
                  {c.finalDiagnosis ? (
                    <div className="flex items-center gap-1.5">
                      <FinalDiagnosisBadge value={c.finalDiagnosis} />
                      {c.agreement && c.agreement !== "concorda" && (
                        <span className="text-xs text-muted-foreground">
                          {c.agreement === "ajusta" ? "ajustou" : "discordou"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              )}
              <td className="hidden px-3 py-3 md:table-cell">
                <StatusBadge status={c.status} progress={c.progress} />
              </td>
              <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-muted-foreground md:table-cell">
                {formatRelative(c.updatedAt)}
              </td>
              <td className="pr-4">
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
