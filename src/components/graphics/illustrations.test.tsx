import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocumentArt } from "./DocumentArt";
import { PatternGrid } from "./PatternGrid";
import { ShipmentArt } from "./ShipmentArt";
import { SourcingArt } from "./SourcingArt";

const ILLUSTRATIONS = [
  ["SourcingArt", SourcingArt],
  ["ShipmentArt", ShipmentArt],
  ["DocumentArt", DocumentArt],
] as const;

describe.each(ILLUSTRATIONS)("%s", (_name, Art) => {
  it.each(["navy", "light"] as const)("renders decorative, wordless art on %s", (tone) => {
    const { container } = render(<Art tone={tone} className="h-full w-full" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox");
    expect(svg).toHaveClass("h-full", "w-full");
    expect(svg.querySelector("text, title, desc, image, foreignObject")).toBeNull();
    expect(svg.querySelector("animate, animateTransform, animateMotion, set")).toBeNull();
    expect(svg.querySelectorAll("*").length).toBeGreaterThan(10);
  });

  it("uses design-token classes only: no hard-coded colours", () => {
    const { container } = render(<Art />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    expect(container.innerHTML).not.toMatch(/(?:fill|stroke)="(?!none|url)/);
  });

  it("differs between tones", () => {
    const navy = render(<Art tone="navy" />).container.innerHTML;
    const light = render(<Art tone="light" />).container.innerHTML;
    expect(navy).not.toBe(light);
  });
});

describe("ShipmentArt", () => {
  it("uses the gold accent exactly once", () => {
    const { container } = render(<ShipmentArt tone="navy" />);
    expect(container.querySelectorAll("rect.fill-gold-400")).toHaveLength(1);
  });
});

describe("DocumentArt", () => {
  it("mirrors in RTL through the shared rtl-flip class", () => {
    const { container } = render(<DocumentArt />);
    expect(container.querySelector("svg")).toHaveClass("rtl-flip");
  });
});

describe("PatternGrid", () => {
  it.each(["dots", "grid", "cross"] as const)(
    "renders the %s pattern as a filled rect",
    (variant) => {
      const { container } = render(<PatternGrid variant={variant} />);
      const svg = container.querySelector("svg")!;
      const pattern = svg.querySelector("pattern")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(pattern.querySelectorAll("path")).toHaveLength(1);
      expect(svg.querySelector("rect")).toHaveAttribute("fill", `url(#${pattern.id})`);
    },
  );

  it("gives every instance its own pattern id", () => {
    const { container } = render(
      <>
        <PatternGrid />
        <PatternGrid variant="grid" />
      </>,
    );
    const ids = [...container.querySelectorAll("pattern")].map((p) => p.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("fills its positioned parent and ignores pointer input", () => {
    const { container } = render(<PatternGrid className="opacity-50" />);
    expect(container.querySelector("svg")).toHaveClass(
      "absolute",
      "inset-0",
      "pointer-events-none",
      "opacity-50",
    );
  });
});
