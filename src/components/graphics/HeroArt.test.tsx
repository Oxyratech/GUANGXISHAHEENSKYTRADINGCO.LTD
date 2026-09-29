import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroArt } from "./HeroArt";
import { NANNING, ROUTE_ARCS } from "./world-geometry";

describe("HeroArt", () => {
  it("is fully decorative and never mirrors in RTL", () => {
    const { container } = render(<HeroArt />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveAttribute("dir", "ltr");
    expect(root).toHaveClass("pointer-events-none");
    expect(container.querySelector("text, title, desc, a, button, img")).toBeNull();
  });

  it("composes graticule, dotted land, routes and the Nanning marker in one SVG", () => {
    const { container } = render(<HeroArt />);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelector('[data-layer="graticule"]')).not.toBeNull();
    expect(container.querySelector('[data-layer="land"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-layer="routes"] path')).toHaveLength(
      ROUTE_ARCS.length,
    );
    const marker = container.querySelector('[data-layer="nanning"] circle')!;
    expect(Number(marker.getAttribute("cx"))).toBe(NANNING.x);
  });

  it("crops with a focal point instead of shrinking: the map is at least as big as its container", () => {
    const { container } = render(<HeroArt />);
    const svg = container.querySelector("svg")!;
    const style = svg.getAttribute("style") ?? "";
    expect(style).toContain("--art-w: max(100cqw, calc(100cqh *");
    expect(style).toMatch(/inset-inline-start: clamp\(/);
    expect(style).toMatch(/inset-block-start: clamp\(/);
    expect(container.firstElementChild!.className).toContain("[container-type:size]");
  });

  it("lets the page position it", () => {
    const { container } = render(<HeroArt className="opacity-60" />);
    expect(container.firstElementChild).toHaveClass("absolute", "inset-0", "opacity-60");
  });
});
