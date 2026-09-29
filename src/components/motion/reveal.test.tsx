import { render, screen } from "@testing-library/react";
import { animate } from "motion/react";
import { renderToString } from "react-dom/server";
import { prefersReducedMotion } from "./reduced-motion";
import { Reveal } from "./reveal";
import { RevealStagger } from "./reveal-stagger";
import {
  FakeIntersectionObserver,
  installFakeIntersectionObserver,
  stubElementTop,
  stubReducedMotion,
} from "./test-utils";

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

const BELOW_THE_FOLD = 2000;
const animateMock = vi.mocked(animate);

beforeEach(() => {
  installFakeIntersectionObserver();
  stubReducedMotion(false);
  stubElementTop(0);
  animateMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The `onComplete` handler passed to the n-th animate() call. */
function onCompleteOf(callIndex: number) {
  const options = animateMock.mock.calls[callIndex]?.[2] as { onComplete?: () => void } | undefined;
  return options?.onComplete;
}

describe("prefersReducedMotion", () => {
  it("reads the media query", () => {
    stubReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    stubReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("is false when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("Reveal", () => {
  it("server-renders fully visible content: nothing is hidden without JS", () => {
    const html = renderToString(
      <Reveal className="card">
        <p>Visible without JavaScript</p>
      </Reveal>,
    );
    expect(html).toContain("Visible without JavaScript");
    expect(html).not.toMatch(/style=|opacity|hidden/);
  });

  it("leaves content that is already on screen alone", () => {
    render(<Reveal data-testid="r">Hero-adjacent</Reveal>);
    expect(screen.getByTestId("r")).not.toHaveAttribute("style");
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(animateMock).not.toHaveBeenCalled();
  });

  it("hides below-the-fold content after mount, then fades it in and up 12px once on scroll", () => {
    stubElementTop(BELOW_THE_FOLD);
    const { unmount } = render(
      <Reveal data-testid="below" delay={0.2}>
        Below
      </Reveal>,
    );
    const below = screen.getByTestId("below");
    expect(below.style.opacity).toBe("0");
    expect(below.style.transform).toBe("translateY(12px)");
    expect(animateMock).not.toHaveBeenCalled();

    FakeIntersectionObserver.instances.at(-1)?.trigger(true);

    expect(animateMock).toHaveBeenCalledTimes(1);
    const [target, keyframes, options] = animateMock.mock.calls[0] as unknown as [
      Element,
      { opacity: number[]; y: number[] },
      { duration: number; delay: number },
    ];
    expect(target).toBe(below);
    expect(keyframes).toEqual({ opacity: [0, 1], y: [12, 0] });
    expect(options.duration).toBeLessThanOrEqual(0.6);
    expect(options.delay).toBe(0.2);

    onCompleteOf(0)?.();
    expect(below.style.opacity).toBe("");
    expect(below.style.transform).toBe("");
    unmount();
  });

  it("restores visibility if it unmounts before being revealed", () => {
    stubElementTop(BELOW_THE_FOLD);
    const { unmount } = render(<Reveal data-testid="r">Below</Reveal>);
    const element = screen.getByTestId("r");
    expect(element.style.opacity).toBe("0");
    unmount();
    expect(element.style.opacity).toBe("");
    expect(FakeIntersectionObserver.instances.at(-1)?.disconnected).toBe(true);
  });

  it("does not hide or animate anything under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    stubElementTop(BELOW_THE_FOLD);
    render(<Reveal data-testid="r">Below</Reveal>);
    expect(screen.getByTestId("r")).not.toHaveAttribute("style");
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(animateMock).not.toHaveBeenCalled();
  });

  it("does not hide anything when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    stubElementTop(BELOW_THE_FOLD);
    render(<Reveal data-testid="r">Below</Reveal>);
    expect(screen.getByTestId("r")).not.toHaveAttribute("style");
  });

  it("reveals everything immediately when printing", () => {
    stubElementTop(BELOW_THE_FOLD);
    render(<Reveal data-testid="r">Below</Reveal>);
    expect(screen.getByTestId("r").style.opacity).toBe("0");
    window.dispatchEvent(new Event("beforeprint"));
    expect(screen.getByTestId("r").style.opacity).toBe("");
  });

  it("renders as the requested element and keeps its props", () => {
    render(
      <Reveal as="section" className="band" aria-label="Band">
        x
      </Reveal>,
    );
    const section = screen.getByRole("region", { name: "Band" });
    expect(section.tagName).toBe("SECTION");
    expect(section).toHaveClass("band");
  });
});

describe("RevealStagger", () => {
  function List({ count = 3 }: { count?: number }) {
    return (
      <RevealStagger as="ul" data-testid="list">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>Item {i}</li>
        ))}
      </RevealStagger>
    );
  }

  it("keeps list semantics and server-renders visible items", () => {
    const html = renderToString(<List />);
    expect(html.startsWith("<ul")).toBe(true);
    expect(html).not.toMatch(/style=|opacity/);
    render(<List />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("hides each item below the fold and reveals them one after another once the list is in view", () => {
    stubElementTop(BELOW_THE_FOLD);
    render(<List />);
    for (const item of screen.getAllByRole("listitem")) {
      expect(item.style.opacity).toBe("0");
    }

    FakeIntersectionObserver.instances.at(-1)?.trigger(true);

    expect(animateMock).toHaveBeenCalledTimes(3);
    const delays = animateMock.mock.calls.map((call) => (call[2] as { delay: number }).delay);
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBeCloseTo(0.06);
    expect(delays[2]).toBeCloseTo(0.12);
  });

  it("caps the total stagger for long lists", () => {
    stubElementTop(BELOW_THE_FOLD);
    render(<List count={40} />);
    FakeIntersectionObserver.instances.at(-1)?.trigger(true);
    const delays = animateMock.mock.calls.map((call) => (call[2] as { delay: number }).delay);
    expect(Math.max(...delays)).toBeLessThanOrEqual(0.6);
  });

  it("does nothing under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    stubElementTop(BELOW_THE_FOLD);
    render(<List />);
    for (const item of screen.getAllByRole("listitem")) {
      expect(item).not.toHaveAttribute("style");
    }
    expect(animateMock).not.toHaveBeenCalled();
  });

  it("does not hide items that are already on screen", () => {
    render(<List />);
    for (const item of screen.getAllByRole("listitem")) {
      expect(item).not.toHaveAttribute("style");
    }
  });
});
