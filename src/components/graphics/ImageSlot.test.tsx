import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageSlot } from "./ImageSlot";

const ALT = "Containers being loaded at a port";

describe("ImageSlot without a photo", () => {
  it("renders a labelled vector panel, not an image", () => {
    const { container } = render(<ImageSlot alt={ALT} width={4} height={3} />);
    const panel = screen.getByRole("img", { name: ALT });
    expect(panel).toBe(container.firstElementChild);
    expect(container.querySelector("img")).toBeNull();
    expect(panel.querySelector("svg")).not.toBeNull();
  });

  it("carries no visible text and never says it is a placeholder", () => {
    const { container } = render(<ImageSlot alt={ALT} width={4} height={3} />);
    expect(container.textContent).toBe("");
    expect(container.innerHTML).not.toMatch(/coming soon|placeholder|lorem|image here/i);
  });

  it("keeps the illustration out of the accessibility tree (the panel is the only label)", () => {
    const { container } = render(<ImageSlot alt={ALT} width={4} height={3} />);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it.each(["sourcing", "shipment", "documents"] as const)("supports the %s variant", (variant) => {
    const { container } = render(<ImageSlot alt={ALT} variant={variant} width={4} height={3} />);
    expect(screen.getByRole("img", { name: ALT })).toBeInTheDocument();
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });

  it("gives each variant different art", () => {
    const html = (variant: "sourcing" | "shipment" | "documents") =>
      render(<ImageSlot alt={ALT} variant={variant} width={4} height={3} />).container.innerHTML;
    const [a, b, c] = [html("sourcing"), html("shipment"), html("documents")];
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("switches panel style with tone", () => {
    const navy = render(<ImageSlot alt={ALT} tone="navy" width={4} height={3} />).container;
    const light = render(<ImageSlot alt={ALT} tone="light" width={4} height={3} />).container;
    expect(navy.firstElementChild).toHaveClass("from-navy-800");
    expect(light.firstElementChild).toHaveClass("bg-surface");
  });

  it("reserves its box from width and height so nothing shifts when a photo arrives", () => {
    const { container } = render(<ImageSlot alt={ALT} width={1600} height={1000} />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("1600 / 1000");
  });

  it("fills a sized parent in fill mode", () => {
    const { container } = render(<ImageSlot alt={ALT} fill sizes="50vw" className="h-64" />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.style.aspectRatio).toBe("");
    expect(panel).toHaveClass("h-64", "relative");
  });

  it("ignores priority (there is nothing to preload)", () => {
    const { container } = render(<ImageSlot alt={ALT} width={4} height={3} priority />);
    expect(container.querySelector("img, link")).toBeNull();
  });
});

describe("ImageSlot with a photo", () => {
  it("renders next/image with the required alt text, and no vector panel", () => {
    const { container } = render(
      <ImageSlot
        src="/media/photo.jpg"
        alt={ALT}
        width={1600}
        height={1000}
        sizes="(min-width: 1024px) 50vw, 100vw"
      />,
    );
    const img = screen.getByRole("img", { name: ALT });
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "1000");
    expect(img).toHaveAttribute("sizes", "(min-width: 1024px) 50vw, 100vw");
    expect(img.getAttribute("srcset")).toContain(encodeURIComponent("/media/photo.jpg"));
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("lazy-loads by default and eager-loads with priority", () => {
    const lazy = render(<ImageSlot src="/media/a.jpg" alt="A" width={4} height={3} />);
    expect(lazy.getByRole("img", { name: "A" })).toHaveAttribute("loading", "lazy");
    const eager = render(<ImageSlot src="/media/b.jpg" alt="B" width={4} height={3} priority />);
    expect(eager.getByRole("img", { name: "B" })).not.toHaveAttribute("loading", "lazy");
  });

  it("supports fill mode with sizes", () => {
    render(<ImageSlot src="/media/c.jpg" alt="C" fill sizes="33vw" className="h-64" />);
    const img = screen.getByRole("img", { name: "C" });
    expect(img).toHaveAttribute("sizes", "33vw");
    expect(img).toHaveClass("object-cover");
    expect(img).not.toHaveAttribute("width");
  });

  it("still exposes the caller's className on the wrapper", () => {
    const { container } = render(
      <ImageSlot src="/media/d.jpg" alt="D" width={4} height={3} className="rounded-none" />,
    );
    expect(container.firstElementChild).toHaveClass("rounded-none");
  });
});
