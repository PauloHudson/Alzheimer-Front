/**
 * Leva o foco e a rolagem ao primeiro erro de validação na ordem visual do formulário.
 * O foco automático do react-hook-form segue a ordem de registro dos campos, que nem sempre
 * coincide com a ordem da tela quando há campos controlados (Controller).
 */
export function focusFirstError(container: HTMLElement | null) {
  requestAnimationFrame(() => {
    const alert = container?.querySelector<HTMLElement>('[role="alert"]');
    if (!alert) return;
    const target =
      alert.parentElement?.querySelector<HTMLElement>(
        '[aria-invalid="true"], button[role="radio"], button[role="checkbox"], input, textarea, select, button',
      ) ?? null;
    target?.focus({ preventScroll: true });
    alert.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
