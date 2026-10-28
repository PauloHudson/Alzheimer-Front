import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------ Switch

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & { tone?: "light" | "dark" }
>(({ className, tone = "light", ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      tone === "dark"
        ? "bg-viewer-border data-[state=checked]:bg-sky-500 focus-visible:outline-sky-400"
        : "bg-input data-[state=checked]:bg-primary focus-visible:outline-ring",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

// ------------------------------------------------------------------ Checkbox

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer size-4 shrink-0 rounded-[4px] border border-input bg-card shadow-xs transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="size-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

// ------------------------------------------------------------------ RadioGroup

export const RadioGroup = RadioGroupPrimitive.Root;

export const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "flex w-full items-start gap-3 rounded-lg border border-input bg-card p-3 text-left text-sm transition-colors",
      "hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft/60 data-[state=checked]:ring-1 data-[state=checked]:ring-primary",
      className,
    )}
    {...props}
  >
    {children}
  </RadioGroupPrimitive.Item>
));
RadioCard.displayName = "RadioCard";

// ------------------------------------------------------------------ Avatar

export function Avatar({ name, className }: { name: string; className?: string }) {
  const letters = name
    .replace(/^(Dra?\.)\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-semibold text-primary",
        className,
      )}
    >
      <AvatarPrimitive.Fallback>{letters}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

// ------------------------------------------------------------------ Skeleton

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse-soft rounded-md bg-muted", className)} {...props} />;
}

// ------------------------------------------------------------------ Kbd

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
