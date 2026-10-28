import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowcasePrediction as Prediction } from "./showcase/types";
import { cn, clamp } from "@/lib/utils";
import { CLASS_INFO, CONFIDENCE_INFO } from "@/lib/domain";
import { MRI_SIZE, renderHeatmap, renderSlice } from "./showcase/renderMri";

/**
 * Narrativa guiada pela rolagem: a RM fica fixa enquanto o texto passa, e a rolagem
 * percorre os cortes coronais, acende o mapa de atenção, mostra o peso de cada modalidade
 * e, por fim, a sugestão e a decisão. É a explicação em camadas contada em sequência.
 */

const SLICE_FROM = 6;
const SLICE_TO = 21; // corte que passa pelos hipocampos

const STEPS = [
  {
    title: "A ressonância",
    text: "O sistema extrai do exame T1 o corte que o modelo analisa.",
  },
  {
    title: "Onde o modelo olhou",
    text: "O mapa de atenção destaca as áreas que mais pesaram.",
  },
  {
    title: "Imagem e clínica juntas",
    text: "Você vê quanto veio da imagem e quanto dos dados clínicos.",
  },
  {
    title: "Quanto confiar",
    text: "Probabilidade de cada classe, sempre com uma faixa de confiança.",
  },
  {
    title: "A decisão é sua",
    text: "Concorde ou discorde, com justificativa registrada.",
  },
];

