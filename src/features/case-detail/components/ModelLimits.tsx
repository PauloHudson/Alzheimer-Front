import { AlertTriangle, Info } from "lucide-react";
import type { Prediction } from "@/types";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { formatDateTime } from "@/lib/utils";

/** Limites de generalização declarados na própria interface (RC11). */
export function ModelLimits({ prediction }: { prediction: Prediction }) {
  return (
    <div className="space-y-3">
      {prediction.caveats.length > 0 && (
        <ul className="space-y-2">
          {prediction.caveats.map((caveat) => (
            <li
              key={caveat}
              className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span className="leading-relaxed">{caveat}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2.5 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Modelo <strong className="font-medium text-foreground">{prediction.modelVersion}</strong>, treinado com dados
          do <GlossaryTerm id="adni">ADNI</GlossaryTerm> (população majoritariamente norte-americana, 55–90 anos, alta
          escolaridade). Não validado na população brasileira. Sugestão gerada em{" "}
          {formatDateTime(prediction.generatedAt)}.
        </p>
      </div>
    </div>
  );
}
