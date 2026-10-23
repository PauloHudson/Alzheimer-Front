import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
      <path
        d="M9 22V10l7 7 7-7v12"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="17" r="2.2" fill="#5eead4" />
    </svg>
  );
}

export function Logo({
  to = "/",
  tone = "dark",
  className,
}: {
  to?: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)} aria-label="M-XAI — página inicial">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={cn("text-base font-bold tracking-tight", tone === "light" ? "text-white" : "text-foreground")}>
          M-XAI
        </span>
        <span className={cn("text-[10px] font-medium", tone === "light" ? "text-white/60" : "text-muted-foreground")}>
          Alzheimer explicável
        </span>
      </span>
    </Link>
  );
}
