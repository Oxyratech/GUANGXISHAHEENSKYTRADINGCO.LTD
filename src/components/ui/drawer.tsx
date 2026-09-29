"use client";

/*
 * Side or bottom sheet built on the same dialog frame as Modal. `side` is logical: "start" is the
 * left edge in LTR and the right edge in RTL, and the slide animation mirrors with it. Use it for
 * mobile navigation and filters. Same accessibility contract as Modal (title, description, close).
 */
import { DialogShell, type DialogShellProps } from "./dialog-shell";

const SIDES = {
  start: "inset-y-0 start-0 w-[min(24rem,calc(100vw-3rem))] border-e border-line",
  end: "inset-y-0 end-0 w-[min(24rem,calc(100vw-3rem))] border-s border-line",
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg border-t border-line",
} as const;

export type DrawerSide = keyof typeof SIDES;
export type DrawerProps = DialogShellProps & { side?: DrawerSide };

export function Drawer({ side = "end", ...props }: DrawerProps) {
  return <DialogShell {...props} side={side} contentClassName={SIDES[side]} />;
}
