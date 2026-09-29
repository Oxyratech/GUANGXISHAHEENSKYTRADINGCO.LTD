import { describe, expect, it } from "vitest";
import { WORLD_DOTS } from "./data/world-dots";
import {
  NANNING,
  ROUTE_ARCS,
  WORLD_DOT_DIAMETER,
  WORLD_DOTS_PATH,
  WORLD_GRATICULE_PATH,
  WORLD_HEIGHT,
  WORLD_PITCH,
  WORLD_VIEWBOX,
  WORLD_WIDTH,
} from "./world-geometry";

const numbers = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

const landRuns = WORLD_DOTS.runs.flatMap((row) =>
  (row ? row.split(",").map(Number) : []).filter((_, i) => i % 2 === 1),
);

describe("world geometry", () => {
  it("exposes the viewBox of the generated data", () => {
    expect(WORLD_VIEWBOX).toBe(`0 0 ${WORLD_DOTS.width} ${WORLD_DOTS.height}`);
    expect(WORLD_WIDTH / WORLD_HEIGHT).toBeGreaterThan(2);
    expect(WORLD_PITCH).toBe(WORLD_DOTS.pitch);
    expect(WORLD_DOT_DIAMETER).toBeGreaterThan(0);
    expect(WORLD_DOT_DIAMETER).toBeLessThan(WORLD_PITCH);
  });

  describe("dots path", () => {
    const subpaths = WORLD_DOTS_PATH.split("M").filter(Boolean);

    it("has one subpath per run of land cells", () => {
      expect(subpaths).toHaveLength(landRuns.length);
    });

    it("draws exactly one dot per land cell (dash pitch = dot pitch)", () => {
      const dots = subpaths.map((sub) => {
        const [x1, , x2] = numbers(sub);
        return Math.floor((x2! - x1!) / WORLD_PITCH) + 1;
      });
      expect(dots.reduce((a, b) => a + b, 0)).toBe(landRuns.reduce((a, b) => a + b, 0));
    });

    it("keeps every dot, including its radius, inside the viewBox", () => {
      const radius = WORLD_DOT_DIAMETER / 2;
      for (const sub of subpaths) {
        const [x1, y, lastDotEnd] = numbers(sub);
        expect(x1! - radius).toBeGreaterThanOrEqual(0);
        expect(lastDotEnd! - WORLD_PITCH / 2 + radius).toBeLessThanOrEqual(WORLD_WIDTH);
        expect(y! - radius).toBeGreaterThanOrEqual(0);
        expect(y! + radius).toBeLessThanOrEqual(WORLD_HEIGHT);
      }
    });

    it("is one compact string", () => {
      expect(WORLD_DOTS_PATH.length).toBeLessThan(30 * 1024);
    });
  });

  describe("route arcs", () => {
    it("has one arc per endpoint, each running from Nanning to its endpoint", () => {
      expect(ROUTE_ARCS).toHaveLength(WORLD_DOTS.routeEndpoints.length);
      ROUTE_ARCS.forEach((arc, i) => {
        const [sx, sy, cx, cy, ex, ey] = numbers(arc.d);
        expect(arc.d.startsWith("M")).toBe(true);
        expect(sx).toBeCloseTo(NANNING.x, 0);
        expect(sy).toBeCloseTo(NANNING.y, 0);
        expect(ex).toBeCloseTo(WORLD_DOTS.routeEndpoints[i]!.x, 0);
        expect(ey).toBeCloseTo(WORLD_DOTS.routeEndpoints[i]!.y, 0);
        expect(arc.to).toBe(WORLD_DOTS.routeEndpoints[i]);
        // Bows towards the top of the map, like a flight path.
        expect(cy).toBeLessThanOrEqual((sy! + ey!) / 2);
        // The apex of a quadratic curve is at t = 0.5 and must stay on the canvas.
        const apexX = 0.25 * sx! + 0.5 * cx! + 0.25 * ex!;
        const apexY = 0.25 * sy! + 0.5 * cy! + 0.25 * ey!;
        expect(apexX).toBeGreaterThan(0);
        expect(apexX).toBeLessThan(WORLD_WIDTH);
        expect(apexY).toBeGreaterThan(0);
        expect(apexY).toBeLessThan(WORLD_HEIGHT);
      });
    });

    it("are spread out rather than bunched: endpoints span most of the map width", () => {
      const xs = ROUTE_ARCS.map((arc) => arc.to.x);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(WORLD_WIDTH * 0.5);
    });
  });

  it("re-exports the graticule in the same coordinate space", () => {
    expect(WORLD_GRATICULE_PATH.startsWith("M")).toBe(true);
    const coords = numbers(WORLD_GRATICULE_PATH);
    expect(Math.max(...coords)).toBeLessThanOrEqual(Math.max(WORLD_WIDTH, WORLD_HEIGHT) + 1);
    expect(Math.min(...coords)).toBeGreaterThanOrEqual(-1);
  });
});
