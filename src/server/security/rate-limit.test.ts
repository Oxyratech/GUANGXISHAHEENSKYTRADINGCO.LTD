// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  deleteMany: vi.fn(),
  getDb: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/server/env", () => ({ getAuthSecret: () => "k".repeat(48) }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: mocks.warn, debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

async function loadModule() {
  vi.resetModules();
  return import("./rate-limit");
}

const DAY = new Date("2026-06-18T10:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(DAY);
  delete (globalThis as { __shaheenRateLimitMemory?: unknown }).__shaheenRateLimitMemory;
  delete (globalThis as { __shaheenRateLimitSweptAt?: unknown }).__shaheenRateLimitSweptAt;
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.deleteMany.mockResolvedValue({ count: 0 });
  mocks.getDb.mockReturnValue({
    $queryRaw: mocks.queryRaw,
    rateLimitCounter: { deleteMany: mocks.deleteMany },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimitKey", () => {
  it("is deterministic, scoped and never contains the raw parts", async () => {
    const { rateLimitKey } = await loadModule();
    const key = rateLimitKey("inquiry", "203.0.113.7", "buyer@example.com");

    expect(key).toBe(rateLimitKey("inquiry", "203.0.113.7", "buyer@example.com"));
    expect(key).toMatch(/^inquiry:[0-9a-f]{48}$/);
    expect(key).not.toContain("203");
    expect(key).not.toContain("buyer");
    expect(key.length).toBeLessThanOrEqual(200);
  });

  it("separates scopes and part boundaries", async () => {
    const { rateLimitKey } = await loadModule();

    expect(rateLimitKey("inquiry", "a")).not.toBe(rateLimitKey("contact", "a"));
    expect(rateLimitKey("inquiry", "ab", "c")).not.toBe(rateLimitKey("inquiry", "a", "bc"));
  });
});

describe("RATE_LIMITS", () => {
  it("holds the documented presets", async () => {
    const { RATE_LIMITS } = await loadModule();

    expect(RATE_LIMITS.inquiry).toEqual({ limit: 5, windowSeconds: 3600 });
    expect(RATE_LIMITS.contact).toEqual({ limit: 5, windowSeconds: 3600 });
    expect(RATE_LIMITS.login).toEqual({ limit: 10, windowSeconds: 900 });
    expect(RATE_LIMITS.upload.limit).toBeGreaterThan(0);
  });
});

describe("rateLimit (database path)", () => {
  it("uses one parameterised MERGE ... WITH (HOLDLOCK) and maps the returned counter", async () => {
    const resetAt = new Date(DAY.getTime() + 3600_000);
    mocks.queryRaw.mockResolvedValue([{ count: 3, resetAt: resetAt.toISOString() }]);
    const { rateLimit } = await loadModule();

    const result = await rateLimit({ key: "k1", limit: 5, windowSeconds: 3600 });

    expect(result).toEqual({ allowed: true, remaining: 2, resetAt });
    const [strings, ...values] = mocks.queryRaw.mock.calls[0] as [string[], ...unknown[]];
    const sql = strings.join("?");
    expect(sql).toContain("MERGE");
    expect(sql).toContain("HOLDLOCK");
    expect(values).toContain("k1");
    expect(sql).not.toContain("k1");
  });

  it("blocks once the count exceeds the limit", async () => {
    const resetAt = new Date(DAY.getTime() + 60_000);
    mocks.queryRaw
      .mockResolvedValueOnce([{ count: 5, resetAt }])
      .mockResolvedValueOnce([{ count: 6n, resetAt }]);
    const { rateLimit } = await loadModule();

    expect(await rateLimit({ key: "k", limit: 5, windowSeconds: 60 })).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(await rateLimit({ key: "k", limit: 5, windowSeconds: 60 })).toMatchObject({
      allowed: false,
      remaining: 0,
    });
    expect(mocks.warn).not.toHaveBeenCalled();
  });

  it("deletes expired rows opportunistically, at most once per interval", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(DAY.getTime() + 1000) }]);
    const { rateLimit } = await loadModule();

    await rateLimit({ key: "a", limit: 5, windowSeconds: 60 });
    await rateLimit({ key: "b", limit: 5, windowSeconds: 60 });
    expect(mocks.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.deleteMany.mock.calls[0][0].where.resetAt.lt).toBeInstanceOf(Date);

    vi.setSystemTime(new Date(DAY.getTime() + 6 * 60_000));
    await rateLimit({ key: "c", limit: 5, windowSeconds: 60 });
    expect(mocks.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("a failing cleanup never affects the result", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(DAY.getTime() + 1000) }]);
    mocks.deleteMany.mockRejectedValue(new Error("boom"));
    const { rateLimit } = await loadModule();

    await expect(rateLimit({ key: "a", limit: 5, windowSeconds: 60 })).resolves.toMatchObject({
      allowed: true,
    });
    expect(mocks.warn).not.toHaveBeenCalled();
  });
});

