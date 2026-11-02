import { useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import type { GradCam } from "@/types";
import { cn } from "@/lib/utils";
import { CLASS_INFO } from "@/lib/domain";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";

/**
 * Corte axial que entrou na CNN com o mapa Grad-CAM por cima, exatamente como a
 * API do modelo devolve: a sobreposição e a paleta já vêm prontas no PNG.
 */
export function GradCamViewer({
  gradcam,
  patientCode,
  className,
}: {
  gradcam: GradCam;
  patientCode?: string;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-viewer-border bg-viewer text-viewer-foreground",
        className,
      )}
    >
      <div className="relative flex flex-1 items-center justify-center p-3">
        <div className="relative aspect-square w-full max-w-[560px]">
          <img
            key={gradcam.heatmapUrl}
            src={gradcam.heatmapUrl}
            alt="Corte axial da RM no nível dos ventrículos laterais, com o mapa de atenção do modelo"
            className={cn("absolute inset-0 size-full", state !== "ready" && "invisible")}
            onLoad={() => setState("ready")}
            onError={() => setState("error")}
          />

          {state === "loading" && (
            <Loader2 className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-viewer-muted" />
          )}
          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-viewer-muted">
              <ImageOff className="size-6" /> Não foi possível carregar a imagem.
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 font-mono text-[10px] leading-tight text-viewer-muted sm:text-[11px]">
            <div className="absolute left-0 top-0 space-y-0.5">
              {patientCode && <p className="text-viewer-foreground">{patientCode}</p>}
              <p>AXIAL · NÍVEL VENTRICULAR</p>
            </div>
            <div className="absolute bottom-0 right-0 flex items-center gap-1.5">
              <span>menor</span>
              <span className="h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,#00f,#0ff,#0f0,#ff0,#f00)]" />
              <span>maior</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-viewer-border bg-viewer-panel px-3 py-1.5 text-[11px] text-viewer-muted">
        <GlossaryTerm id="mapa-atencao">Grad-CAM</GlossaryTerm> · classe {CLASS_INFO[gradcam.explainedClass].short}
      </div>
    </div>
  );
}
