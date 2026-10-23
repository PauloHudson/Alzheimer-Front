import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Rolagem com inércia (no estilo das páginas de produto da Apple) para páginas de vitrine.
 * Desligada para quem pede movimento reduzido. Links âncora (#secao) também deslizam,
 * descontando a altura do cabeçalho fixo.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 0.9,
      anchors: { offset: -72 },
    });
    return () => lenis.destroy();
  }, [enabled]);
}
