import { AlertTriangle } from "lucide-react";
import type { Prediction } from "@/types";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { ARCHITECTURE_LABEL } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";

/** Limites de generalização declarados na própria interface, conforme a seção 7 do README do backend. */
export function ModelLimits({ prediction }: { prediction: Prediction }) {
  return (
    <div className="space-y-3 text-sm">
      {prediction.caveats.map((caveat) => (
        <p key={caveat} className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {caveat}
        </p>
      ))}
      <ul className="space-y-1.5 text-muted-foreground">
        <li>
          Treinado no <GlossaryTerm id="adni">ADNI</GlossaryTerm>; não validado no Brasil.
        </li>
        {!prediction.classes.includes("MCI") && <li>Distingue só CN e DA; não avalia CCL.</li>}
      </ul>
      <p className="border-t pt-3 text-xs text-muted-foreground">
        {ARCHITECTURE_LABEL[prediction.architecture]} · {formatDateTime(prediction.generatedAt)}
      </p>
    </div>
  );
}
