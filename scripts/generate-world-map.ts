/**
 * Generates the dotted world map that backs the decorative vector graphics.
 *
 *   npm run graphics:world-map
 *
 * Land polygons (Natural Earth 1:50m via `world-atlas`) are projected with Equal Earth and sampled on
 * a staggered dot grid: a dot exists only where a cell centre falls on land. The result is written to
 * `src/components/graphics/data/` as committed, byte-stable TypeScript (no floating-point noise, no
 * timestamps), so the browser never needs d3 or the atlas. `generate-world-map.test.ts` fails when the
 * committed files drift from what this script produces.
 *
 * Nanning comes from COMPANY.nanningLatLng. The route endpoints are arbitrary illustrative positions
 * spread across the continents: they are NOT markets, offices or clients, and are never labelled.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { geoEqualEarth, geoGraticule, geoPath, type GeoContext, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { COMPANY } from "../src/config/company";

const COLS = 200;
/** Distance between neighbouring dots in a row, in viewBox units. */
const PITCH = 5;
/** Rows are staggered by half a pitch, so they sit slightly closer than PITCH apart. */
const ROW_STEP = 4.5;
/** Greenland's north coast is at ~83.6°N. */
const NORTH_LAT = 84.5;
/**
 * Tierra del Fuego ends at ~-56°. Everything further south is Antarctica, which is left out by
 * cropping the map here rather than by special-casing it.
 */
const SOUTH_LAT = -57;
const GRATICULE_STEP = 30;

/** [longitude, latitude]. Decorative fan-out targets; see the header note. */
const ROUTE_ENDPOINTS_LNG_LAT: readonly (readonly [number, number])[] = [
  [-105, 42],
  [-58, -14],
  [8, 50],
  [20, 4],
  [45, 24],
  [24, -27],
  [134, -25],
];

const DATA_DIR = fileURLToPath(new URL("../src/components/graphics/data/", import.meta.url));

/** Equal Earth, scaled so longitude ±180° spans x = 0..COLS*PITCH and the crop's north edge is y = 0. */
export function createWorldProjection(): GeoProjection {
  const projection = geoEqualEarth().fitWidth(COLS * PITCH, { type: "Sphere" });
  const north = projection([0, NORTH_LAT]);
  if (!north) throw new Error("Cannot project the northern crop latitude");
  const [tx, ty] = projection.translate();
  return projection.translate([tx, ty - north[1]]);
}

function readLand() {
  const require = createRequire(import.meta.url);
  const topology = JSON.parse(readFileSync(require.resolve("world-atlas/land-50m.json"), "utf8"));
  const land = (topology as Topology).objects.land;
  if (!land) throw new Error("world-atlas land object not found");
  return feature(topology as Topology, land);
}

/** Closed rings of the projected land polygons, as flat [x0, y0, x1, y1, ...] arrays. */
function projectedRings(projection: GeoProjection): number[][] {
  const rings: number[][] = [];
  let current: number[] = [];
  const context: GeoContext = {
    beginPath() {},
    moveTo(x, y) {
      current = [x, y];
      rings.push(current);
    },
    lineTo(x, y) {
      current.push(x, y);
    },
    arc() {},
    closePath() {},
  };
  geoPath(projection, context)(readLand());
  return rings;
}

/** Sorted x positions where the horizontal line at `y` crosses a ring edge (even-odd fill). */
function crossings(rings: number[][], y: number): number[] {
  const xs: number[] = [];
  for (const ring of rings) {
    const n = ring.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const y0 = ring[2 * i + 1]!;
      const y1 = ring[2 * j + 1]!;
      if (y0 <= y !== y1 <= y) {
        const x0 = ring[2 * i]!;
        const x1 = ring[2 * j]!;
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
  }
  return xs.sort((a, b) => a - b);
}

function cellCentre(col: number, row: number) {
  return { x: (col + 0.5 + 0.5 * (row & 1)) * PITCH, y: (row + 0.5) * ROW_STEP };
}

/** land[row][col] — true where the cell centre lies on land. */
function rasterise(projection: GeoProjection, rows: number): boolean[][] {
  const rings = projectedRings(projection);
  const land: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const xs = crossings(rings, cellCentre(0, r).y);
    const cells: boolean[] = [];
    let passed = 0;
    for (let c = 0; c < COLS; c++) {
      const { x } = cellCentre(c, r);
      while (passed < xs.length && xs[passed]! <= x) passed++;
      cells.push(passed % 2 === 1);
    }
    land.push(cells);
  }
  return land;
}

