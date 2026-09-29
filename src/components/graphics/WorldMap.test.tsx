import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorldMap } from "./WorldMap";
import { NANNING, ROUTE_ARCS, WORLD_VIEWBOX } from "./world-geometry";

function renderMap(props: Parameters<typeof WorldMap>[0] = {}) {
  const { container } = render(<WorldMap {...props} />);
  return container.querySelector("svg")!;
}

describe("WorldMap", () => {
  it("is decorative: hidden from assistive technology and unlabelled", () => {
    const svg = renderMap({ highlightNanning: true, showRoutes: true });
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
    expect(svg).not.toHaveAttribute("aria-label");
    expect(svg).toHaveAttribute("viewBox", WORLD_VIEWBOX);
  });

  it("never labels a country or city: no text, title or description nodes", () => {
    const svg = renderMap({ highlightNanning: true, showRoutes: true });
    expect(svg.querySelector("text, title, desc, tspan")).toBeNull();
    expect(svg.textContent).toBe("");
  });

  it("draws the land as one path, and nothing else by default", () => {
    const svg = renderMap();
    expect(svg.querySelectorAll("path")).toHaveLength(1);
    expect(svg.querySelector('[data-layer="routes"]')).toBeNull();
    expect(svg.querySelector('[data-layer="nanning"]')).toBeNull();
  });

  it("toggles routes with showRoutes: one gradient arc per endpoint", () => {
    const svg = renderMap({ showRoutes: true });
    const routes = svg.querySelector('[data-layer="routes"]')!;
    expect(routes).not.toBeNull();
    expect(routes.querySelectorAll("path")).toHaveLength(ROUTE_ARCS.length);
    expect(routes.querySelectorAll("linearGradient")).toHaveLength(ROUTE_ARCS.length);
    for (const arc of routes.querySelectorAll("path")) {
      expect(arc.getAttribute("stroke")).toMatch(/^url\(#[\w-]+\)$/);
    }
  });

  it("toggles the Nanning marker with highlightNanning, centred on Nanning", () => {
    const svg = renderMap({ highlightNanning: true });
    const marker = svg.querySelector('[data-layer="nanning"]')!;
    expect(marker).not.toBeNull();
    const circles = marker.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(2);
    for (const circle of circles) {
      expect(Number(circle.getAttribute("cx"))).toBe(NANNING.x);
      expect(Number(circle.getAttribute("cy"))).toBe(NANNING.y);
    }
    expect(svg.querySelector('[data-layer="routes"]')).toBeNull();
  });

  it("does not animate: no SMIL animation elements", () => {
    const svg = renderMap({ highlightNanning: true, showRoutes: true });
    expect(svg.querySelector("animate, animateTransform, animateMotion, set")).toBeNull();
  });

  it("uses distinct palettes for light and navy backgrounds", () => {
    const light = renderMap({ tone: "light" }).querySelector("path")!.getAttribute("class");
    const navy = renderMap({ tone: "navy" }).querySelector("path")!.getAttribute("class");
    expect(light).toBeTruthy();
    expect(navy).toBeTruthy();
    expect(light).not.toBe(navy);
  });

  it("keeps gradient ids unique when several maps share a page", () => {
    const { container } = render(
      <>
        <WorldMap showRoutes />
        <WorldMap showRoutes />
      </>,
    );
    const ids = [...container.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(ids).toHaveLength(ROUTE_ARCS.length * 2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("accepts a className for sizing", () => {
    expect(renderMap({ className: "max-w-xl" })).toHaveClass("max-w-xl", "w-full");
  });
});
