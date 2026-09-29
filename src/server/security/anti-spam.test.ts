// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const secret = vi.hoisted(() => ({ value: "a".repeat(48) }));
const mocks = vi.hoisted(() => ({ rateLimit: vi.fn(), getRequestContext: vi.fn() }));

vi.mock("@/server/env", () => ({ getAuthSecret: () => secret.value }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("./rate-limit", () => ({
  RATE_LIMITS: {
    inquiry: { limit: 5, windowSeconds: 3600 },
    contact: { limit: 4, windowSeconds: 1800 },
  },
  rateLimit: mocks.rateLimit,
  rateLimitKey: (scope: string, ...parts: string[]) => `${scope}|${parts.join("|")}`,
}));

import {
  FORM_TOKEN_FIELD,
  HONEYPOT_FIELD,
  createFormToken,
  guardPublicSubmission,
  isHoneypotTripped,
  verifyFormToken,
} from "./anti-spam";

const NOW = new Date("2026-06-18T10:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  secret.value = "a".repeat(48);
  mocks.rateLimit.mockReset();
  mocks.getRequestContext.mockReset();
  mocks.getRequestContext.mockResolvedValue({ ip: "203.0.113.7", ipHash: "iphash" });
  mocks.rateLimit.mockResolvedValue({
    allowed: true,
    remaining: 4,
    resetAt: new Date(NOW.getTime() + 60_000),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// A different last character every time, so the test cannot pass by accident on a 1-in-16 draw.
const flipLastCharacter = (value: string) => value.slice(0, -1) + (value.endsWith("0") ? "1" : "0");

function ageBy(seconds: number) {
  vi.setSystemTime(new Date(NOW.getTime() + seconds * 1000));
}

describe("form tokens", () => {
  it("exposes the agreed field names", () => {
    expect(HONEYPOT_FIELD).toBe("website_url");
    expect(FORM_TOKEN_FIELD).toBe("form_token");
  });

  it("accepts a fresh token after the minimum fill time", () => {
    const token = createFormToken();
    ageBy(10);
    expect(verifyFormToken(token)).toEqual({ ok: true });
  });

  it("produces a different token each time", () => {
    expect(createFormToken()).not.toBe(createFormToken());
  });

  it("rejects a token that is submitted too fast", () => {
    const token = createFormToken();
    ageBy(1);
    expect(verifyFormToken(token)).toEqual({ ok: false, reason: "too_fast" });
  });

  it("accepts exactly at the minimum age and rejects after the maximum age", () => {
    const token = createFormToken();
    ageBy(3);
    expect(verifyFormToken(token)).toEqual({ ok: true });
    ageBy(2 * 60 * 60);
    expect(verifyFormToken(token)).toEqual({ ok: true });
    ageBy(2 * 60 * 60 + 1);
    expect(verifyFormToken(token)).toEqual({ ok: false, reason: "expired" });
  });

  it("honours custom bounds", () => {
    const token = createFormToken();
    ageBy(20);
    expect(verifyFormToken(token, { minSeconds: 30 })).toEqual({ ok: false, reason: "too_fast" });
    expect(verifyFormToken(token, { maxSeconds: 10 })).toEqual({ ok: false, reason: "expired" });
  });

  it("reports missing tokens", () => {
    expect(verifyFormToken(undefined)).toEqual({ ok: false, reason: "missing" });
    expect(verifyFormToken(null)).toEqual({ ok: false, reason: "missing" });
    expect(verifyFormToken("")).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects tampered timestamps, nonces and signatures", () => {
    const token = createFormToken();
    const [issuedAt, nonce, sig] = token.split(".");
    ageBy(10);

    // Backdating the timestamp to look old enough must fail the signature.
    expect(verifyFormToken(`${Number(issuedAt) - 100}.${nonce}.${sig}`)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(verifyFormToken(`${issuedAt}.${nonce}x.${sig}`)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(verifyFormToken(`${issuedAt}.${nonce}.${flipLastCharacter(sig)}`)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(verifyFormToken(`${issuedAt}.${nonce}.`)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["garbage", "a.b", "1.2.3.4", "abc.def.ghi", "..", `${"9".repeat(20)}.n.s`]) {
      expect(verifyFormToken(bad)).toEqual({ ok: false, reason: "invalid" });
    }
  });

  it("rejects tokens minted under a different secret", () => {
    const token = createFormToken();
    secret.value = "b".repeat(48);
    ageBy(10);
    expect(verifyFormToken(token)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("isHoneypotTripped", () => {
  it("is false for empty values", () => {
    for (const value of [undefined, null, "", "   ", "\n\t"])
      expect(isHoneypotTripped(value)).toBe(false);
  });

  it("is true for any content", () => {
    for (const value of ["http://spam.example", "x", " 0 ", 0, false, {}])
      expect(isHoneypotTripped(value)).toBe(true);
  });
});

describe("guardPublicSubmission", () => {
  function form(fields: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    return formData;
  }

  function validForm(extra: Record<string, string> = {}) {
    const token = createFormToken();
    ageBy(10);
    return form({ [FORM_TOKEN_FIELD]: token, ...extra });
  }

  it("passes a genuine submission and rate-limits by IP hash and email hash", async () => {
    const result = await guardPublicSubmission({
      formData: validForm(),
      scope: "inquiry",
      email: "  Buyer@Example.com ",
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.rateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(1, {
      key: "inquiry:ip|iphash",
      limit: 5,
      windowSeconds: 3600,
    });
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, {
      key: "inquiry:email|buyer@example.com",
      limit: 5,
      windowSeconds: 3600,
    });
  });

  it("uses the scope's own preset and skips the email counter when there is no email", async () => {
    await guardPublicSubmission({ formData: validForm(), scope: "contact" });

    expect(mocks.rateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.rateLimit).toHaveBeenCalledWith({
      key: "contact:ip|iphash",
      limit: 4,
      windowSeconds: 1800,
    });
  });

  it("flags a tripped honeypot as spam before doing any other work", async () => {
    const result = await guardPublicSubmission({
      formData: validForm({ [HONEYPOT_FIELD]: "http://spam.example" }),
      scope: "inquiry",
    });

    expect(result).toEqual({ ok: false, code: "spam" });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.getRequestContext).not.toHaveBeenCalled();
  });

  it("maps token failures to too_fast / expired without consuming rate limit", async () => {
    const fresh = form({ [FORM_TOKEN_FIELD]: createFormToken() });
    await expect(guardPublicSubmission({ formData: fresh, scope: "inquiry" })).resolves.toEqual({
      ok: false,
      code: "too_fast",
    });

    ageBy(3 * 60 * 60);
    await expect(guardPublicSubmission({ formData: fresh, scope: "inquiry" })).resolves.toEqual({
      ok: false,
      code: "expired",
    });

    await expect(guardPublicSubmission({ formData: form({}), scope: "inquiry" })).resolves.toEqual({
      ok: false,
      code: "expired",
    });
    await expect(
      guardPublicSubmission({
        formData: form({ [FORM_TOKEN_FIELD]: "forged.token.value" }),
        scope: "inquiry",
      }),
    ).resolves.toEqual({ ok: false, code: "expired" });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
  });

  it("returns rate_limited with retryAfterSeconds when the IP budget is spent", async () => {
    mocks.rateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: new Date(NOW.getTime() + 10_000 + 90_500),
    });

    const result = await guardPublicSubmission({
      formData: validForm(),
      scope: "inquiry",
      email: "a@b.co",
    });

    expect(result).toEqual({ ok: false, code: "rate_limited", retryAfterSeconds: 91 });
    expect(mocks.rateLimit).toHaveBeenCalledTimes(1);
  });

  it("returns rate_limited when only the email budget is spent", async () => {
    mocks.rateLimit
      .mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        resetAt: new Date(NOW.getTime() + 60_000),
      })
      .mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: new Date(NOW.getTime() + 10_000 + 30_000),
      });

    const result = await guardPublicSubmission({
      formData: validForm(),
      scope: "contact",
      email: "a@b.co",
    });

    expect(result).toEqual({ ok: false, code: "rate_limited", retryAfterSeconds: 30 });
  });

  it("always reports at least one second to wait", async () => {
    mocks.rateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: new Date(NOW.getTime()),
    });

    const result = await guardPublicSubmission({ formData: validForm(), scope: "inquiry" });

    expect(result).toEqual({ ok: false, code: "rate_limited", retryAfterSeconds: 1 });
  });
});
