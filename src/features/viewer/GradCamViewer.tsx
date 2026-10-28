import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, ImageOff, Loader2 } from "lucide-react";
import type { GradCam } from "@/types";
import { cn } from "@/lib/utils";
import { CLASS_INFO } from "@/lib/domain";
import { Slider } from "@/components/ui/slider";
import { Kbd, Switch } from "@/components/ui/misc";
import { GlossaryTerm } from "@/components/domain/GlossaryTerm";
import { loadImage, paintHeatmap } from "./heatmap";

/**
 * Corte axial que entrou na CNN com o mapa Grad-CAM por cima.
 * O backend manda o mapa em tons de cinza ([0, 1]); a paleta é aplicada aqui.
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
  const heatRef = useRef<HTMLCanvasElement>(null);
  const [overlay, setOverlay] = useState(true);
  const [opacity, setOpacity] = useState(60);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    loadImage(gradcam.heatmapUrl)
      .then((img) => {
        const canvas = heatRef.current;
        if (cancelled || !canvas) return;
        paintHeatmap(canvas, img);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [gradcam.heatmapUrl]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key.toLowerCase() === "o") setOverlay((v) => !v);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-viewer-border bg-viewer text-viewer-foreground",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-viewer-border bg-viewer-panel px-3 py-2">
        <label className="flex items-center gap-2 text-xs text-viewer-muted">
          <Switch tone="dark" checked={overlay} onCheckedChange={setOverlay} aria-label="Mostrar mapa de atenção" />
          <span className={overlay ? "text-white" : undefined}>Mapa de atenção</span>
        </label>
        <div className="flex min-w-36 flex-1 items-center gap-2 sm:max-w-60">
          {overlay ? <Eye className="size-3.5 text-viewer-muted" /> : <EyeOff className="size-3.5 text-viewer-muted" />}
          <Slider
            tone="dark"
            value={[opacity]}
            onValueChange={([v]) => setOpacity(v ?? 60)}
            min={0}
            max={100}
            step={5}
            disabled={!overlay}
            aria-label="Opacidade do mapa de atenção"
          />
          <span className="w-8 text-right font-mono text-[11px] text-viewer-muted">{opacity}%</span>
        </div>
      </div>

      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Corte axial com mapa de atenção. Tecla O mostra ou oculta o mapa."
        className="relative flex flex-1 items-center justify-center p-3 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <div className="relative aspect-square w-full max-w-[560px]">
          <img
            src={gradcam.sliceUrl}
            alt="Corte axial da RM no nível dos ventrículos laterais"
            className="absolute inset-0 size-full"
            onError={() => setState("error")}
          />
          <canvas
            ref={heatRef}
            className="absolute inset-0 size-full transition-opacity duration-200"
            style={{ opacity: overlay && state === "ready" ? opacity / 100 : 0 }}
            aria-hidden
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
            {overlay && (
              <div className="absolute bottom-0 right-0 flex items-center gap-1.5">
                <span>menor</span>
                <span className="h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,#00f,#0ff,#0f0,#ff0,#f00)]" />
                <span>maior</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-viewer-border bg-viewer-panel px-3 py-1.5 text-[11px] text-viewer-muted">
        <span>
          <GlossaryTerm id="mapa-atencao">Grad-CAM</GlossaryTerm> · classe {CLASS_INFO[gradcam.explainedClass].short}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>O</Kbd> mostrar/ocultar
        </span>
      </div>
    </div>
  );
}
