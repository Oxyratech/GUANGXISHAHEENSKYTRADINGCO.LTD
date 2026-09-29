// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "./headers";

const production = { isDevelopment: false };
const development = { isDevelopment: true };

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(";").map((part) => {
      const [name, ...sources] = part.trim().split(/\s+/);
      return [name, sources] as const;
    }),
  );
}

describe("buildContentSecurityPolicy", () => {
  it("keeps the strict directives that do not depend on inline scripts", () => {
    const csp = directives(buildContentSecurityPolicy(production));

    expect(csp.get("default-src")).toEqual(["'self'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'self'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(csp.get("font-src")).toEqual(["'self'"]);
    expect(csp.get("connect-src")).toEqual(["'self'"]);
  });

  it("allows inline scripts (static CSP) but never eval in production", () => {
    const script = directives(buildContentSecurityPolicy(production)).get("script-src")!;

    expect(script).toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("allows eval and websockets only in development", () => {
    const csp = directives(buildContentSecurityPolicy(development));

    expect(csp.get("script-src")).toContain("'unsafe-eval'");
    expect(csp.get("connect-src")).toEqual(expect.arrayContaining(["ws:", "wss:"]));
  });

  it("adds the Plausible origin only when a domain is configured", () => {
    const without = directives(buildContentSecurityPolicy(production));
    const withDomain = directives(
      buildContentSecurityPolicy({ ...production, plausibleDomain: "example.com" }),
    );

    expect(without.get("connect-src")).not.toContain("https://plausible.io");
    expect(without.get("script-src")).not.toContain("https://plausible.io");
    expect(withDomain.get("connect-src")).toContain("https://plausible.io");
    expect(withDomain.get("script-src")).toContain("https://plausible.io");
  });

  it("never contains a wildcard source", () => {
    expect(
      buildContentSecurityPolicy({ ...production, plausibleDomain: "example.com" }),
    ).not.toMatch(/\s\*(\s|;|$)/);
  });
});

describe("buildSecurityHeaders", () => {
  const byKey = (source: string, options = production) =>
    new Map(
      buildSecurityHeaders(options)
        .find((entry) => entry.source === source)!
        .headers.map((h) => [h.key, h.value]),
    );

  it("sets the baseline headers for every path", () => {
    const headers = byKey("/:path*");

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    for (const feature of ["camera", "microphone", "geolocation", "payment", "usb"]) {
      expect(headers.get("Permissions-Policy")).toContain(`${feature}=()`);
    }
  });

  it("sends HSTS in production only", () => {
    expect(byKey("/:path*", production).get("Strict-Transport-Security")).toMatch(
      /^max-age=\d+; includeSubDomains$/,
    );
    expect(byKey("/:path*", development).has("Strict-Transport-Security")).toBe(false);
  });

  it("keeps the admin area out of indexes and caches", () => {
    const headers = byKey("/admin/:path*");

    expect(headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(headers.get("Cache-Control")).toBe("no-store");
  });

  it("locks user-supplied file responses down completely and lists them after the baseline", () => {
    const entries = buildSecurityHeaders(production);
    const baselineIndex = entries.findIndex((entry) => entry.source === "/:path*");

    for (const source of ["/media/:path*", "/files/:path*"]) {
      expect(entries.findIndex((entry) => entry.source === source)).toBeGreaterThan(baselineIndex);
      expect(byKey(source).get("Content-Security-Policy")).toContain("default-src 'none'");
      expect(byKey(source).get("Content-Security-Policy")).toContain("sandbox");
    }
  });
});

describe("next.config.ts", () => {
  it("wires the security headers", async () => {
    const entries = await nextConfig.headers!();

    expect(entries.map((entry) => entry.source)).toEqual(
      expect.arrayContaining(["/:path*", "/admin/:path*", "/media/:path*", "/files/:path*"]),
    );
    expect(entries[0].headers.map((h) => h.key)).toContain("Content-Security-Policy");
  });
});
