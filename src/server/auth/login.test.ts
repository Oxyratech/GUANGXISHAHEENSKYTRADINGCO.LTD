// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = { user: { findUnique: vi.fn(), update: vi.fn() } };
  return {
    db,
    getDb: vi.fn(() => db),
    rateLimit: vi.fn(),
    verifyPassword: vi.fn(),
    verifyPasswordDummy: vi.fn(),
    writeAudit: vi.fn(),
  };
});

vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));
vi.mock("@/server/env", () => ({ getAuthSecret: () => "k".repeat(48) }));
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/security/password", () => ({
  verifyPassword: mocks.verifyPassword,
  verifyPasswordDummy: mocks.verifyPasswordDummy,
}));
vi.mock("@/server/security/rate-limit", () => ({
  RATE_LIMITS: { login: { limit: 10, windowSeconds: 900 } },
  rateLimit: mocks.rateLimit,
  rateLimitKey: (scope: string, ...parts: string[]) => `${scope}|${parts.join("|")}`,
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  redact: (value: unknown) => value,
}));

import { authenticate } from "./login";

const NOW = new Date("2026-06-18T12:00:00.000Z");
const CTX = { ipHash: "i".repeat(64), userAgent: "UA" };
const PASSWORD = "Sup3r-secret-Passw0rd!";

const ALLOWED = { allowed: true, remaining: 9, resetAt: new Date(NOW.getTime() + 900_000) };
const BLOCKED = { allowed: false, remaining: 0, resetAt: new Date(NOW.getTime() + 900_000) };

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "admin@example.com",
    passwordHash: "scrypt$stored",
    isActive: true,
    lockedUntil: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  Object.values(mocks.db.user).forEach((fn) => fn.mockReset());
  mocks.rateLimit.mockReset().mockResolvedValue(ALLOWED);
  mocks.verifyPassword.mockReset().mockResolvedValue(true);
  mocks.verifyPasswordDummy.mockReset().mockResolvedValue(false);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.db.user.update.mockResolvedValue({ failedLoginCount: 1 });
});

