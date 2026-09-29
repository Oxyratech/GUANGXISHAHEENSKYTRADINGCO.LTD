// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const warn = vi.hoisted(() => vi.fn());
vi.mock("@/lib/logger", () => ({
  logger: { warn, info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

async function loadEnv() {
  vi.resetModules();
  return import("./env");
}

const KEYS = [
  "AUTH_SECRET",
  "DATABASE_URL",
  "SMTP_PORT",
  "UPLOAD_MAX_BYTES",
  "CONTACT_EMAIL",
  "NEXT_PUBLIC_PLAUSIBLE_DOMAIN",
  "INQUIRY_NOTIFY_EMAIL",
  "SEED_ADMIN_EMAIL",
];

beforeEach(() => {
  warn.mockClear();
  for (const key of KEYS) vi.stubEnv(key, "");
  delete (globalThis as { __shaheenEphemeralSecret?: string }).__shaheenEphemeralSecret;
  delete (globalThis as { __shaheenEphemeralSecretWarned?: boolean })
    .__shaheenEphemeralSecretWarned;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getEnv", () => {
  it("treats empty strings as unset and applies defaults", async () => {
    const { getEnv } = await loadEnv();
    const env = getEnv();

    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.CONTACT_EMAIL).toBeUndefined();
    expect(env.SMTP_PORT).toBe(587);
    expect(env.UPLOAD_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it("parses typed values", async () => {
    vi.stubEnv("SMTP_PORT", "2525");
    vi.stubEnv("UPLOAD_MAX_BYTES", "1048576");
    vi.stubEnv("CONTACT_EMAIL", "hello@example.com");
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    const { getEnv } = await loadEnv();
    const env = getEnv();

    expect(env.SMTP_PORT).toBe(2525);
    expect(env.UPLOAD_MAX_BYTES).toBe(1048576);
    expect(env.CONTACT_EMAIL).toBe("hello@example.com");
    expect(env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN).toBe("example.com");
  });

  it("ignores invalid optional values, warning once by name only", async () => {
    vi.stubEnv("CONTACT_EMAIL", "not-an-email");
    vi.stubEnv("UPLOAD_MAX_BYTES", "999999999");
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "https://bad/path");
    const { getEnv } = await loadEnv();

    const first = getEnv();
    getEnv();

    expect(first.CONTACT_EMAIL).toBeUndefined();
    expect(first.UPLOAD_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(first.NEXT_PUBLIC_PLAUSIBLE_DOMAIN).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledWith("env.invalid_value_ignored", { variable: "CONTACT_EMAIL" });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("not-an-email");
  });

  it("does not throw at import time or when nothing is configured", async () => {
    await expect(loadEnv()).resolves.toBeDefined();
  });
});

describe("getAuthSecret", () => {
  const LONG = "s".repeat(40);

  it("returns the configured secret when it is long enough", async () => {
    vi.stubEnv("AUTH_SECRET", LONG);
    vi.stubEnv("NODE_ENV", "production");
    const { getAuthSecret } = await loadEnv();
    expect(getAuthSecret()).toBe(LONG);
  });

  it("throws in production when the secret is missing or short", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getAuthSecret, ConfigurationError } = await loadEnv();

    expect(() => getAuthSecret()).toThrow(ConfigurationError);

    vi.stubEnv("AUTH_SECRET", "short-secret");
    expect(() => getAuthSecret()).toThrow(/at least 32/);
  });

  it("uses one ephemeral random secret per process outside production and warns once", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { getAuthSecret } = await loadEnv();

    const a = getAuthSecret();
    const b = getAuthSecret();

    expect(a).toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe("env.auth_secret_ephemeral");

    delete (globalThis as { __shaheenEphemeralSecret?: string }).__shaheenEphemeralSecret;
    expect(getAuthSecret()).not.toBe(a);
  });

  it("never falls back to a fixed value", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const first = (await loadEnv()).getAuthSecret();
    delete (globalThis as { __shaheenEphemeralSecret?: string }).__shaheenEphemeralSecret;
    const second = (await loadEnv()).getAuthSecret();
    expect(first).not.toBe(second);
  });
});