/** "ocean,land,ocean,land,..." run lengths; trailing ocean is implied. */
function encodeRow(cells: boolean[]): string {
  const runs: number[] = [];
  let value = false;
  let length = 0;
  for (const cell of cells) {
    if (cell === value) {
      length++;
    } else {
      runs.push(length);
      value = cell;
      length = 1;
    }
  }
  if (value) runs.push(length);
  return runs.join(",");
}

function fmt(n: number): string {
  return String(Number(n.toFixed(2)));
}

function snapToLand(land: boolean[][], x: number, y: number) {
  let best = { x: 0, y: 0, distance: Infinity };
  land.forEach((cells, r) =>
    cells.forEach((isLand, c) => {
      if (!isLand) return;
      const centre = cellCentre(c, r);
      const distance = (centre.x - x) ** 2 + (centre.y - y) ** 2;
      if (distance < best.distance) best = { ...centre, distance };
    }),
  );
  return best;
}

function point({ x, y }: { x: number; y: number }): string {
  return `{ x: ${fmt(x)}, y: ${fmt(y)} }`;
}

const HEADER = `// GENERATED FILE — do not edit. Run \`npm run graphics:world-map\` (scripts/generate-world-map.ts).
// Land: Natural Earth via world-atlas, Equal Earth projection.
`;

function renderDots(projection: GeoProjection): string {
  const [, southY] = projection([0, SOUTH_LAT]) ?? [];
  if (southY === undefined) throw new Error("Cannot project the southern crop latitude");
  const rows = Math.ceil(southY / ROW_STEP);
  const land = rasterise(projection, rows);

  const nanning = projection([COMPANY.nanningLatLng.lng, COMPANY.nanningLatLng.lat]);
  if (!nanning) throw new Error("Cannot project Nanning");
  const endpoints = ROUTE_ENDPOINTS_LNG_LAT.map((lngLat) => {
    const projected = projection([...lngLat]);
    if (!projected) throw new Error(`Cannot project ${lngLat.join(",")}`);
    return snapToLand(land, projected[0], projected[1]);
  });

  return `${HEADER}import type { WorldDotsData } from "./world-dots-types";

// prettier-ignore
export const WORLD_DOTS: WorldDotsData = {
  width: ${fmt(COLS * PITCH + PITCH / 2)},
  height: ${fmt(rows * ROW_STEP + ROW_STEP / 2)},
  cols: ${COLS},
  rows: ${rows},
  pitch: ${PITCH},
  rowStep: ${ROW_STEP},
  runs: [
${land.map((cells) => `    "${encodeRow(cells)}",`).join("\n")}
  ],
  nanning: ${point({ x: nanning[0], y: nanning[1] })},
  routeEndpoints: [
${endpoints.map((p) => `    ${point(p)},`).join("\n")}
  ],
};
`;
}

function renderGraticule(projection: GeoProjection): string {
  const graticule = geoGraticule()
    .extent([
      [-180, SOUTH_LAT],
      [180, NORTH_LAT],
    ])
    .step([GRATICULE_STEP, GRATICULE_STEP])
    .precision(5);
  const d = geoPath(projection).digits(1)(graticule());
  if (!d) throw new Error("Empty graticule");
  return `${HEADER}
// prettier-ignore
export const WORLD_GRATICULE_PATH = "${d}";
`;
}

/** Every generated file with the exact source it must contain. */
export function generateWorldMapFiles(): { path: string; source: string }[] {
  const projection = createWorldProjection();
  return [
    { path: `${DATA_DIR}world-dots.ts`, source: renderDots(projection) },
    { path: `${DATA_DIR}world-graticule.ts`, source: renderGraticule(projection) },
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const { path, source } of generateWorldMapFiles()) {
    writeFileSync(path, source);
    console.log(`wrote ${path} (${(Buffer.byteLength(source) / 1024).toFixed(1)} KB)`);
  }
}
