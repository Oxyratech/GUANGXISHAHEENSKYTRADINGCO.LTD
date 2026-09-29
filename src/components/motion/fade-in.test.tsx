import { render, screen } from "@testing-library/react";
import { animate } from "motion/react";
import { renderToString } from "react-dom/server";
import { FadeIn } from "./fade-in";
import { stubReducedMotion } from "./test-utils";

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

const animateMock = vi.mocked(animate);

beforeEach(() => {
  animateMock.mockClear();
  stubReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// FadeIn remembers (per page load) that the first page has mounted, so this order is deliberate:
// the very first mount is the initial server-rendered page, everything after is a navigation.
describe("FadeIn", () => {
  it("renders visible content on the server", () => {
    const html = renderToString(<FadeIn className="page">Page</FadeIn>);
    expect(html).toContain("Page");
    expect(html).not.toMatch(/style=|opacity/);
  });

  it("does not animate the first mount of a page load (server HTML is already on screen)", () => {
    render(<FadeIn data-testid="page">First page</FadeIn>);
    expect(screen.getByTestId("page")).not.toHaveAttribute("style");
    expect(animateMock).not.toHaveBeenCalled();
  });

  it("fades in on later mounts, i.e. client-side navigations, for 180ms, opacity only", () => {
    render(<FadeIn data-testid="page">Next page</FadeIn>);
    const page = screen.getByTestId("page");
    expect(page.style.opacity).toBe("0");

    expect(animateMock).toHaveBeenCalledTimes(1);
    const [target, keyframes, options] = animateMock.mock.calls[0] as unknown as [
      Element,
      Record<string, unknown>,
      { duration: number; onComplete: () => void },
    ];
    expect(target).toBe(page);
    expect(keyframes).toEqual({ opacity: [0, 1] });
    expect(options.duration).toBeGreaterThanOrEqual(0.15);
    expect(options.duration).toBeLessThanOrEqual(0.2);

    options.onComplete();
    expect(page.style.opacity).toBe("");
  });

  it("does not animate under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    render(<FadeIn data-testid="page">Reduced</FadeIn>);
    expect(screen.getByTestId("page")).not.toHaveAttribute("style");
    expect(animateMock).not.toHaveBeenCalled();
  });

  it("passes props through to its wrapper", () => {
    render(
      <FadeIn className="page" id="wrapper" data-testid="page">
        x
      </FadeIn>,
    );
    expect(screen.getByTestId("page")).toHaveClass("page");
    expect(screen.getByTestId("page")).toHaveAttribute("id", "wrapper");
  });
});
