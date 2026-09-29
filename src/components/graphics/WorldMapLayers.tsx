import { PALETTE, type GraphicTone } from "./art-palette";
import { useSvgId } from "./use-svg-id";
import {
  NANNING,
  ROUTE_ARCS,
  WORLD_DOT_DIAMETER,
  WORLD_DOTS_PATH,
  WORLD_PITCH,
} from "./world-geometry";

export interface WorldMapLayersProps {
  tone: GraphicTone;
  highlightNanning?: boolean;
  showRoutes?: boolean;
}

/**
 * SVG content of the dotted world map (no <svg> wrapper), so WorldMap and HeroArt share one
 * coordinate system. Everything is static: no animation.
 */
export function WorldMapLayers({ tone, highlightNanning, showRoutes }: WorldMapLayersProps) {
  const id = useSvgId();
  const palette = PALETTE[tone];

  return (
    <>
      <path
        data-layer="land"
        d={WORLD_DOTS_PATH}
        fill="none"
        strokeWidth={WORLD_DOT_DIAMETER}
        strokeLinecap="round"
        strokeDasharray={`0 ${WORLD_PITCH}`}
        className={palette.dot}
      />

      {showRoutes ? (
        <g data-layer="routes" fill="none" strokeLinecap="round">
          <defs>
            {ROUTE_ARCS.map((arc, i) => (
              <linearGradient
                key={i}
                id={`${id}-route-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={NANNING.x}
                y1={NANNING.y}
                x2={arc.to.x}
                y2={arc.to.y}
              >
                <stop offset="0" stopOpacity="0.9" style={{ stopColor: palette.routeFrom }} />
                <stop offset="1" stopOpacity="0.3" style={{ stopColor: palette.routeTo }} />
              </linearGradient>
            ))}
          </defs>
          {ROUTE_ARCS.map((arc, i) => (
            <path
              key={i}
              d={arc.d}
              stroke={`url(#${id}-route-${i})`}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {ROUTE_ARCS.map((arc, i) => (
            <circle
              key={i}
              cx={arc.to.x}
              cy={arc.to.y}
              r={1.7}
              fillOpacity={0.75}
              stroke="none"
              className={palette.accentFill}
            />
          ))}
        </g>
      ) : null}

      {highlightNanning ? (
        <g data-layer="nanning">
          <circle
            cx={NANNING.x}
            cy={NANNING.y}
            r={16}
            stroke="none"
            className={palette.accentHalo}
          />
          <circle
            cx={NANNING.x}
            cy={NANNING.y}
            r={7.5}
            fill="none"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            className={palette.accentStroke}
          />
          <circle
            cx={NANNING.x}
            cy={NANNING.y}
            r={2.6}
            stroke="none"
            className={palette.accentFill}
          />
        </g>
      ) : null}
    </>
  );
}
