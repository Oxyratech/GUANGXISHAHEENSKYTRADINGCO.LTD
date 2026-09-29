// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { WORLD_DOTS } from "../src/components/graphics/data/world-dots";
import { createWorldProjection, generateWorldMapFiles } from "./generate-world-map";

type LngLat = [number, number];

let generated: ReturnType<typeof generateWorldMapFiles>;
const projection = createWorldProjection();

/** land[row][col] decoded from the committed run-length rows, independently of the runtime path builder. */
function decodeLand(): boolean[][] {
  return WORLD_DOTS.runs.map((row) => {
    const cells = new Array<boolean>(WORLD_DOTS.cols).fill(false);
    const counts = row ? row.split(",").map(Number) : [];
    let col = 0;
    counts.forEach((count, i) => {
      if (i % 2 === 1) for (let c = col; c < col + count; c++) cells[c] = true;
      col += count;
    });
    return cells;
  });
}

const land = decodeLand();

function project(lngLat: LngLat) {
  const point = projection(lngLat);
  if (!point) throw new Error(`unprojectable ${lngLat.join(",")}`);
  return { x: point[0], y: point[1] };
}

/** Is the dot cell containing this projected point land? */
function isLandAt(lngLat: LngLat): boolean {
  const { x, y } = project(lngLat);
  const row = Math.min(WORLD_DOTS.rows - 1, Math.floor(y / WORLD_DOTS.rowStep));
  const shift = row % 2 === 1 ? 0.5 : 0;
  const col = Math.min(WORLD_DOTS.cols - 1, Math.floor(x / WORLD_DOTS.pitch - shift));
  return Boolean(land[row]?.[Math.max(0, col)]);
}

describe("world map generator", () => {
  beforeAll(() => {
    generated = generateWorldMapFiles();
  }, 60_000);

  it("is byte-stable: regenerating reproduces the committed files exactly", () => {
    expect(generated.length).toBeGreaterThan(0);
    for (const { path, source } of generated) {
      expect(readFileSync(path, "utf8"), path).toBe(source);
    }
  });

  it("is deterministic across runs", () => {
    const again = generateWorldMapFiles();
    expect(again).toEqual(generated);
  }, 60_000);

  it("keeps every generated file compact", () => {
    for (const { path, source } of generated) {
      expect(Buffer.byteLength(source), path).toBeLessThan(60 * 1024);
    }
  });
});

describe("world dot grid", () => {
  it("has one run-length row per grid row, none wider than the grid", () => {
    expect(WORLD_DOTS.runs).toHaveLength(WORLD_DOTS.rows);
    for (const row of WORLD_DOTS.runs) {
      const counts = row ? row.split(",").map(Number) : [];
      expect(counts.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
      expect(counts.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(WORLD_DOTS.cols);
    }
  });

  it("holds a plausible number of dots: land only, not an empty or full grid", () => {
    const dots = land.flat().filter(Boolean).length;
    const cells = WORLD_DOTS.cols * WORLD_DOTS.rows;
    expect(dots / cells).toBeGreaterThan(0.2);
    expect(dots / cells).toBeLessThan(0.4);
  });

  it("puts dots on continents and leaves oceans empty", () => {
    const continents: [string, LngLat][] = [
      ["central Sahara", [15, 25]],
      ["Kazakhstan", [67, 48]],
      ["Amazon basin", [-62, -5]],
      ["central Australia", [134, -25]],
      ["US midwest", [-98, 40]],
    ];
    const oceans: [string, LngLat][] = [
      ["mid Pacific", [-150, 0]],
      ["mid Atlantic", [-30, 10]],
      ["Indian Ocean", [80, -20]],
      ["Southern Ocean", [0, -50]],
    ];
    for (const [name, lngLat] of continents) expect(isLandAt(lngLat), name).toBe(true);
    for (const [name, lngLat] of oceans) expect(isLandAt(lngLat), name).toBe(false);
  });

  it("leaves Antarctica out: the bottom of the map is South America's tip, not a continent", () => {
    const lastRows = land.slice(-8);
    const dotsInLastRows = lastRows.flat().filter(Boolean).length;
    expect(dotsInLastRows).toBeLessThan(40);
  });
});

describe("Nanning marker", () => {
  const { nanning } = WORLD_DOTS;

  it("lies inside the viewBox", () => {
    expect(nanning.x).toBeGreaterThan(0);
    expect(nanning.x).toBeLessThan(WORLD_DOTS.width);
    expect(nanning.y).toBeGreaterThan(0);
    expect(nanning.y).toBeLessThan(WORLD_DOTS.height);
  });

  it("is in south-east Asia: east of India, south of Beijing, north of the equator's islands", () => {
    const kolkata = project([88.36, 22.57]);
    const beijing = project([116.41, 39.9]);
    const hanoi = project([105.85, 21.03]);
    const guangzhou = project([113.26, 23.13]);
    const singapore = project([103.82, 1.35]);

    expect(nanning.x).toBeGreaterThan(kolkata.x);
    expect(nanning.y).toBeGreaterThan(beijing.y);
    expect(nanning.y).toBeLessThan(singapore.y);
    expect(nanning.x).toBeLessThan(guangzhou.x);
    expect(Math.hypot(nanning.x - hanoi.x, nanning.y - hanoi.y)).toBeLessThan(WORLD_DOTS.pitch * 4);
  });

  it("sits on land, within one dot of a land dot", () => {
    let nearest = Infinity;
    land.forEach((cells, r) =>
      cells.forEach((isLand, c) => {
        if (!isLand) return;
        const x = (c + 0.5 + (r % 2 === 1 ? 0.5 : 0)) * WORLD_DOTS.pitch;
        const y = (r + 0.5) * WORLD_DOTS.rowStep;
        nearest = Math.min(nearest, Math.hypot(x - nanning.x, y - nanning.y));
      }),
    );
    expect(nearest).toBeLessThanOrEqual(WORLD_DOTS.pitch);
  });
});

describe("route endpoints", () => {
  it("are inside the viewBox and each sits exactly on a land dot", () => {
    for (const { x, y } of WORLD_DOTS.routeEndpoints) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(WORLD_DOTS.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(WORLD_DOTS.height);
      const row = Math.round(y / WORLD_DOTS.rowStep - 0.5);
      const col = Math.round(x / WORLD_DOTS.pitch - 0.5 - (row % 2 === 1 ? 0.5 : 0));
      expect(land[row]?.[col]).toBe(true);
    }
  });
});
