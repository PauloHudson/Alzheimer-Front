import { useEffect, useRef } from "react";

const EVENTS = ["mousemove", "keydown", "mousedown", "touchstart", "wheel"] as const;

/**
 * Encerra a sessão após um período sem interação — estações clínicas são compartilhadas
 * (Entrega 1, item 5.3). Avisa antes de expirar para o usuário não perder o que está fazendo.
 */
export function useIdleLogout({
  timeoutMs,
  warnBeforeMs,
  onWarn,
  onTimeout,
}: {
  timeoutMs: number;
  warnBeforeMs: number;
  onWarn: () => void;
  onTimeout: () => void;
}) {
  const handlers = useRef({ onWarn, onTimeout });
  handlers.current = { onWarn, onTimeout };

  useEffect(() => {
    let warnTimer: number;
    let logoutTimer: number;
    let lastReset = 0;

    const reset = () => {
      const now = Date.now();
      if (now - lastReset < 1_000) return;
      lastReset = now;
      window.clearTimeout(warnTimer);
      window.clearTimeout(logoutTimer);
      warnTimer = window.setTimeout(() => handlers.current.onWarn(), timeoutMs - warnBeforeMs);
      logoutTimer = window.setTimeout(() => handlers.current.onTimeout(), timeoutMs);
    };

    reset();
    EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(warnTimer);
      window.clearTimeout(logoutTimer);
      EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [timeoutMs, warnBeforeMs]);
}
