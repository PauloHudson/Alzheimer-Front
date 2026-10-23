import { Link } from "react-router-dom";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { GLOSSARY_BY_ID } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * Termo técnico com explicação contextual no próprio lugar onde aparece —
 * princípio de "citação embutida" (RC09, iatroX) aplicado ao glossário (F08).
 */
export function GlossaryTerm({
  id,
  children,
  className,
}: {
  id: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY_BY_ID[id];
  if (!entry) return <>{children}</>;
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-help underline decoration-dotted decoration-1 underline-offset-[3px] decoration-current/50 hover:decoration-current",
            className,
          )}
        >
          {children ?? entry.term}
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 w-72 rounded-lg border bg-card p-3 text-left text-foreground shadow-elevated animate-fade-in"
        >
          <p className="text-sm font-semibold">
            {entry.term}
            {entry.aka && <span className="font-normal text-muted-foreground"> · {entry.aka}</span>}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.short}</p>
          <Link
            to={`/app/glossario#${entry.id}`}
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            Ver no glossário →
          </Link>
          <TooltipPrimitive.Arrow className="fill-card" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
