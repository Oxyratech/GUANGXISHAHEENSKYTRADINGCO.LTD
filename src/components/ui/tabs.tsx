"use client";

/*
 * Radix tabs (automatic activation, roving tabindex). Arrow keys follow the reading direction, so
 * they are mirrored in RTL through <DirectionProvider>. Rendered as a segmented control.
 */
import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useUiDirection } from "./direction";

export function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root dir={useUiDirection()} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-label whitespace-nowrap text-ink-muted transition-colors duration-150",
        "hover:text-navy-900",
        "data-[state=active]:bg-white data-[state=active]:text-navy-900 data-[state=active]:shadow-card",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-6", className)} {...props} />;
}
