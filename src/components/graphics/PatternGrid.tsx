import { cn } from "@/lib/utils";
import { PALETTE, type GraphicTone } from "./art-palette";
import { useSvgId } from "./use-svg-id";

const TILE = 24;

export interface PatternGridProps {
  tone?: GraphicTone;
  /** `dots` is the quietest; `grid` reads as engineering paper; `cross` as registration marks. */
  variant?: "dots" | "grid" | "cross";
  className?: string;
}

/**
 * Subtle repeating background. Fills its nearest positioned ancestor (`absolute inset-0`); layer
 * it behind content and lower its `opacity` where it needs to be quieter. Decorative.
 */
export function PatternGrid({ tone = "light", variant = "dots", className }: PatternGridProps) {
  const id = useSvgId();
  const stroke = PALETTE[tone].pattern;
  const mid = TILE / 2;

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 block h-full w-full", className)}
    >
      <defs>
        <pattern id={id} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {variant === "dots" ? (
            <path d={`M${mid} ${mid}h0`} strokeWidth={2} strokeLinecap="round" className={stroke} />
          ) : null}
          {variant === "grid" ? (
            <path d={`M${TILE} 0H0V${TILE}`} fill="none" strokeWidth={1} className={stroke} />
          ) : null}
          {variant === "cross" ? (
            <path
              d={`M${mid} ${mid - 3}v6M${mid - 3} ${mid}h6`}
              fill="none"
              strokeWidth={1}
              className={stroke}
            />
          ) : null}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
