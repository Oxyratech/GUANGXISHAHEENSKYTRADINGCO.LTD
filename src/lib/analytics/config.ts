/** Plausible's hosted script. Its origin is already allowed by the CSP when a domain is set. */
export const PLAUSIBLE_SCRIPT_SRC = "https://plausible.io/js/script.js";

const HOSTNAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i;

/**
 * The site's Plausible domain, or undefined when analytics are not configured (the normal state
 * until a domain exists). Next.js replaces NEXT_PUBLIC_* at build time, so the literal name below
 * must be written exactly like this.
 */
export function getPlausibleDomain(): string | undefined {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  return domain && HOSTNAME.test(domain) ? domain : undefined;
}

type PrivacySignals = Navigator & {
  msDoNotTrack?: string;
  globalPrivacyControl?: boolean;
};

/**
 * True when the visitor has asked not to be tracked: Do Not Track or Global Privacy Control.
 * Plausible is cookieless and anonymous, but the request is honoured anyway. Without a browser
 * there is no visitor, so it answers true.
 */
export function isTrackingBlocked(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav: PrivacySignals = navigator;
  const doNotTrack =
    nav.doNotTrack ?? (window as Window & { doNotTrack?: string }).doNotTrack ?? nav.msDoNotTrack;
  return doNotTrack === "1" || doNotTrack === "yes" || nav.globalPrivacyControl === true;
}

/** Analytics run only when a domain is configured and the visitor has not opted out. */
export function isAnalyticsActive(): boolean {
  return getPlausibleDomain() !== undefined && !isTrackingBlocked();
}
