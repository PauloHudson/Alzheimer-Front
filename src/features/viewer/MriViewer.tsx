import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Contrast,
  Eye,
  EyeOff,
  Info,
  Keyboard,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sun,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { AttentionRegion, Plane } from "@/types";
import { cn, clamp } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/misc";
import { Hint } from "@/components/ui/tooltip";
import { DEFAULT_SLICE, PLANE_LABEL } from "./anatomy";
import {
  MRI_SIZE,
  SLICE_COUNT,
  regionVisibility,
  renderHeatmap,
  renderSlice,
  tToSlice,
} from "./renderMri";

interface MriViewerProps {
  regions: AttentionRegion[];
  atrophy: number;
  patientCode?: string;
  focusRegionId?: string | null;
  onFocusRegion?: (id: string | null) => void;
  /** Versão reduzida, sem barra de ferramentas completa (landing page). */
  compact?: boolean;
  className?: string;
}

const PLANES: Plane[] = ["coronal", "axial", "sagittal"];

/** Extremidades do eixo de cortes (topo, base do controle) por plano. */
const SLICE_ENDS: Record<Plane, [string, string]> = {
  axial: ["S", "I"],
  coronal: ["A", "P"],
  sagittal: ["D", "E"],
};

export function MriViewer({
  regions,
  atrophy,
  patientCode,
  focusRegionId = null,
  onFocusRegion,
  compact = false,
  className,
}: MriViewerProps) {
  const [plane, setPlane] = useState<Plane>("coronal");
  const [slice, setSlice] = useState(() => tToSlice(DEFAULT_SLICE.coronal));
  const [overlay, setOverlay] = useState(true);
  const [opacity, setOpacity] = useState(60);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(110);
  const [showAdjust, setShowAdjust] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const baseRef = useRef<HTMLCanvasElement>(null);
  const heatRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // ----------------------------------------------------------- renderização
  useEffect(() => {
    const ctx = baseRef.current?.getContext("2d");
    if (ctx) ctx.putImageData(renderSlice(plane, slice, atrophy), 0, 0);
  }, [plane, slice, atrophy]);

  useEffect(() => {
    const ctx = heatRef.current?.getContext("2d");
    if (ctx) ctx.putImageData(renderHeatmap(regions, plane, slice, focusRegionId), 0, 0);
  }, [regions, plane, slice, focusRegionId]);

  // Ao focar uma região (lista ao lado), leva o corte até ela.
  useEffect(() => {
    if (!focusRegionId) return;
    const region = regions.find((r) => r.id === focusRegionId);
    if (!region) return;
    const targetPlane = region.anchors[plane] ? plane : (PLANES.find((p) => region.anchors[p]) ?? plane);
    const anchor = region.anchors[targetPlane]!;
    setPlane(targetPlane);
    setSlice(tToSlice((anchor.slice[0] + anchor.slice[1]) / 2));
  }, [focusRegionId]);

  const visibleRegions = useMemo(
    () =>
      regions
        .map((r) => ({ region: r, vis: regionVisibility(r, plane, slice), anchor: r.anchors[plane] }))
        .filter((x) => x.vis > 0.5 && x.anchor),
    [regions, plane, slice],
  );

  // ----------------------------------------------------------- interação
  const changePlane = (next: Plane) => {
    setPlane(next);
    setSlice(tToSlice(DEFAULT_SLICE[next]));
  };

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(110);
    setOpacity(60);
    setOverlay(true);
  }, []);

  const stepSlice = (delta: number) => setSlice((s) => clamp(s + delta, 0, SLICE_COUNT - 1));
  const stepZoom = (delta: number) =>
    setZoom((z) => {
      const next = clamp(Math.round((z + delta) * 4) / 4, 1, 4);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });

  // A roda do mouse troca o corte (convenção PACS/OHIF); Ctrl + roda aplica zoom.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) stepZoom(event.deltaY < 0 ? 0.25 : -0.25);
      else stepSlice(event.deltaY > 0 ? 1 : -1);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowUp: () => stepSlice(1),
      ArrowRight: () => stepSlice(1),
      ArrowDown: () => stepSlice(-1),
      ArrowLeft: () => stepSlice(-1),
      "+": () => stepZoom(0.25),
      "=": () => stepZoom(0.25),
      "-": () => stepZoom(-0.25),
      o: () => setOverlay((v) => !v),
      r: reset,
      "1": () => changePlane("coronal"),
      "2": () => changePlane("axial"),
      "3": () => changePlane("sagittal"),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (zoom <= 1) return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current || !stageRef.current) return;
    const size = stageRef.current.clientWidth;
    const limit = ((zoom - 1) / 2) * 100;
    setPan({
      x: clamp(drag.current.px + ((event.clientX - drag.current.x) / size) * 100, -limit, limit),
      y: clamp(drag.current.py + ((event.clientY - drag.current.y) / size) * 100, -limit, limit),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const lateralLabels = plane === "sagittal" ? ["A", "P"] : ["D", "E"];

  // ----------------------------------------------------------- render
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-viewer-border bg-viewer text-viewer-foreground",
        expanded && "fixed inset-3 z-40 shadow-elevated",
        className,
      )}
    >
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 border-b border-viewer-border bg-viewer-panel px-3 py-2">
          <div role="tablist" aria-label="Plano de visualização" className="flex rounded-md bg-viewer p-0.5">
            {PLANES.map((p, i) => (
              <button
                key={p}
                role="tab"
                aria-selected={plane === p}
                onClick={() => changePlane(p)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  plane === p ? "bg-viewer-border text-white" : "text-viewer-muted hover:text-white",
                )}
              >
                {PLANE_LABEL[p]}
                <span className="sr-only"> (tecla {i + 1})</span>
              </button>
            ))}
          </div>

          <div className="mx-1 h-5 w-px bg-viewer-border" aria-hidden />

          <label className="flex items-center gap-2 text-xs text-viewer-muted">
            <Switch tone="dark" checked={overlay} onCheckedChange={setOverlay} aria-label="Mostrar mapa de atenção" />
            <span className={overlay ? "text-white" : undefined}>Mapa de atenção</span>
          </label>

          <div className="flex min-w-36 flex-1 items-center gap-2 sm:max-w-52">
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

          <div className="ml-auto flex items-center gap-1">
            <ToolbarButton label="Ajustar brilho e contraste" onClick={() => setShowAdjust((v) => !v)} active={showAdjust}>
              <Contrast />
            </ToolbarButton>
            <ToolbarButton label="Diminuir zoom (−)" onClick={() => stepZoom(-0.25)} disabled={zoom <= 1}>
              <ZoomOut />
            </ToolbarButton>
            <ToolbarButton label="Aumentar zoom (+)" onClick={() => stepZoom(0.25)} disabled={zoom >= 4}>
              <ZoomIn />
            </ToolbarButton>
            <ToolbarButton label="Restaurar visualização (R)" onClick={reset}>
              <RotateCcw />
            </ToolbarButton>
            <ToolbarButton label={expanded ? "Sair da tela cheia" : "Tela cheia"} onClick={() => setExpanded((v) => !v)}>
              {expanded ? <Minimize2 /> : <Maximize2 />}
            </ToolbarButton>
          </div>

          {showAdjust && (
            <div className="grid w-full gap-3 border-t border-viewer-border pt-2 sm:grid-cols-2">
              <AdjustSlider icon={<Sun className="size-3.5" />} label="Brilho" value={brightness} onChange={setBrightness} min={50} max={160} />
              <AdjustSlider icon={<Contrast className="size-3.5" />} label="Contraste" value={contrast} onChange={setContrast} min={60} max={200} />
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center p-2">
        <div
          ref={stageRef}
          tabIndex={0}
          role="img"
          aria-label={`Ressonância magnética, plano ${PLANE_LABEL[plane]}, corte ${slice + 1} de ${SLICE_COUNT}. Use as setas para trocar o corte.`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={reset}
          className={cn(
            "relative aspect-square w-full max-w-[min(100%,70vh)] overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
            zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-ns-resize",
            expanded && "max-w-[min(100%,calc(100vh-9rem))]",
          )}
        >
          <div
            className="absolute inset-0 transition-transform duration-100"
            style={{ transform: `translate(${pan.x}%, ${pan.y}%) scale(${zoom})` }}
          >
            <canvas
              ref={baseRef}
              width={MRI_SIZE}
              height={MRI_SIZE}
              className="absolute inset-0 size-full"
              style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
            />
            <canvas
              ref={heatRef}
              width={128}
              height={128}
              aria-hidden
              className="absolute inset-0 size-full transition-opacity duration-200"
              style={{ opacity: overlay ? opacity / 100 : 0 }}
            />
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
              {visibleRegions.map(({ region, anchor }) => {
                const focused = region.id === focusRegionId;
                if (!focused && (compact || !overlay)) return null;
                return (
                  <g key={region.id}>
                    <circle
                      cx={anchor!.x * 100}
                      cy={anchor!.y * 100}
                      r={region.radius * 100 * 1.35}
                      fill="none"
                      stroke={focused ? "#facc15" : "rgba(255,255,255,0.35)"}
                      strokeWidth={focused ? 0.6 : 0.3}
                      strokeDasharray={focused ? "none" : "1.2 1.2"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* rótulos fixos (não escalam com o zoom), no estilo dos visualizadores DICOM */}
          <div className="pointer-events-none absolute inset-0 font-mono text-[10px] leading-tight text-viewer-muted sm:text-[11px]">
            <div className="absolute left-2 top-2 space-y-0.5">
              {patientCode && <p className="text-viewer-foreground">{patientCode}</p>}
              <p>T1 3D · {PLANE_LABEL[plane]}</p>
              <p>
                Corte {slice + 1}/{SLICE_COUNT}
              </p>
            </div>
            <div className="absolute right-2 top-2 text-right">
              <p className="rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-300">Imagem sintética · demonstração</p>
            </div>
            <div className="absolute bottom-2 left-2 space-y-0.5">
              <p>Zoom {zoom.toFixed(2)}×</p>
              <p>
                B {brightness}% · C {contrast}%
              </p>
            </div>
            {overlay && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                <span>baixa</span>
                <span className="h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,#00f,#0ff,#0f0,#ff0,#f00)]" />
                <span>alta</span>
              </div>
            )}
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-viewer-foreground/80">
              {lateralLabels[0]}
            </span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-viewer-foreground/80">
              {lateralLabels[1]}
            </span>
          </div>

          {focusRegionId && (
            <FocusLabel
              region={regions.find((r) => r.id === focusRegionId)}
              plane={plane}
              slice={slice}
              onClear={onFocusRegion ? () => onFocusRegion(null) : undefined}
            />
          )}
        </div>

        {!compact && (
          <div className="ml-2 hidden flex-col items-center gap-2 self-stretch py-10 sm:flex">
            <span className="font-mono text-[10px] text-viewer-muted">{SLICE_ENDS[plane][0]}</span>
            <Slider
              tone="dark"
              orientation="vertical"
              value={[slice]}
              onValueChange={([v]) => setSlice(v ?? 0)}
              min={0}
              max={SLICE_COUNT - 1}
              step={1}
              aria-label="Corte"
              className="min-h-32 flex-1"
            />
            <span className="font-mono text-[10px] text-viewer-muted">{SLICE_ENDS[plane][1]}</span>
          </div>
        )}
      </div>

      {!compact && (
        <div className="flex items-center justify-between gap-3 border-t border-viewer-border bg-viewer-panel px-3 py-1.5 text-[11px] text-viewer-muted">
          <span className="flex items-center gap-1.5">
            <Info className="size-3.5" />
            Cores quentes indicam onde o modelo mais se apoiou — não indicam lesão.
          </span>
          <Hint
            side="top"
            content={
              <span className="block space-y-0.5">
                <span className="block">Roda do mouse / ↑ ↓ — trocar corte</span>
                <span className="block">Ctrl + roda / + − — zoom</span>
                <span className="block">Arrastar (com zoom) — mover</span>
                <span className="block">O — mostrar/ocultar mapa · R — restaurar</span>
                <span className="block">1 2 3 — coronal, axial, sagital</span>
              </span>
            }
          >
            <button className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-viewer-border hover:text-white">
              <Keyboard className="size-3.5" /> Atalhos
            </button>
          </Hint>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  children,
  onClick,
  disabled,
  active,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Hint content={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex size-8 items-center justify-center rounded-md text-viewer-muted transition-colors hover:bg-viewer-border hover:text-white disabled:opacity-40 [&_svg]:size-4",
          active && "bg-viewer-border text-white",
        )}
      >
        {children}
      </button>
    </Hint>
  );
}

function AdjustSlider({
  icon,
  label,
  value,
  onChange,
  min,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-viewer-muted">
      {icon}
      <span className="w-16">{label}</span>
      <Slider tone="dark" value={[value]} onValueChange={([v]) => onChange(v ?? value)} min={min} max={max} step={5} aria-label={label} />
      <span className="w-10 text-right font-mono text-[11px]">{value}%</span>
    </div>
  );
}

function FocusLabel({
  region,
  plane,
  slice,
  onClear,
}: {
  region?: AttentionRegion;
  plane: Plane;
  slice: number;
  onClear?: () => void;
}) {
  if (!region) return null;
  const visible = regionVisibility(region, plane, slice) > 0.5;
  return (
    <div className="absolute inset-x-2 bottom-9 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur">
        <span className="size-2 rounded-full bg-yellow-400" />
        {region.label}
        {!visible && <span className="text-viewer-muted">· fora deste corte</span>}
        {onClear && (
          <button onClick={onClear} className="ml-1 text-viewer-muted hover:text-white" aria-label="Limpar destaque">
            ×
          </button>
        )}
      </div>
    </div>
  );
}
