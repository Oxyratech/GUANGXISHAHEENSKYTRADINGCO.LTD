// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const HASH_OF = (token: string) => createHash("sha256").update(token).digest("hex");

const mocks = vi.hoisted(() => {
  const db = {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  const cookieJar = { get: vi.fn(), set: vi.fn() };
  return { db, cookieJar, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookieJar }));
vi.mock("@/server/env", () => ({ getAuthSecret: () => "k".repeat(48) }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  redact: (value: unknown) => value,
}));

const NOW = new Date("2026-06-18T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

async function load() {
  vi.resetModules();
  return import("./session");
}

function sessionRow(
  overrides: Record<string, unknown> = {},
  userOverrides: Record<string, unknown> = {},
) {
  return {
    id: "sess-1",
    expiresAt: new Date(NOW.getTime() + 24 * HOUR),
    lastUsedAt: new Date(NOW.getTime() - 60_000),
    user: {
      id: "user-1",
      email: "admin@example.com",
      name: "Ada Admin",
      isActive: true,
      lockedUntil: null,
      roles: [
        {
          role: {
            key: "SALES_MANAGER",
            permissions: [
              { permission: { key: "inquiry:read" } },
              { permission: { key: "contact:read" } },
            ],
          },
        },
        {
          role: {
            key: "CONTENT_MANAGER",
            permissions: [
              { permission: { key: "inquiry:read" } },
              { permission: { key: "product:write" } },
            ],
          },
        },
      ],
      ...userOverrides,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("NODE_ENV", "test");
  mocks.cookieJar.get.mockReset();
  mocks.cookieJar.set.mockReset();
  Object.values(mocks.db.session).forEach((fn) => fn.mockReset());
  mocks.db.session.deleteMany.mockResolvedValue({ count: 0 });
  mocks.db.session.update.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("SESSION_COOKIE", () => {
  it("is a plain name outside production", async () => {
    expect((await load()).SESSION_COOKIE).toBe("shaheen_session");
  });

  it("uses the __Host- prefix in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await load()).SESSION_COOKIE).toBe("__Host-shaheen_session");
  });
});

describe("createSession", () => {
  it("stores only the SHA-256 of the token and hands the raw token to the browser cookie", async () => {
    mocks.cookieJar.get.mockReturnValue(undefined);
    mocks.db.session.create.mockResolvedValue({ id: "sess-1" });
    const { createSession, SESSION_COOKIE } = await load();

    const result = await createSession("user-1", {
      ipHash: "h".repeat(64),
      userAgent: "UA".repeat(200),
    });

    const [cookieName, token, options] = mocks.cookieJar.set.mock.calls[0];
    expect(cookieName).toBe(SESSION_COOKIE);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const { data } = mocks.db.session.create.mock.calls[0][0];
    expect(data.tokenHash).toBe(HASH_OF(token));
    expect(JSON.stringify(data)).not.toContain(token);
    expect(data).toMatchObject({ userId: "user-1", ipHash: "h".repeat(64), lastUsedAt: NOW });
    expect(data.userAgent).toHaveLength(255);
    expect(data.expiresAt.getTime()).toBe(NOW.getTime() + 7 * 24 * HOUR);

    expect(result).toEqual({ sessionId: "sess-1", expiresAt: data.expiresAt });
    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: data.expiresAt,
    });
  });

  it("sets Secure on the cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.cookieJar.get.mockReturnValue(undefined);
    mocks.db.session.create.mockResolvedValue({ id: "sess-1" });
    const { createSession } = await load();

    await createSession("user-1", { ipHash: "h".repeat(64), userAgent: null });

    expect(mocks.cookieJar.set.mock.calls[0][2]).toMatchObject({
      secure: true,
      httpOnly: true,
      path: "/",
    });
    expect(mocks.cookieJar.set.mock.calls[0][2]).not.toHaveProperty("domain");
  });

  it("mints a new token every time and revokes the session the browser already held", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "old-token" });
    mocks.db.session.create.mockResolvedValue({ id: "sess-2" });
    const { createSession } = await load();

    await createSession("user-1", { ipHash: "h".repeat(64), userAgent: null });
    await createSession("user-1", { ipHash: "h".repeat(64), userAgent: null });

    const tokens = mocks.cookieJar.set.mock.calls.map((call) => call[1]);
    expect(tokens[0]).not.toBe(tokens[1]);
    expect(tokens).not.toContain("old-token");
    expect(mocks.db.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: HASH_OF("old-token") },
    });
  });

  it("purges sessions that are past their absolute expiry", async () => {
    mocks.cookieJar.get.mockReturnValue(undefined);
    mocks.db.session.create.mockResolvedValue({ id: "sess-1" });
    const { createSession } = await load();

    await createSession("user-1", { ipHash: "h".repeat(64), userAgent: null });

    expect(mocks.db.session.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: NOW } } });
  });

  it("surfaces connection failures as DatabaseUnavailableError and sets no cookie", async () => {
    mocks.cookieJar.get.mockReturnValue(undefined);
    mocks.db.session.create.mockRejectedValue(Object.assign(new Error("down"), { code: "P1001" }));
    const { createSession } = await load();

    await expect(
      createSession("user-1", { ipHash: "h".repeat(64), userAgent: null }),
    ).rejects.toMatchObject({
      name: "DatabaseUnavailableError",
    });
    expect(mocks.cookieJar.set).not.toHaveBeenCalled();
  });
});