describe("rate limiting", () => {
  it("counts attempts per IP hash and per email hash using the login preset", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null);

    await authenticate({ email: "  Admin@Example.com ", password: PASSWORD, ctx: CTX });

    expect(mocks.rateLimit).toHaveBeenNthCalledWith(1, {
      key: `login:ip|${CTX.ipHash}`,
      limit: 10,
      windowSeconds: 900,
    });
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, {
      key: "login:email|admin@example.com",
      limit: 10,
      windowSeconds: 900,
    });
  });

  it("stops at the IP limit without consuming the email budget or reading the database", async () => {
    mocks.rateLimit.mockResolvedValueOnce(BLOCKED);

    await expect(
      authenticate({ email: "admin@example.com", password: PASSWORD, ctx: CTX }),
    ).resolves.toEqual({
      ok: false,
      reason: "rate_limited",
    });
    expect(mocks.rateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("stops at the email limit", async () => {
    mocks.rateLimit.mockResolvedValueOnce(ALLOWED).mockResolvedValueOnce(BLOCKED);

    await expect(
      authenticate({ email: "admin@example.com", password: PASSWORD, ctx: CTX }),
    ).resolves.toEqual({
      ok: false,
      reason: "rate_limited",
    });
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("uniform failure behaviour", () => {
  it("unknown email: invalid_credentials, dummy verification, nothing audited or written", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null);

    const result = await authenticate({
      email: "nobody@example.com",
      password: PASSWORD,
      ctx: CTX,
    });

    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    expect(mocks.verifyPasswordDummy).toHaveBeenCalledTimes(1);
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("inactive account: reported exactly like an unknown email", async () => {
    mocks.db.user.findUnique.mockResolvedValue(user({ isActive: false }));

    const result = await authenticate({ email: "admin@example.com", password: PASSWORD, ctx: CTX });

    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    expect(mocks.verifyPasswordDummy).toHaveBeenCalledTimes(1);
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("wrong password on a real account and an unknown email return identical results", async () => {
    mocks.db.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await authenticate({
      email: "nobody@example.com",
      password: PASSWORD,
      ctx: CTX,
    });

    mocks.db.user.findUnique.mockResolvedValueOnce(user());
    mocks.verifyPassword.mockResolvedValue(false);
    const wrong = await authenticate({ email: "admin@example.com", password: "nope", ctx: CTX });

    expect(wrong).toEqual(unknown);
  });
});

describe("account lockout", () => {
  it("a locked account is refused without verifying the password (but still spends the time)", async () => {
    mocks.db.user.findUnique.mockResolvedValue(
      user({ lockedUntil: new Date(NOW.getTime() + 60_000) }),
    );

    const result = await authenticate({ email: "admin@example.com", password: PASSWORD, ctx: CTX });

    expect(result).toEqual({ ok: false, reason: "locked" });
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.verifyPasswordDummy).toHaveBeenCalledTimes(1);
  });

  it("an expired lock no longer blocks", async () => {
    mocks.db.user.findUnique.mockResolvedValue(user({ lockedUntil: new Date(NOW.getTime() - 1) }));

    const result = await authenticate({ email: "admin@example.com", password: PASSWORD, ctx: CTX });

    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("a wrong password increments the failure counter and writes an audit row without the password", async () => {
    mocks.db.user.findUnique.mockResolvedValue(user());
    mocks.verifyPassword.mockResolvedValue(false);
    mocks.db.user.update.mockResolvedValue({ failedLoginCount: 2 });

    const result = await authenticate({
      email: "admin@example.com",
      password: "wrong-password-1",
      ctx: CTX,
    });

    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    expect(mocks.db.user.update).toHaveBeenCalledTimes(1);
    expect(mocks.db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.login_failed",
        entityType: "user",
        entityId: "user-1",
        metadata: { failedAttempts: 2 },
        ipHash: CTX.ipHash,
      }),
    );
    expect(JSON.stringify(mocks.writeAudit.mock.calls)).not.toContain("wrong-password-1");
  });

  it("the 5th consecutive failure locks the account for 15 minutes and resets the counter", async () => {
    mocks.db.user.findUnique.mockResolvedValue(user());
    mocks.verifyPassword.mockResolvedValue(false);
    mocks.db.user.update.mockResolvedValueOnce({ failedLoginCount: 5 }).mockResolvedValueOnce({});

    const result = await authenticate({
      email: "admin@example.com",
      password: "wrong-password-1",
      ctx: CTX,
    });

    expect(result).toEqual({ ok: false, reason: "locked" });
    expect(mocks.db.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: "user-1" },
      data: { lockedUntil: new Date(NOW.getTime() + 15 * 60_000), failedLoginCount: 0 },
    });
    expect(mocks.writeAudit).toHaveBeenCalledTimes(1);
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.account_locked",
        entityId: "user-1",
        ipHash: CTX.ipHash,
      }),
    );
  });

  it("the 4th failure does not lock", async () => {
    mocks.db.user.findUnique.mockResolvedValue(user());
    mocks.verifyPassword.mockResolvedValue(false);
    mocks.db.user.update.mockResolvedValue({ failedLoginCount: 4 });

    const result = await authenticate({
      email: "admin@example.com",
      password: "wrong-password-1",
      ctx: CTX,
    });

    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    expect(mocks.db.user.update).toHaveBeenCalledTimes(1);
  });
});

describe("successful sign-in", () => {
  it("normalises the email for lookup, resets counters, stamps lastLoginAt and audits", async () => {
    mocks.db.user.findUnique.mockResolvedValue(user());

    const result = await authenticate({
      email: "  Admin@Example.COM ",
      password: PASSWORD,
      ctx: CTX,
    });

    expect(result).toEqual({ ok: true, userId: "user-1" });
    expect(mocks.db.user.findUnique.mock.calls[0][0].where).toEqual({ email: "admin@example.com" });
    expect(mocks.verifyPassword).toHaveBeenCalledWith(PASSWORD, "scrypt$stored");
    expect(mocks.db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: NOW },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: "user-1", email: "admin@example.com" },
        action: "auth.login_succeeded",
        ipHash: CTX.ipHash,
      }),
    );
    expect(mocks.verifyPasswordDummy).not.toHaveBeenCalled();
  });

  it("never puts the password into audit entries or log fields", async () => {
    mocks.db.user.findUnique.mockResolvedValue(user());

    await authenticate({ email: "admin@example.com", password: PASSWORD, ctx: CTX });

    expect(JSON.stringify(mocks.writeAudit.mock.calls)).not.toContain(PASSWORD);
  });
});

describe("database outage", () => {
  it("surfaces as DatabaseUnavailableError rather than a credentials failure", async () => {
    mocks.db.user.findUnique.mockRejectedValue(Object.assign(new Error("down"), { code: "P1001" }));

    await expect(
      authenticate({ email: "admin@example.com", password: PASSWORD, ctx: CTX }),
    ).rejects.toMatchObject({
      name: "DatabaseUnavailableError",
    });
  });
});
