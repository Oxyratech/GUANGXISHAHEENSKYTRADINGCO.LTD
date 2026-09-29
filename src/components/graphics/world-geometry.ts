import { WORLD_DOTS } from "./data/world-dots";
import type { WorldPoint } from "./data/world-dots-types";

const { width, height, pitch, rowStep, runs, nanning, routeEndpoints } = WORLD_DOTS;

export const WORLD_WIDTH = width;
export const WORLD_HEIGHT = height;
export const WORLD_VIEWBOX = `0 0 ${width} ${height}`;
export const WORLD_PITCH = pitch;
/** Dots fill about half the pitch: legible as a dot, airy as a texture. */
export const WORLD_DOT_DIAMETER = pitch * 0.52;

export const NANNING: WorldPoint = nanning;

function fmt(n: number): string {
  return String(Number(n.toFixed(1)));
}

/**
 * Every run of land cells becomes one horizontal subpath. Drawn with `stroke-dasharray="0 <pitch>"`
 * and round caps, a subpath renders as a row of dots, so ~5,000 dots cost one <path> of ~15 KB.
 * The subpath ends half a pitch past its last dot so floating-point error can never drop it.
 */
function buildDotsPath(): string {
  const parts: string[] = [];
  runs.forEach((row, r) => {
    if (!row) return;
    const y = (r + 0.5) * rowStep;
    const shift = r % 2 === 1 ? 0.5 : 0;
    const counts = row.split(",").map(Number);
    let col = 0;
    for (let i = 0; i < counts.length; i += 2) {
      col += counts[i]!;
      const land = counts[i + 1];
      if (land === undefined) break;
      const start = (col + 0.5 + shift) * pitch;
      parts.push(`M${fmt(start)} ${fmt(y)}H${fmt(start + (land - 0.5) * pitch)}`);
      col += land;
    }
  });
  return parts.join("");
}

export const WORLD_DOTS_PATH = buildDotsPath();

export interface RouteArc {
  /** Quadratic curve from Nanning to `to`. */
  readonly d: string;
  readonly to: WorldPoint;
}

/** Curves bow towards the top of the map, like flight paths. Purely decorative. */
function buildRouteArc(to: WorldPoint): RouteArc {
  const dx = to.x - nanning.x;
  const dy = to.y - nanning.y;
  const length = Math.hypot(dx, dy);
  let nx = dy / length;
  let ny = -dx / length;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bulge = length * 0.2;
  const cx = (nanning.x + to.x) / 2 + nx * bulge;
  const cy = (nanning.y + to.y) / 2 + ny * bulge;
  return {
    d: `M${fmt(nanning.x)} ${fmt(nanning.y)}Q${fmt(cx)} ${fmt(cy)} ${fmt(to.x)} ${fmt(to.y)}`,
    to,
  };
}

export const ROUTE_ARCS: readonly RouteArc[] = routeEndpoints.map(buildRouteArc);

/** Faint meridians and parallels, in the same coordinate space as the dots. */
export { WORLD_GRATICULE_PATH } from "./data/world-graticule";
