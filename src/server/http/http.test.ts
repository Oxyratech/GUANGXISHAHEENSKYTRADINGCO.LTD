// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const headerStore = vi.hoisted(() => ({ current: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => headerStore.current }));
vi.mock("@/server/env", () => ({ getAuthSecret: () => "k".repeat(48) }));

import { contentDisposition } from "./content-disposition";
import { ForbiddenError, assertSameOrigin } from "./origin";
import { getClientIp, getRequestContext } from "./request-context";

describe("getClientIp", () => {
  const ip = (init: Record<string, string>) => getClientIp(new Headers(init));

  it("takes the first x-forwarded-for hop", () => {
    expect(ip({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" })).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(ip({ "x-real-ip": "198.51.100.4" })).toBe("198.51.100.4");
    expect(ip({})).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(ip({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.4" })).toBe(
      "203.0.113.7",
    );
  });

  it("understands IPv6 and the port suffixes some platforms add", () => {
    expect(ip({ "x-forwarded-for": "2001:db8::1" })).toBe("2001:db8::1");
    expect(ip({ "x-forwarded-for": "203.0.113.7:51234" })).toBe("203.0.113.7");
    expect(ip({ "x-forwarded-for": "[2001:db8::1]:443" })).toBe("2001:db8::1");
  });

  it("ignores garbage rather than trusting it", () => {
    expect(ip({ "x-forwarded-for": "not-an-ip" })).toBe("unknown");
    expect(ip({ "x-forwarded-for": "<script>", "x-real-ip": "198.51.100.4" })).toBe("198.51.100.4");
    expect(ip({ "x-forwarded-for": "999.1.1.1" })).toBe("unknown");
  });
});

describe("getRequestContext", () => {
  beforeEach(() => {
    headerStore.current = new Headers();
  });

  it("returns the hashed IP, a truncated user agent and the origin", async () => {
    headerStore.current = new Headers({
      "x-forwarded-for": "203.0.113.7",
      "user-agent": "U".repeat(400),
      origin: "https://example.com",
    });

    const ctx = await getRequestContext();

    expect(ctx.ip).toBe("203.0.113.7");
    expect(ctx.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(ctx.userAgent).toHaveLength(255);
    expect(ctx.origin).toBe("https://example.com");
  });

  it("uses null for absent headers", async () => {
    const ctx = await getRequestContext();

    expect(ctx).toMatchObject({ ip: "unknown", userAgent: null, origin: null });
    expect(ctx.ipHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("assertSameOrigin", () => {
  const post = (headers: Record<string, string>, url = "https://www.example.com/api/thing") =>
    new Request(url, { method: "POST", headers });

  it("accepts an Origin that matches the Host", () => {
    expect(() =>
      assertSameOrigin(post({ origin: "https://www.example.com", host: "www.example.com" })),
    ).not.toThrow();
  });

  it("accepts a matching Referer when Origin is absent", () => {
    expect(() =>
      assertSameOrigin(
        post({ referer: "https://www.example.com/en/contact", host: "www.example.com" }),
      ),
    ).not.toThrow();
  });

  it("prefers x-forwarded-host over the (rewritten) Host", () => {
    expect(() =>
      assertSameOrigin(
        post({
          origin: "https://www.example.com",
          host: "internal-app:3000",
          "x-forwarded-host": "www.example.com",
        }),
      ),
    ).not.toThrow();
  });

  it("falls back to the request URL host when no host headers exist", () => {
    // Request() drops a forbidden Host header in some runtimes; the URL is then the source of truth.
    expect(() => assertSameOrigin(post({ origin: "https://www.example.com" }))).not.toThrow();
  });

  it("compares ports too", () => {
    expect(() =>
      assertSameOrigin(post({ origin: "http://localhost:3000", host: "localhost:3000" })),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(post({ origin: "http://localhost:4000", host: "localhost:3000" })),
    ).toThrow(ForbiddenError);
  });

  it.each([
    ["a different origin", { origin: "https://evil.example", host: "www.example.com" }],
    [
      "a look-alike host",
      { origin: "https://www.example.com.evil.example", host: "www.example.com" },
    ],
    ["the literal null origin", { origin: "null", host: "www.example.com" }],
    ["a malformed origin", { origin: "not a url", host: "www.example.com" }],
    ["a cross-origin Referer", { referer: "https://evil.example/x", host: "www.example.com" }],
    ["no Origin and no Referer", { host: "www.example.com" }],
    [
      "a browser-declared cross-site fetch",
      {
        origin: "https://www.example.com",
        host: "www.example.com",
        "sec-fetch-site": "cross-site",
      },
    ],
  ])("rejects %s", (_name, headers) => {
    expect(() => assertSameOrigin(post(headers))).toThrow(ForbiddenError);
  });

  it("does not fall back to Referer when Origin is present but wrong", () => {
    expect(() =>
      assertSameOrigin(
        post({
          origin: "https://evil.example",
          referer: "https://www.example.com/",
          host: "www.example.com",
        }),
      ),
    ).toThrow(ForbiddenError);
  });
});

describe("contentDisposition", () => {
  it("emits an ASCII filename plus an RFC 5987 filename*", () => {
    expect(contentDisposition("attachment", "Quote 2026.pdf")).toBe(
      `attachment; filename="Quote 2026.pdf"; filename*=UTF-8''Quote%202026.pdf`,
    );
  });

  it("keeps non-Latin names intact in filename* only", () => {
    const value = contentDisposition("inline", "报价单.pdf");
    expect(value).toContain(`filename="___.pdf"`);
    expect(value).toContain(`filename*=UTF-8''%E6%8A%A5%E4%BB%B7%E5%8D%95.pdf`);
    expect(value.startsWith("inline;")).toBe(true);
  });

  it("cannot be used to inject header syntax", () => {
    const value = contentDisposition("attachment", `a"; filename="evil.exe\r\nX: y'()*`);

    expect(value).not.toMatch(/[\r\n]/);
    expect(value.match(/"/g)).toHaveLength(2);
    expect(value).toContain("%27%28%29%2A");
  });

  it("never yields an empty filename", () => {
    expect(contentDisposition("attachment", "")).toContain(`filename="download"`);
  });
});
