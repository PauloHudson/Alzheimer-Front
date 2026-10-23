import {
  Activity,
  AlertTriangle,
  Cpu,
  Eye,
  FilePlus2,
  FileText,
  Gavel,
  MessageSquareText,
  NotebookPen,
  Send,
  type LucideIcon,
} from "lucide-react";
import type { AuditAction, AuditEvent } from "@/types";
import { formatDateTime } from "@/lib/utils";

const ICONS: Record<AuditAction, LucideIcon> = {
  caso_criado: FilePlus2,
  analise_concluida: Cpu,
  caso_aberto: Eye,
  decisao_registrada: Gavel,
  adendo: NotebookPen,
  encaminhado: Send,
  parecer_registrado: MessageSquareText,
  relatorio_exportado: FileText,
  pendencia: AlertTriangle,
};

/** Trilha de auditoria somente leitura: o quê, quando e por quem (Entrega 1, item 5.5). */
export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const ordered = [...events].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ol className="relative space-y-4 border-l pl-6">
      {ordered.map((event) => {
        const Icon = ICONS[event.action] ?? Activity;
        return (
          <li key={event.id} className="relative">
            <span className="absolute -left-[33px] flex size-6 items-center justify-center rounded-full border bg-card">
              <Icon className="size-3 text-muted-foreground" />
            </span>
            <p className="text-sm">{event.detail}</p>
            <p className="text-xs text-muted-foreground">
              {event.actor} · {formatDateTime(event.at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
