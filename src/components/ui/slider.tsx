import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  tone?: "light" | "dark";
}

export const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, tone = "light", ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-1.5",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-4 data-[orientation=vertical]:flex-col data-[orientation=vertical]:justify-center data-[orientation=vertical]:py-0",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative h-1.5 w-full grow overflow-hidden rounded-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
          tone === "dark" ? "bg-viewer-border" : "bg-muted",
        )}
      >
        <SliderPrimitive.Range
          className={cn(
            "absolute h-full data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-full",
            tone === "dark" ? "bg-sky-400" : "bg-primary",
          )}
        />
      </SliderPrimitive.Track>
      {(props.value ?? props.defaultValue ?? [0]).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={props["aria-label"]}
          className={cn(
            "block size-4 rounded-full border-2 bg-white shadow transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2",
            tone === "dark" ? "border-sky-400 focus-visible:outline-sky-400" : "border-primary focus-visible:outline-ring",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = "Slider";
