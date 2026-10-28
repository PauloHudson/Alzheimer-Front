import type { Prediction } from "@/types";
import { formatPercent } from "@/lib/utils";

/**
 * Quanto da atribuição SHAP veio de cada modalidade, na entrada da MLP de fusão.
 * É o que o late fusion permite explicar por paciente: o ramo tabular é uma
 * Random Forest, então não há atribuição por variável clínica (§5.2 do backend).
 */
export function ModalityShare({ share }: { share: NonNullable<Prediction["modalityShare"]> }) {
  const items = [
    { label: "Imagem (RM)", value: share.image, color: "bg-primary" },
    { label: "Dados clínicos", value: share.tabular, color: "bg-accent" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden>
        {items.map((item) => (
          <div key={item.label} className={`${item.color} rounded-full`} style={{ width: `${item.value * 100}%` }} />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`size-2 rounded-full ${item.color}`} aria-hidden />
              {item.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatPercent(item.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
