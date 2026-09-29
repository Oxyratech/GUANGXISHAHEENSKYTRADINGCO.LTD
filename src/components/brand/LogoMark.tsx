import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { MARK_HORIZON, MARK_VIEWBOX, MARK_WING_PATH } from "./brand-geometry";
import { LOGO_TONE_CLASSES, type LogoTone } from "./tones";

export type LogoMarkProps = Omit<ComponentProps<"svg">, "viewBox" | "children"> & {
  tone?: LogoTone;
  /** Accessible name. Leave it out when the mark sits next to the wordmark: it is then decorative. */
  title?: string;
};

/**
 * The Shaheen Sky mark: a swept wing rising over a gold horizon. The wing uses currentColor (set by
 * `tone`); only the horizon is gold. Size it with a class such as `size-10`. Never mirrored in RTL.
 */
export function LogoMark({ tone = "onLight", title, className, ...props }: LogoMarkProps) {
  const classes = LOGO_TONE_CLASSES[tone];
  return (
    <svg
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      fill="currentColor"
      focusable="false"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", classes.mark, className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={MARK_WING_PATH} />
      <rect {...MARK_HORIZON} className={classes.accent} />
    </svg>
  );
}
