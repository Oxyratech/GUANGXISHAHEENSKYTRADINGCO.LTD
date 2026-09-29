// Shared helpers for component tests in components/{ui,layout,motion}. Not imported by app code.
import type { ComponentProps } from "react";

/**
 * Stand-in for "@/i18n/navigation": links that went through the locale-aware Link are prefixed
 * with /en and marked, so tests can tell them apart from plain anchors.
 *   vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
 */
export const navigationMock = {
  Link: ({ href, ...props }: ComponentProps<"a">) => (
    <a {...props} href={`/en${href}`} data-locale-link="true" />
  ),
};

/** jsdom lacks what Radix popper/pointer based components (menu, tooltip, toast) call. */
export function installDomPolyfills() {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  window.HTMLElement.prototype.hasPointerCapture ??= () => false;
  window.HTMLElement.prototype.releasePointerCapture ??= () => {};
}
