import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  /** Explicação do campo, exibida ao passar o mouse no rótulo ou focar o ícone. */
  info?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Agrupa rótulo, controle, dica e mensagem de erro com ids acessíveis. */
export function Field({ label, htmlFor, error, hint, info, required, className, children }: FieldProps) {
  const labelElement = (
    <Label htmlFor={htmlFor}>
      {label}
      {required && (
        <span className="ml-0.5 text-destructive" aria-hidden>
          *
        </span>
      )}
    </Label>
  );
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {info ? (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <span className="inline-flex w-fit cursor-help items-center gap-1.5">
              {labelElement}
              <button
                type="button"
                data-field-info
                aria-label={`${label}: ${info}`}
                className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Info className="size-3.5" aria-hidden />
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="w-72 max-w-none border bg-card p-3 text-foreground dark:bg-card">{info}</TooltipContent>
        </Tooltip>
      ) : (
        labelElement
      )}
      {children}
      {error ? (
        <p role="alert" id={htmlFor ? `${htmlFor}-error` : undefined} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
