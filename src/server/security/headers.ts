// Imported by next.config.ts, which runs before the app is compiled: keep this file free of
// aliases (`@/`), `server-only` and any runtime dependency.

export interface HeaderEntry {
  source: string;
  headers: { key: string; value: string }[];
}

export interface SecurityHeaderOptions {
  /** True for `next dev`: allows the eval and websocket that React's dev tooling and HMR need. */
  isDevelopment: boolean;
  /** NEXT_PUBLIC_PLAUSIBLE_DOMAIN. When set, the Plausible origin joins script-src and connect-src. */
  plausibleDomain?: string;
}

const PLAUSIBLE_ORIGIN = "https://plausible.io";

/**
 * Static Content-Security-Policy (see docs/SECURITY.md, "CSP trade-off").
 *
 * `script-src 'unsafe-inline'` is needed because Next.js injects inline bootstrap and RSC payload
 * scripts. A per-request nonce would remove it but forces dynamic rendering of every page, which
 * would cost the marketing pages their static generation and CDN caching. Everything else is
 * strict: no plugins, no framing, no foreign bases or form targets, and only same-origin
 * subresources apart from the optional analytics origin.
 */
export function buildContentSecurityPolicy({
  isDevelopment,
  plausibleDomain,
}: SecurityHeaderOptions): string {
  const analytics = plausibleDomain ? [PLAUSIBLE_ORIGIN] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
      ...analytics,
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(isDevelopment ? ["ws:", "wss:"] : []), ...analytics],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

/**
 * Policy for user-supplied files served from /media and /files. They are inert downloads or
 * images, so they get no capabilities at all (same approach as GitHub's raw file host).
 */
const FILE_CONTENT_SECURITY_POLICY = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

const PERMISSIONS_POLICY = ["camera", "microphone", "geolocation", "payment", "usb"]
  .map((feature) => `${feature}=()`)
  .join(", ");

/** Value for next.config.ts `headers()`. Later entries override earlier ones for the same key. */
export function buildSecurityHeaders(options: SecurityHeaderOptions): HeaderEntry[] {
  const baseline = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    // Browsers ignore HSTS over plain HTTP; sending it only in production keeps localhost usable.
    ...(options.isDevelopment
      ? []
      : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
  ];

  return [
    { source: "/:path*", headers: baseline },
    {
      source: "/admin/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Cache-Control", value: "no-store" },
      ],
    },
    {
      source: "/media/:path*",
      headers: [{ key: "Content-Security-Policy", value: FILE_CONTENT_SECURITY_POLICY }],
    },
    {
      source: "/files/:path*",
      headers: [{ key: "Content-Security-Policy", value: FILE_CONTENT_SECURITY_POLICY }],
    },
  ];
}
