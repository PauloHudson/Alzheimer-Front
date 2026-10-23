import { useEffect, type RefObject } from "react";

const HEADER_HEIGHT = 64;
/** Fração da altura da tela em que o efeito começa (base do bloco passando deste ponto). */
const START = 0.55;
const MAX_BLUR = 10;

/**
 * Blocos marcados com `data-recede` desfocam, esmaecem e recuam levemente conforme saem
 * pelo topo da tela, dando profundidade à rolagem. O estilo é aplicado direto no DOM, uma vez
 * por quadro, sem re-renderizar o React. Desligado para quem pede movimento reduzido.
 */
export function useRecedeOnScroll(container: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = container.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-recede]"));
    let frame = 0;

    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const start = vh * START;
      for (const el of items) {
        const bottom = el.getBoundingClientRect().bottom;
        const progress = Math.min(1, Math.max(0, (start - bottom) / (start - HEADER_HEIGHT)));
        // fora da tela (acima) ou ainda não atingido: sem filtro, para não gastar GPU
        if (progress <= 0 || bottom < 0) {
          // sem filtro/transform em repouso: não interfere em elementos sticky nem no texto nítido
          if (el.style.filter) {
            el.style.filter = "";
            el.style.opacity = "";
            el.style.transform = "";
          }
          continue;
        }
        const eased = progress * progress * (3 - 2 * progress);
        el.style.filter = `blur(${(eased * MAX_BLUR).toFixed(2)}px)`;
        el.style.opacity = String(1 - eased * 0.55);
        el.style.transform = `translate3d(0, ${(eased * -18).toFixed(1)}px, 0) scale(${1 - eased * 0.035})`;
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    items.forEach((el) => {
      el.style.willChange = "filter, opacity, transform";
      el.style.transformOrigin = "50% 100%";
    });
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      items.forEach((el) => {
        el.style.filter = "";
        el.style.opacity = "";
        el.style.transform = "";
        el.style.willChange = "";
      });
    };
  }, [container]);
}
