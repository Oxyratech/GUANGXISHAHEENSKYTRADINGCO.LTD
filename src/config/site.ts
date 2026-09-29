/**
 * Deployment-level site configuration. The domain is never hard-coded: set NEXT_PUBLIC_SITE_URL.
 * Until a real domain exists the fallback is localhost, and the layout emits `noindex` so a
 * mis-configured deployment can never be indexed under the wrong origin.
 */
const FALLBACK_URL = "http://localhost:3000";

export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    return new URL(raw && raw.length > 0 ? raw : FALLBACK_URL);
  } catch {
    return new URL(FALLBACK_URL);
  }
}

/** True once a real, non-localhost site URL has been configured. */
export function isSiteUrlConfigured(): boolean {
  const { hostname } = getSiteUrl();
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

export const SITE = {
  /** Text-only wordmark, see components/brand. */
  name: "Shaheen Sky",
  themeColor: "#0b1f3a",
} as const;
