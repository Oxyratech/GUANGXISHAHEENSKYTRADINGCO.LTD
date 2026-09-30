// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), redirect: vi.fn(), warn: vi.fn() }));

vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: mocks.warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  asDatabaseOutage,
  hasAdminPermission,
  hasAnyAdminPermission,
  requireAdminPage,
} from "./access";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "a@example.com", name: "A" },
    roles: ["SALES_MANAGER"],
    permissions: new Set(permissions),
  };
}

// Next's redirect() throws so nothing after it runs; mirror that.
class RedirectSignal extends Error {}

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.warn.mockReset();
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

describe("requireAdminPage", () => {
  it("redirects a visitor without a session to the login page", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(requireAdminPage("inquiry:read")).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("remembers the page the visitor was going to", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(
      requireAdminPage("inquiry:read", { next: "/admin/inquiries?status=NEW" }),
    ).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/login?next=%2Fadmin%2Finquiries%3Fstatus%3DNEW",
    );
  });

  it("ignores a return path that is not an internal admin path", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(
      requireAdminPage("inquiry:read", { next: "https://evil.example" }),
    ).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("refuses a signed-in user who lacks the permission, without redirecting", async () => {
    mocks.getSession.mockResolvedValue(makeSession("contact:read"));

    await expect(requireAdminPage("inquiry:read")).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.warn).toHaveBeenCalledWith("auth.permission_denied", {
      userId: "u1",
      permission: "inquiry:read",
    });
  });

  it("returns the session for a user who holds the permission", async () => {
    const session = makeSession("inquiry:read");
    mocks.getSession.mockResolvedValue(session);

    await expect(requireAdminPage("inquiry:read")).resolves.toEqual({ ok: true, session });
  });

  it("reports an outage with its cause instead of treating the user as signed out", async () => {
    mocks.getSession.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await expect(requireAdminPage("inquiry:read")).resolves.toEqual({
      ok: false,
      reason: "database_unavailable",
      cause: "connection",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("reports a missing DATABASE_URL as not configured", async () => {
    mocks.getSession.mockRejectedValue(
      new DatabaseUnavailableError("DATABASE_URL is not configured", { cause: "not_configured" }),
    );

    await expect(requireAdminPage("dashboard:read")).resolves.toMatchObject({
      reason: "database_unavailable",
      cause: "not_configured",
    });
  });

  it("recognises a raw connection failure from the driver as an outage", async () => {
    mocks.getSession.mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
    );

    await expect(requireAdminPage("dashboard:read")).resolves.toMatchObject({
      reason: "database_unavailable",
    });
  });

  it("rethrows anything that is not an outage", async () => {
    mocks.getSession.mockRejectedValue(new TypeError("bug"));

    await expect(requireAdminPage("dashboard:read")).rejects.toThrow("bug");
  });
});

describe("asDatabaseOutage", () => {
  it("returns the outage behind an error and null for everything else", () => {
    const outage = new DatabaseUnavailableError("x", { cause: "timeout" });

    expect(asDatabaseOutage(outage)).toBe(outage);
    expect(asDatabaseOutage(Object.assign(new Error("t"), { code: "ETIMEDOUT" }))?.cause).toBe(
      "timeout",
    );
    expect(asDatabaseOutage(new Error("syntax error"))).toBeNull();
    expect(asDatabaseOutage("nope")).toBeNull();
  });
});

describe("permission helpers for showing or hiding controls", () => {
  const session = makeSession("product:read", "product:write");

  it("hasAdminPermission checks one permission", () => {
    expect(hasAdminPermission(session, "product:write")).toBe(true);
    expect(hasAdminPermission(session, "product:delete")).toBe(false);
  });

  it("hasAnyAdminPermission checks a list", () => {
    expect(hasAnyAdminPermission(session, ["product:delete", "product:read"])).toBe(true);
    expect(hasAnyAdminPermission(session, ["product:delete", "news:write"])).toBe(false);
  });
});