describe("rateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    mocks.queryRaw.mockRejectedValue(Object.assign(new Error("cannot reach"), { code: "P1001" }));
  });

  it("enforces the limit per key and reports remaining hits", async () => {
    const { rateLimit } = await loadModule();
    const opts = { key: "login:x", limit: 3, windowSeconds: 900 };

    const results = [];
    for (let i = 0; i < 5; i++) results.push(await rateLimit(opts));

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0, 0]);
    expect(results[0].resetAt.getTime()).toBe(DAY.getTime() + 900_000);
    // Another key has its own budget.
    expect((await rateLimit({ ...opts, key: "login:y" })).allowed).toBe(true);
  });

  it("starts a fresh window once the previous one has ended", async () => {
    const { rateLimit } = await loadModule();
    const opts = { key: "contact:z", limit: 1, windowSeconds: 60 };

    expect((await rateLimit(opts)).allowed).toBe(true);
    expect((await rateLimit(opts)).allowed).toBe(false);

    vi.setSystemTime(new Date(DAY.getTime() + 59_000));
    expect((await rateLimit(opts)).allowed).toBe(false);

    vi.setSystemTime(new Date(DAY.getTime() + 61_000));
    const next = await rateLimit(opts);
    expect(next.allowed).toBe(true);
    expect(next.resetAt.getTime()).toBe(DAY.getTime() + 61_000 + 60_000);
  });

  it("falls back when the database is not configured at all", async () => {
    mocks.getDb.mockImplementation(() => {
      throw new Error("DATABASE_URL is not configured");
    });
    const { rateLimit } = await loadModule();

    const opts = { key: "inquiry:q", limit: 1, windowSeconds: 60 };
    expect((await rateLimit(opts)).allowed).toBe(true);
    expect((await rateLimit(opts)).allowed).toBe(false);
  });

  it("logs the fallback once per outage and again after recovery", async () => {
    const { rateLimit } = await loadModule();
    const opts = { key: "k", limit: 100, windowSeconds: 60 };

    await rateLimit(opts);
    await rateLimit(opts);
    await rateLimit(opts);
    expect(mocks.warn).toHaveBeenCalledTimes(1);

    mocks.queryRaw.mockResolvedValueOnce([{ count: 1, resetAt: new Date(DAY.getTime() + 1000) }]);
    await rateLimit(opts);
    mocks.queryRaw.mockRejectedValue(new Error("down again"));
    await rateLimit(opts);
    expect(mocks.warn).toHaveBeenCalledTimes(2);
  });

  it("bounds memory by evicting the oldest entries under a flood of distinct keys", async () => {
    const { rateLimit } = await loadModule();

    for (let i = 0; i < 10_050; i++)
      await rateLimit({ key: `flood:${i}`, limit: 5, windowSeconds: 3600 });

    const store = (globalThis as { __shaheenRateLimitMemory?: Map<string, unknown> })
      .__shaheenRateLimitMemory!;
    expect(store.size).toBeLessThanOrEqual(10_000);
    expect(store.has("flood:10049")).toBe(true);
    expect(store.has("flood:0")).toBe(false);
  });
});
