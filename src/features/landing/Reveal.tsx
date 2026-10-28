import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Revela o conteúdo (sobe, ganha nitidez e opacidade) quando ele entra na tela.
 * Anima uma única vez. Para quem pede movimento reduzido, aparece direto.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Atraso em ms, para escalonar itens vizinhos. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={cn(
        "transition-[opacity,transform,filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        shown ? "translate-y-0 opacity-100 blur-[0px]" : "translate-y-8 opacity-0 blur-[6px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
