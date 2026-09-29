import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { PALETTE } from "./art-palette";
import { useSvgId } from "./use-svg-id";
import { WorldMapLayers } from "./WorldMapLayers";
import {
  NANNING,
  WORLD_GRATICULE_PATH,
  WORLD_HEIGHT,
  WORLD_VIEWBOX,
  WORLD_WIDTH,
} from "./world-geometry";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

const ASPECT = (WORLD_WIDTH / WORLD_HEIGHT).toFixed(4);
const FOCUS_X = (NANNING.x / WORLD_WIDTH).toFixed(4);
const FOCUS_Y = (NANNING.y / WORLD_HEIGHT).toFixed(4);
const palette = PALETTE.navy;

/**
 * "Cover" crop with a focal point, in CSS only. The map is at least as large as the container in
 * both directions; when it has to overflow (a phone, a short banner) Nanning stays as close to the
 * centre as the map edges allow, so the dots keep a legible size instead of shrinking to fit.
 * Container-query units resolve against the wrapper below.
 */
const CROP_STYLE: CustomStyle = {
  "--art-w": `max(100cqw, calc(100cqh * ${ASPECT}))`,
  "--art-h": `calc(var(--art-w) / ${ASPECT})`,
  width: "var(--art-w)",
  height: "var(--art-h)",
  insetInlineStart: `clamp(calc(100cqw - var(--art-w)), calc(50cqw - var(--art-w) * ${FOCUS_X}), 0px)`,
  insetBlockStart: `clamp(calc(100cqh - var(--art-h)), calc(50cqh - var(--art-h) * ${FOCUS_Y}), 0px)`,
};

/** Fades the art out towards the edges of the container, whatever the crop. */
const VIGNETTE = "radial-gradient(ellipse 92% 88% at 50% 50%, #000 52%, transparent 100%)";
const VIGNETTE_STYLE: CSSProperties = { maskImage: VIGNETTE, WebkitMaskImage: VIGNETTE };

export interface HeroArtProps {
  className?: string;
}

/**
 * Decorative hero visual for navy backgrounds: dotted world map, faint graticule, a soft glow at
 * Nanning and a few gold arcs fanning out to unlabelled points. The arcs are ILLUSTRATIVE ONLY and
 * do not represent markets, offices or clients. Fully decorative (aria-hidden), no animation.
 *
 * It fills its nearest positioned ancestor (`absolute inset-0`): put it inside a `relative` box with
 * `overflow-hidden`, behind the hero content. It is always laid out left-to-right, because a map
 * must not mirror in RTL.
 */
export function HeroArt({ className }: HeroArtProps) {
  const id = useSvgId();

  return (
    <div
      aria-hidden="true"
      dir="ltr"
      className={cn(
        "[container-type:size] pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      style={VIGNETTE_STYLE}
    >
      <svg viewBox={WORLD_VIEWBOX} className="absolute max-w-none" style={CROP_STYLE}>
        <defs>
          <radialGradient
            id={`${id}-glow`}
            gradientUnits="userSpaceOnUse"
            cx={NANNING.x}
            cy={NANNING.y}
            r={WORLD_WIDTH * 0.32}
          >
            <stop offset="0" stopOpacity="0.5" style={{ stopColor: "var(--color-navy-600)" }} />
            <stop offset="1" stopOpacity="0" style={{ stopColor: "var(--color-navy-600)" }} />
          </radialGradient>
        </defs>
        <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill={`url(#${id}-glow)`} />
        <path
          data-layer="graticule"
          d={WORLD_GRATICULE_PATH}
          fill="none"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className={palette.graticule}
        />
        <WorldMapLayers tone="navy" highlightNanning showRoutes />
      </svg>
    </div>
  );
}
