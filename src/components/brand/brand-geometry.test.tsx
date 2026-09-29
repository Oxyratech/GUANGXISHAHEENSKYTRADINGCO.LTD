import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { LogoMark } from "./LogoMark";
import { BRAND_COLORS, MARK_HORIZON, MARK_VIEWBOX, MARK_WING_PATH } from "./brand-geometry";

const root = process.cwd();
const readAsset = (path: string) => readFileSync(join(root, path), "utf8");

const wingPoints = [...MARK_WING_PATH.matchAll(/[ML]\s*([\d.]+)\s+([\d.]+)/g)].map((m) => ({
  x: Number(m[1]),
  y: Number(m[2]),
}));

describe("mark geometry", () => {
  it("is a closed polygon of straight segments (no arcs, curves or borrowed emblem art)", () => {
    expect(MARK_WING_PATH).toMatch(/^M[^A-Za-z]+(?: L[^A-Za-z]+)+ Z$/);
    expect(MARK_WING_PATH).not.toMatch(/[CSQTAHVcsqtahv]/);
  });

  it("stays inside the viewBox and keeps the wing clear of the horizon line", () => {
    expect(wingPoints.length).toBeGreaterThanOrEqual(8);
    for (const { x, y } of wingPoints) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(MARK_VIEWBOX);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(MARK_VIEWBOX);
    }
    expect(Math.max(...wingPoints.map((p) => p.y))).toBeLessThan(MARK_HORIZON.y);
    expect(MARK_HORIZON.y + MARK_HORIZON.height).toBeLessThanOrEqual(MARK_VIEWBOX);
  });

  it("is what <LogoMark> renders", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector("path")).toHaveAttribute("d", MARK_WING_PATH);
    const horizon = container.querySelector("rect");
    for (const [name, value] of Object.entries(MARK_HORIZON)) {
      expect(horizon).toHaveAttribute(name, String(value));
    }
  });
});

describe("static brand assets repeat the geometry", () => {
  const horizon = `x="${MARK_HORIZON.x}" y="${MARK_HORIZON.y}" width="${MARK_HORIZON.width}" height="${MARK_HORIZON.height}"`;

  it("src/app/icon.svg: white wing and gold horizon on navy", () => {
    const svg = readAsset("src/app/icon.svg");
    expect(svg).toContain(`d="${MARK_WING_PATH}"`);
    expect(svg).toContain(horizon);
    expect(svg).toContain(`fill="${BRAND_COLORS.navy}"`);
    expect(svg).toContain(`fill="${BRAND_COLORS.white}"`);
    expect(svg).toContain(`fill="${BRAND_COLORS.gold}"`);
  });

  it("public/brand/logo-mark.svg: navy wing and gold horizon, transparent background", () => {
    const svg = readAsset("public/brand/logo-mark.svg");
    expect(svg).toContain(`viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}"`);
    expect(svg).toContain(`d="${MARK_WING_PATH}"`);
    expect(svg).toContain(horizon);
    expect(svg).toContain(`fill="${BRAND_COLORS.navy}"`);
    expect(svg).not.toMatch(/<rect[^>]*width="(?:48|100%)"/);
  });

  it("neither asset relies on fonts or scripts", () => {
    for (const path of ["src/app/icon.svg", "public/brand/logo-mark.svg"]) {
      expect(readAsset(path)).not.toMatch(/<text|<script|<image|font-family/i);
    }
  });
});
