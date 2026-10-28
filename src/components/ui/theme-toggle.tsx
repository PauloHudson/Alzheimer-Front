import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/store/theme";
import { cn } from "@/lib/utils";

/** Alterna entre tema claro e noturno; a escolha fica salva no navegador. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Ativar tema claro" : "Ativar modo noturno"}
      title={dark ? "Tema claro" : "Modo noturno"}
      className={cn(
        "relative inline-flex size-9 items-center justify-center overflow-hidden rounded-full border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute size-4 transition-all duration-500",
          dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute size-4 transition-all duration-500",
          dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
      />
    </button>
  );
}
