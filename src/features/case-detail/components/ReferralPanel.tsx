import { useState } from "react";
import { Clock, MessageSquareText, Phone, Monitor, UserRound, ChevronDown } from "lucide-react";
import type { OpinionChannel, Referral } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { URGENCY_INFO } from "@/lib/domain";
import { cn, formatDate, formatRelative } from "@/lib/utils";

const CHANNEL: Record<OpinionChannel, { label: string; icon: typeof Phone }> = {
  telefone: { label: "por telefone", icon: Phone },
  presencial: { label: "presencial", icon: UserRound },
  sistema: { label: "pelo sistema", icon: Monitor },
};

/**
 * Parecer de especialista com conclusão, critérios e recomendação — o raciocínio que,
 * no cenário C02, se perdia numa nota de rodapé do prontuário (H06).
 */
export function OpinionCard({ referral, defaultOpen = true }: { referral: Referral; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const opinion = referral.opinion!;
  const Channel = CHANNEL[opinion.channel];
  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <MessageSquareText className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">Parecer de {opinion.specialty}</span>
            <Badge variant="accent">
              <Channel.icon /> {Channel.label}
            </Badge>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {opinion.author} · {formatDate(opinion.date)} ({formatRelative(opinion.date)})
          </span>
          <span className="mt-2 block text-sm font-medium">“{opinion.conclusion}”</span>
        </span>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-accent/20 px-4 py-4 text-sm sm:grid-cols-2 sm:pl-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Critérios considerados</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {opinion.criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recomendação</p>
              <p className="mt-1">{opinion.recommendation}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pergunta enviada</p>
              <p className="mt-1 text-muted-foreground">{referral.question}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PendingReferralCard({
  referral,
  onRegisterOpinion,
  canRegister,
}: {
  referral: Referral;
  onRegisterOpinion: () => void;
  canRegister: boolean;
}) {
  const urgency = URGENCY_INFO[referral.urgency];
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-accent/50 bg-card p-4 sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Clock className="size-4" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          Aguardando parecer de {referral.specialty}
          <Badge variant={urgency.badge}>{urgency.label}</Badge>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {referral.specialist ? `${referral.specialist} · ` : ""}encaminhado por {referral.createdBy}{" "}
          {formatRelative(referral.createdAt)}
        </p>
        <p className="mt-2">
          <span className="text-muted-foreground">Pergunta: </span>
          {referral.question}
        </p>
      </div>
      {canRegister && (
        <Button variant="outline" onClick={onRegisterOpinion} className="shrink-0">
          <MessageSquareText /> Registrar parecer
        </Button>
      )}
    </div>
  );
}