describe("getSession", () => {
  it("returns null without touching the database when there is no cookie", async () => {
    mocks.cookieJar.get.mockReturnValue(undefined);
    const { getSession } = await load();

    expect(await getSession()).toBeNull();
    expect(mocks.db.session.findUnique).not.toHaveBeenCalled();
  });

  it("ignores absurdly long cookie values", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "x".repeat(5000) });
    const { getSession } = await load();

    expect(await getSession()).toBeNull();
    expect(mocks.db.session.findUnique).not.toHaveBeenCalled();
  });

  it("returns null for a token that matches no session, looking it up by hash only", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    mocks.db.session.findUnique.mockResolvedValue(null);
    const { getSession } = await load();

    expect(await getSession()).toBeNull();
    expect(mocks.db.session.findUnique.mock.calls[0][0].where).toEqual({
      tokenHash: HASH_OF("raw-token"),
    });
  });

  it("loads user, roles and the union of role permissions in one query", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    mocks.db.session.findUnique.mockResolvedValue(sessionRow());
    const { getSession } = await load();

    const session = await getSession();

    expect(mocks.db.session.findUnique).toHaveBeenCalledTimes(1);
    expect(session).toEqual({
      sessionId: "sess-1",
      user: { id: "user-1", email: "admin@example.com", name: "Ada Admin" },
      roles: ["SALES_MANAGER", "CONTENT_MANAGER"],
      permissions: new Set(["inquiry:read", "contact:read", "product:write"]),
    });
  });

  it("drops role and permission keys the application does not know", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    mocks.db.session.findUnique.mockResolvedValue(
      sessionRow(
        {},
        {
          roles: [
            {
              role: {
                key: "LEGACY_ROLE",
                permissions: [
                  { permission: { key: "dashboard:read" } },
                  { permission: { key: "made:up" } },
                ],
              },
            },
          ],
        },
      ),
    );
    const { getSession } = await load();

    const session = await getSession();

    expect(session?.roles).toEqual([]);
    expect([...session!.permissions]).toEqual(["dashboard:read"]);
  });

  it("deletes and rejects a session past its absolute expiry", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    mocks.db.session.findUnique.mockResolvedValue(
      sessionRow({ expiresAt: new Date(NOW.getTime() - 1) }),
    );
    const { getSession } = await load();

    expect(await getSession()).toBeNull();
    expect(mocks.db.session.deleteMany).toHaveBeenCalledWith({ where: { id: "sess-1" } });
  });

  it("deletes and rejects a session idle for 8 hours", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    mocks.db.session.findUnique.mockResolvedValue(
      sessionRow({ lastUsedAt: new Date(NOW.getTime() - 8 * HOUR) }),
    );
    const { getSession } = await load();

    expect(await getSession()).toBeNull();
    expect(mocks.db.session.deleteMany).toHaveBeenCalledWith({ where: { id: "sess-1" } });
  });

  it("returns null for deactivated users and for locked users", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    const { getSession } = await load();

    mocks.db.session.findUnique.mockResolvedValueOnce(sessionRow({}, { isActive: false }));
    expect(await getSession()).toBeNull();

    mocks.db.session.findUnique.mockResolvedValueOnce(
      sessionRow({}, { lockedUntil: new Date(NOW.getTime() + 60_000) }),
    );
    expect(await getSession()).toBeNull();

    // A lock that has lapsed no longer blocks.
    mocks.db.session.findUnique.mockResolvedValueOnce(
      sessionRow({}, { lockedUntil: new Date(NOW.getTime() - 1) }),
    );
    expect(await getSession()).not.toBeNull();
  });

  it("slides the idle window only when lastUsedAt is at least 5 minutes old", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    const { getSession } = await load();

    mocks.db.session.findUnique.mockResolvedValueOnce(
      sessionRow({ lastUsedAt: new Date(NOW.getTime() - 60_000) }),
    );
    await getSession();
    expect(mocks.db.session.update).not.toHaveBeenCalled();

    mocks.db.session.findUnique.mockResolvedValueOnce(
      sessionRow({ lastUsedAt: new Date(NOW.getTime() - 6 * 60_000) }),
    );
    await getSession();
    expect(mocks.db.session.update).toHaveBeenCalledWith({
      where: { id: "sess-1" },
      data: { lastUsedAt: NOW },
    });
  });

  it("still returns the session when sliding the idle window fails", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    mocks.db.session.findUnique.mockResolvedValue(
      sessionRow({ lastUsedAt: new Date(NOW.getTime() - HOUR) }),
    );
    mocks.db.session.update.mockRejectedValue(new Error("deadlock"));
    const { getSession } = await load();

    expect(await getSession()).not.toBeNull();
  });

  it("throws DatabaseUnavailableError on an outage instead of pretending the user is signed out", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    mocks.db.session.findUnique.mockRejectedValue(
      Object.assign(new Error("down"), { code: "ECONNREFUSED" }),
    );
    const { getSession } = await load();

    await expect(getSession()).rejects.toMatchObject({ name: "DatabaseUnavailableError" });
  });
});

