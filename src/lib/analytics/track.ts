import { isAnalyticsActive } from "./config";
import { sanitizeProps, type AnalyticsEventName, type AnalyticsProps } from "./events";

type PlausibleOptions = { props?: Record<string, string | number | boolean> };
type PlausibleFunction = ((event: string, options?: PlausibleOptions) => void) & {
  /** Calls made before the script has loaded; the script replays them. */
  q?: unknown[][];
};

declare global {
  interface Window {
    plausible?: PlausibleFunction;
  }
}

/**
 * Plausible's own loader stub: calls made before script.js has loaded are queued on `plausible.q`
 * and replayed by the script, so an event fired right after hydration is not lost.
 */
function plausibleQueue(): PlausibleFunction {
  if (!window.plausible) {
    const queue: PlausibleFunction = (...args) => {
      (queue.q ??= []).push(args);
    };
    window.plausible = queue;
  }
  return window.plausible;
}

/**
 * Records one event. A no-op on the server, when no Plausible domain is configured and when the
 * visitor has Do Not Track (or Global Privacy Control) on: nothing is sent, queued or stored.
 * Properties are reduced to the allow-list in events.ts.
 */
export function trackEvent(name: AnalyticsEventName, props?: AnalyticsProps): void {
  if (typeof window === "undefined" || !isAnalyticsActive()) return;
  const clean = sanitizeProps(props);
  plausibleQueue()(name, Object.keys(clean).length > 0 ? { props: clean } : undefined);
}
