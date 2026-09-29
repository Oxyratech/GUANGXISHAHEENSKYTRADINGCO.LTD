"use client";

/*
 * Supplementary hint on hover and keyboard focus. Never put essential information in a tooltip:
 * touch users cannot reach it. The child must be a focusable element that accepts a ref.
 *
 *   <Tooltip content="Opens in a new tab"><a href="…">Docs</a></Tooltip>
 */
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import "./ui-motion.css";

type ContentProps = ComponentProps<typeof TooltipPrimitive.Content>;

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 300,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: ContentProps["side"];
  align?: ContentProps["align"];
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            collisionPadding={12}
            className="ui-pop z-50 max-w-xs rounded-md bg-navy-900 px-2.5 py-1.5 text-caption text-white shadow-raised"
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
