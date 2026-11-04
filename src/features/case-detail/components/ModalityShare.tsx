import { ClipboardList, ScanLine } from "lucide-react";
import type { Prediction } from "@/types";
import { formatPercent } from "@/lib/utils";

/** Quanto das contribuições deste exame veio da imagem e quanto dos dados clínicos. */
export function ModalityShare({ share }: { share: NonNullable<Prediction["modalityShare"]> }) {
  const items = [
    { label: "Imagem (RM)", value: share.image, color: "bg-primary", icon: <ScanLine className="size-3.5 text-primary" /> },
    {
      label: "Dados clínicos",
      value: share.tabular,
      color: "bg-accent",
      icon: <ClipboardList className="size-3.5 text-accent" />,
    },
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
              {item.icon}
              {item.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatPercent(item.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
