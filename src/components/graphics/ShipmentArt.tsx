import { cn } from "@/lib/utils";
import { PALETTE, type GraphicTone } from "./art-palette";

const WIDTH = 480;
const HORIZON = 238;
const BOX_W = 52;
const BOX_H = 26;
const GAP = 3;

type Role = "deep" | "tintStrong" | "tint" | "surface" | "accentFill";

/** Container stacks, listed bottom to top. Gold appears exactly once. */
const STACKS: readonly (readonly Role[])[] = [
  ["deep", "tint"],
  ["tintStrong", "surface", "deep", "tint"],
  ["deep", "tint", "tintStrong"],
  ["surface", "deep", "tint", "accentFill", "tintStrong"],
  ["tintStrong", "deep", "surface"],
  ["tint", "deep"],
];

const STACK_X = (WIDTH - (STACKS.length * BOX_W + (STACKS.length - 1) * GAP)) / 2;

const SPAN_START = 24;
const SPAN_END = WIDTH - 24;

/** Sine-like wave over the horizon's span; `half` (a divisor of the span) is half a wavelength. */
function wave(y: number, amplitude: number, half: number): string {
  const segments = (SPAN_END - SPAN_START) / half - 1;
  return `M${SPAN_START} ${y}q${half / 2} ${-amplitude} ${half} 0${`t${half} 0`.repeat(segments)}`;
}

export interface ShipmentArtProps {
  tone?: GraphicTone;
  className?: string;
}

/**
 * Abstract stacked container blocks over a horizon and waves. Deliberately generic: it depicts no
 * port, yard, vessel or facility owned by the company. Decorative.
 */
export function ShipmentArt({ tone = "navy", className }: ShipmentArtProps) {
  const p = PALETTE[tone];

  return (
    <svg viewBox="0 0 480 360" aria-hidden="true" className={cn("block", className)}>
      <circle cx={318} cy={148} r={92} className={p.tint} />

      {STACKS.map((stack, s) => {
        const x = STACK_X + s * (BOX_W + GAP);
        return stack.map((role, level) => {
          const y = HORIZON - (level + 1) * BOX_H - level * GAP;
          return (
            <g key={`${s}-${level}`}>
              <rect
                x={x}
                y={y}
                width={BOX_W}
                height={BOX_H}
                rx={1.5}
                strokeWidth={1}
                className={cn(p[role], role === "accentFill" ? "stroke-none" : p.line)}
              />
              <path
                d={[0.25, 0.5, 0.75].map((f) => `M${x + BOX_W * f} ${y + 4}v${BOX_H - 8}`).join("")}
                fill="none"
                strokeWidth={1}
                strokeLinecap="round"
                className={role === "accentFill" ? "stroke-navy-900/25" : p.lineSoft}
              />
            </g>
          );
        });
      })}

      <path
        d={`M${SPAN_START} ${HORIZON}H${SPAN_END}`}
        fill="none"
        strokeWidth={1.25}
        className={p.line}
      />

      <g fill="none" strokeWidth={1.25} strokeLinecap="round">
        <path d={wave(HORIZON + 20, 4, 18)} className={p.line} />
        <path d={wave(HORIZON + 40, 4, 24)} className={p.lineSoft} />
        <path d={wave(HORIZON + 60, 3, 36)} className={p.lineSoft} opacity={0.6} />
      </g>
    </svg>
  );
}
