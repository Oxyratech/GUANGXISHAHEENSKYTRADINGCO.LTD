import { cn } from "@/lib/utils";
import { PALETTE, type GraphicTone } from "./art-palette";

type Node = readonly [x: number, y: number];

const HUB: Node = [240, 180];

/** Second ring: squares. Positions sit on a 92-unit ring around the hub. */
const TIER_A: readonly Node[] = [
  [329, 204],
  [264, 269],
  [175, 245],
  [151, 156],
  [216, 91],
  [305, 115],
];

/** Outer ring: circles. */
const TIER_B: readonly Node[] = [
  [420, 150],
  [404, 262],
  [330, 326],
  [198, 328],
  [94, 268],
  [62, 176],
  [110, 72],
  [250, 30],
  [372, 54],
];

/** [tier A index, tier B index] */
const LINKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 3],
  [3, 5],
  [3, 6],
  [4, 7],
  [4, 6],
  [5, 8],
  [5, 0],
];

/** Outer ring neighbours, drawn fainter. */
const RIM: readonly (readonly [number, number])[] = [
  [8, 0],
  [7, 8],
  [6, 5],
  [5, 4],
];

const SATELLITES: readonly Node[] = [
  [36, 116],
  [452, 214],
  [440, 318],
  [30, 302],
  [156, 22],
  [300, 346],
];

const SQUARE = 14;

export interface SourcingArtProps {
  tone?: GraphicTone;
  className?: string;
}

/** Abstract supplier network: a hub, connected nodes and orbit rings. Decorative; depicts no real party. */
export function SourcingArt({ tone = "navy", className }: SourcingArtProps) {
  const p = PALETTE[tone];

  return (
    <svg viewBox="0 0 480 360" aria-hidden="true" className={cn("block", className)}>
      <g fill="none" strokeWidth={1}>
        <circle cx={HUB[0]} cy={HUB[1]} r={46} className={p.lineSoft} />
        <circle cx={HUB[0]} cy={HUB[1]} r={92} className={p.lineSoft} />
        <ellipse cx={HUB[0]} cy={HUB[1]} rx={196} ry={150} className={p.lineSoft} />
      </g>

      <g fill="none" strokeLinecap="round">
        {RIM.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={TIER_B[a]![0]}
            y1={TIER_B[a]![1]}
            x2={TIER_B[b]![0]}
            y2={TIER_B[b]![1]}
            strokeWidth={1}
            className={p.lineSoft}
          />
        ))}
        {LINKS.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={TIER_A[a]![0]}
            y1={TIER_A[a]![1]}
            x2={TIER_B[b]![0]}
            y2={TIER_B[b]![1]}
            strokeWidth={1}
            className={p.line}
          />
        ))}
        {TIER_A.map(([x, y]) => (
          <line
            key={`${x}-${y}`}
            x1={HUB[0]}
            y1={HUB[1]}
            x2={x}
            y2={y}
            strokeWidth={1.25}
            className={p.line}
          />
        ))}
      </g>

      {SATELLITES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2} className={p.tintStrong} />
      ))}

      {TIER_B.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={7} strokeWidth={1.25} className={cn(p.surface, p.line)} />
          <circle cx={x} cy={y} r={2.2} className={p.tintStrong} />
        </g>
      ))}

      {TIER_A.map(([x, y], i) => (
        <rect
          key={`${x}-${y}`}
          x={x - SQUARE / 2}
          y={y - SQUARE / 2}
          width={SQUARE}
          height={SQUARE}
          rx={3}
          strokeWidth={1.25}
          className={cn(i % 3 === 0 ? p.tintStrong : p.surface, p.line)}
        />
      ))}

      <circle cx={HUB[0]} cy={HUB[1]} r={26} className={p.accentHalo} />
      <circle
        cx={HUB[0]}
        cy={HUB[1]}
        r={14}
        strokeWidth={1.5}
        className={cn(p.surface, p.accentStroke)}
      />
      <circle cx={HUB[0]} cy={HUB[1]} r={5} className={p.accentFill} />
    </svg>
  );
}
