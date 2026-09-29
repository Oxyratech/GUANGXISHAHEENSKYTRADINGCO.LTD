import { cn } from "@/lib/utils";
import { PALETTE, type GraphicTone } from "./art-palette";

/** Table rows on the front sheet: [first, second, third] cell widths. */
const ROWS: readonly (readonly [number, number, number])[] = [
  [52, 44, 30],
  [64, 36, 36],
  [44, 50, 28],
  [58, 40, 34],
];

export interface DocumentArtProps {
  tone?: GraphicTone;
  className?: string;
}

/**
 * Abstract stack of trade documents: sheets, bars for text, a table and a ring. It carries no
 * words, figures or seals, so it never reads as a real document. Mirrors in RTL so the "text"
 * starts on the reading side. Decorative.
 */
export function DocumentArt({ tone = "navy", className }: DocumentArtProps) {
  const p = PALETTE[tone];

  return (
    <svg viewBox="96 24 288 312" aria-hidden="true" className={cn("rtl-flip block", className)}>
      <g transform="rotate(-9 240 180)">
        <rect
          x={142}
          y={54}
          width={196}
          height={252}
          rx={6}
          strokeWidth={1.25}
          className={cn(p.surface, p.lineSoft)}
        />
        <rect x={162} y={78} width={70} height={5} rx={2.5} className={p.tint} />
        <rect x={162} y={94} width={110} height={5} rx={2.5} className={p.tint} />
      </g>
      <g transform="rotate(5 240 180)">
        <rect
          x={142}
          y={54}
          width={196}
          height={252}
          rx={6}
          strokeWidth={1.25}
          className={cn(p.surface, p.line)}
        />
        <rect x={162} y={78} width={84} height={5} rx={2.5} className={p.tintStrong} />
        <rect x={162} y={94} width={120} height={5} rx={2.5} className={p.tint} />
        <rect x={162} y={110} width={96} height={5} rx={2.5} className={p.tint} />
      </g>

      <path
        d="M148 54H318L338 74V300a6 6 0 0 1-6 6H148a6 6 0 0 1-6-6V60a6 6 0 0 1 6-6Z"
        strokeWidth={1.25}
        strokeLinejoin="round"
        className={cn(p.surface, p.line)}
      />
      <path
        d="M318 54V68a6 6 0 0 0 6 6H338Z"
        strokeWidth={1.25}
        strokeLinejoin="round"
        className={cn(p.tint, p.line)}
      />

      <rect x={162} y={74} width={44} height={6} rx={3} className={p.accentFill} />
      <rect x={162} y={96} width={112} height={8} rx={2} className={p.tintStrong} />
      <rect x={162} y={112} width={76} height={5} rx={2.5} className={p.tint} />
      <path d="M162 132H318" fill="none" strokeWidth={1} className={p.lineSoft} />

      <rect x={162} y={142} width={156} height={14} rx={2} className={p.tint} />
      {ROWS.map(([a, b, c], i) => {
        const y = 168 + i * 18;
        return (
          <g key={i}>
            <rect x={166} y={y} width={a} height={5} rx={2.5} className={p.tintStrong} />
            <rect x={230} y={y} width={b} height={5} rx={2.5} className={p.tint} />
            <rect x={284} y={y} width={c} height={5} rx={2.5} className={p.tint} />
            <path d={`M162 ${y + 12}H318`} fill="none" strokeWidth={1} className={p.lineSoft} />
          </g>
        );
      })}

      <rect x={162} y={246} width={44} height={5} rx={2.5} className={p.tintStrong} />
      <rect x={262} y={243} width={56} height={9} rx={2} className={p.accentFill} />

      <path
        d="M162 284H226"
        fill="none"
        strokeWidth={1.25}
        strokeLinecap="round"
        className={p.line}
      />
      <circle cx={296} cy={278} r={15} fill="none" strokeWidth={1.25} className={p.accentStroke} />
      <circle
        cx={296}
        cy={278}
        r={9}
        fill="none"
        strokeWidth={1}
        opacity={0.6}
        className={p.accentStroke}
      />
    </svg>
  );
}
