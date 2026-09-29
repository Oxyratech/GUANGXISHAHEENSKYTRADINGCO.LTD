import "server-only";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function firstValue(header: string | null): string | null {
  const value = header?.split(",")[0]?.trim().toLowerCase();
  return value || null;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * CSRF defence for route handlers that change state (Server Actions carry Next's own Origin/Host
 * check). A browser always sends Origin on cross-site POSTs; Referer is the fallback for older
 * clients. A request with neither is refused: legitimate form posts from our pages have one.
 *
 * The comparison is against the host the visitor actually used, so it works behind a proxy that
 * rewrites Host (x-forwarded-host wins over Host).
 *
 * @throws ForbiddenError when the request does not provably come from this site.
 */
export function assertSameOrigin(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") {
    throw new ForbiddenError("Cross-site request refused");
  }

  const origin = request.headers.get("origin");
  const claimedHost = origin !== null ? hostOf(origin) : hostOf(request.headers.get("referer"));
  if (!claimedHost) throw new ForbiddenError("Missing or invalid Origin");

  const expectedHost =
    firstValue(request.headers.get("x-forwarded-host")) ??
    firstValue(request.headers.get("host")) ??
    new URL(request.url).host.toLowerCase();

  if (claimedHost !== expectedHost) throw new ForbiddenError("Origin does not match host");
}