const ease = (t: number) => 1 - (1 - t) ** 3;
const ramp = (p: number, from: number, to: number) => ease(clamp((p - from) / (to - from), 0, 1));

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const onChange = () => setNarrow(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export function ScanStory({
  prediction,
  share,
}: {
  prediction: Prediction;
  /** Fração da atribuição vinda da imagem e dos dados clínicos. */
  share: { image: number; tabular: number };
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const heatRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const narrow = useNarrow();

  // progresso 0–1 da seção, atualizado no máximo uma vez por quadro
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      setProgress(total > 0 ? clamp(-rect.top / total, 0, 1) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // pré-renderiza os cortes em segundo plano para a rolagem não engasgar
  useEffect(() => {
    let i = SLICE_FROM;
    let handle = 0;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 16));
    const work = () => {
      renderSlice("coronal", i, 0.45);
      i += 1;
      if (i <= SLICE_TO) handle = idle(work) as number;
    };
    handle = idle(work) as number;
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(handle);
  }, []);

  const step = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
  const slice = Math.round(SLICE_FROM + (SLICE_TO - SLICE_FROM) * ramp(progress, 0, 0.17));
  const heat = ramp(progress, 0.2, 0.32);
  const decision = ramp(progress, 0.82, 0.9);
  // em telas estreitas não há espaço para empilhar camadas: cada uma substitui a anterior
  const summary = ramp(progress, 0.62, 0.72) * (narrow ? 1 - decision : 1);
  const modality = ramp(progress, 0.42, 0.52) * (narrow ? 1 - ramp(progress, 0.6, 0.66) : 1);

  useEffect(() => {
    baseRef.current?.getContext("2d")?.putImageData(renderSlice("coronal", slice, 0.45), 0, 0);
  }, [slice]);

  const heatImage = useMemo(() => renderHeatmap(prediction.regions, "coronal", SLICE_TO), [prediction.regions]);
  useEffect(() => {
    heatRef.current?.getContext("2d")?.putImageData(heatImage, 0, 0);
  }, [heatImage]);

  const suggested = CLASS_INFO[prediction.suggested];

  return (
    <div ref={sectionRef} className="relative" style={{ height: `${STEPS.length * 85 + 40}vh` }}>
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-6 overflow-hidden py-6 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 lg:py-10">
        {/* ------------------------------------------------ imagem */}
        <div className="relative mx-auto aspect-square w-full max-w-[min(100%,46vh)] lg:max-w-[min(100%,74vh)]">
          <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-black ring-1 ring-white/10">
            <canvas ref={baseRef} width={MRI_SIZE} height={MRI_SIZE} className="absolute inset-0 size-full" />
            <canvas
              ref={heatRef}
              width={128}
              height={128}
              aria-hidden
              className="absolute inset-0 size-full"
              style={{ opacity: heat * 0.62 }}
            />
            <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-between font-mono text-[10px] text-white/55 sm:text-[11px]">
              <span>
                PAC-0417 · T1 3D · CORONAL
                <br />
                CORTE {String(slice + 1).padStart(2, "0")}/48
              </span>
            </div>
            <span className="absolute left-4 top-1/2 font-mono text-xs text-white/60">D</span>
            <span className="absolute right-4 top-1/2 font-mono text-xs text-white/60">E</span>
          </div>

          {/* peso de cada modalidade */}
          <div
            className="absolute left-3 top-[12%] w-52 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl sm:left-5 sm:w-60"
            style={{ opacity: modality, transform: `translateX(${(modality - 1) * 16}px)` }}
            aria-hidden={modality < 0.5}
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">De onde veio a sugestão</p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
              <span className="bg-[#2f4ac0]" style={{ width: `${share.image * 100 * modality}%` }} />
              <span className="bg-[#0d9488]" style={{ width: `${share.tabular * 100 * modality}%` }} />
            </div>
            <div className="mt-2.5 flex justify-between font-mono text-[11px]">
              <span>
                <span className="text-slate-500">Imagem </span>
                {Math.round(share.image * 100)}%
              </span>
              <span>
                <span className="text-slate-500">Clínica </span>
                {Math.round(share.tabular * 100)}%
              </span>
            </div>
          </div>

          {/* sugestão */}
          <div
            className="absolute -bottom-3 left-3 w-56 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl sm:left-6 sm:w-64"
            style={{ opacity: summary, transform: `translateY(${(1 - summary) * 16}px) scale(${0.97 + summary * 0.03})` }}
            aria-hidden={summary < 0.5}
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Sugestão do modelo</p>
            <p className="mt-1 font-semibold leading-tight" style={{ color: suggested.color }}>
              {suggested.label}
            </p>
            <div className="mt-3 space-y-1.5">
              {(["CN", "AD"] as const).map((k) => (
                <div key={k} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="w-7 text-slate-500">{CLASS_INFO[k].short}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${prediction.probabilities[k] * 100 * summary}%`,
                        backgroundColor: CLASS_INFO[k].color,
                      }}
                    />
                  </span>
                  <span className="w-8 text-right tabular-nums">{Math.round(prediction.probabilities[k] * 100)}%</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600">{CONFIDENCE_INFO[prediction.confidence].label}</p>
          </div>

          {/* decisão */}
          <div
            className="absolute -right-2 top-[5%] flex w-48 flex-col gap-1.5 rounded-2xl bg-white p-3 text-sm text-slate-900 shadow-2xl sm:-right-6 sm:w-56"
            style={{ opacity: decision, transform: `translateX(${(1 - decision) * 16}px)` }}
            aria-hidden={decision < 0.5}
          >
            <p className="px-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Sua decisão</p>
            {["Concordo", "Concordo parcialmente", "Discordo"].map((option, i) => (
              <span
                key={option}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs",
                  i === 1 ? "border-[#2f4ac0] bg-[#e8ecfb] font-medium text-[#2f4ac0]" : "border-slate-200 text-slate-600",
                )}
              >
                {option}
              </span>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------ texto */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-8 lg:mx-0">
          <ol className="relative lg:h-80">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                style={{ "--shift": `${(i - step) * 28}px` } as React.CSSProperties}
                className={cn(
                  "transition-[opacity,transform] duration-500 ease-out",
                  "lg:absolute lg:inset-x-0 lg:top-1/2 lg:[transform:translateY(calc(-50%_+_var(--shift)))]",
                  i === step ? "opacity-100" : "hidden opacity-0 lg:pointer-events-none lg:block",
                )}
                aria-current={i === step ? "step" : undefined}
              >
                <p className="font-mono text-xs tracking-wider text-teal-300">
                  {String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                </p>
                <h3 className="mt-3 font-display text-4xl leading-[1.05] text-white sm:text-5xl">{s.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === step ? "w-8 bg-teal-300" : i < step ? "w-3 bg-teal-300/50" : "w-3 bg-white/20",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
