import { render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Analytics } from "./Analytics";
import { TrackOnMount } from "./TrackOnMount";

// next/script needs the Next.js runtime; a plain <script> shows what would be loaded.
vi.mock("next/script", () => ({
  default: ({
    strategy: _strategy,
    ...props
  }: ComponentProps<"script"> & { strategy?: string }) => (
    <script data-testid="plausible-script" {...props} />
  ),
}));

function setDoNotTrack(value: string) {
  Object.defineProperty(window.navigator, "doNotTrack", { value, configurable: true });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "");
  delete window.plausible;
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window.navigator as { doNotTrack?: unknown }).doNotTrack;
  delete window.plausible;
});

describe("Analytics", () => {
  it("renders nothing, and so loads nothing, without a configured domain", () => {
    const { container } = render(<Analytics />);

    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector("script")).toBeNull();
  });

  it("loads the Plausible script for the configured domain", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");

    render(<Analytics />);

    const script = document.querySelector("script[data-testid='plausible-script']");
    expect(script).toHaveAttribute("src", "https://plausible.io/js/script.js");
    expect(script).toHaveAttribute("data-domain", "example.com");
  });

  it("does not load the script when the visitor has Do Not Track on", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    setDoNotTrack("1");

    render(<Analytics />);

    expect(document.querySelector("script")).toBeNull();
  });
});

describe("TrackOnMount", () => {
  it("records its event once, with the allowed properties", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    const plausible = vi.fn();
    window.plausible = plausible;

    const { rerender } = render(
      <StrictMode>
        <TrackOnMount event="product_view" props={{ category: "food-products", product: "abc" }} />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <TrackOnMount event="product_view" props={{ category: "food-products", product: "abc" }} />
      </StrictMode>,
    );

    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith("product_view", {
      props: { category: "food-products", product: "abc" },
    });
  });

  it("records again when the event changes", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    const plausible = vi.fn();
    window.plausible = plausible;

    const { rerender } = render(<TrackOnMount event="product_view" props={{ product: "a" }} />);
    rerender(<TrackOnMount event="product_view" props={{ product: "b" }} />);

    expect(plausible).toHaveBeenCalledTimes(2);
  });

  it("does nothing when analytics are not configured", () => {
    const { container } = render(<TrackOnMount event="page_view" />);

    expect(container).toBeEmptyDOMElement();
    expect(window.plausible).toBeUndefined();
  });
});