describe("destroySession", () => {
  it("expires the cookie with the same attributes and deletes the row by hash", async () => {
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    const { destroySession, SESSION_COOKIE } = await load();

    await destroySession();

    const [name, value, options] = mocks.cookieJar.set.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE);
    expect(value).toBe("");
    expect(options).toMatchObject({ httpOnly: true, path: "/", sameSite: "lax", maxAge: 0 });
    expect(options.expires.getTime()).toBe(0);
    expect(mocks.db.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: HASH_OF("raw-token") },
    });
  });

  it("keeps Secure on the clearing cookie in production so a __Host- cookie really is removed", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    const { destroySession } = await load();

    await destroySession();

    expect(mocks.cookieJar.set.mock.calls[0][2]).toMatchObject({ secure: true, path: "/" });
  });

  it("is a no-op for the database when signed out, and never throws on a database failure", async () => {
    const { destroySession } = await load();

    mocks.cookieJar.get.mockReturnValue(undefined);
    await destroySession();
    expect(mocks.db.session.deleteMany).not.toHaveBeenCalled();

    mocks.cookieJar.get.mockReturnValue({ value: "raw-token" });
    mocks.db.session.deleteMany.mockRejectedValue(new Error("down"));
    await expect(destroySession()).resolves.toBeUndefined();
  });
});

describe("destroyAllSessionsForUser", () => {
  it("deletes every session of the user and returns how many", async () => {
    mocks.db.session.deleteMany.mockResolvedValue({ count: 3 });
    const { destroyAllSessionsForUser } = await load();

    await expect(destroyAllSessionsForUser("user-1")).resolves.toBe(3);
    expect(mocks.db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});
