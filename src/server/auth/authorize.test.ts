// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Permission } from "./permissions";
import type { AuthSession } from "./session";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), redirect: vi.fn() }));

vi.mock("./session", () => ({ getSession: mocks.getSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  AuthenticationError,
  AuthorizationError,
  hasAnyPermission,
  hasPermission,
  requirePermission,
  requirePermissionOrThrow,
  requireSession,
  requireSessionOrThrow,
} from "./authorize";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "a@example.com", name: "A" },
    roles: ["SALES_MANAGER"],
    permissions: new Set(permissions),
  };
}

// Next's redirect() throws to abort rendering; mirror that so nothing after it can run.
class RedirectSignal extends Error {}

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.redirect.mockReset();
  mocks.redirect.mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

describe("hasPermission / hasAnyPermission", () => {
  const session = makeSession("inquiry:read", "contact:read");

  it("checks membership of the effective permission set", () => {
    expect(hasPermission(session, "inquiry:read")).toBe(true);
    expect(hasPermission(session, "product:write")).toBe(false);
  });

  it("hasAnyPermission is true when at least one matches, false for none or an empty list", () => {
    expect(hasAnyPermission(session, ["product:write", "contact:read"])).toBe(true);
    expect(hasAnyPermission(session, ["product:write", "user:write"])).toBe(false);
    expect(hasAnyPermission(session, [])).toBe(false);
  });
});

describe("requireSession (pages and layouts)", () => {
  it("redirects to the admin login when there is no session", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(requireSession()).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("returns the session when there is one", async () => {
    const session = makeSession();
    mocks.getSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("requireSessionOrThrow (actions and route handlers)", () => {
  it("throws AuthenticationError instead of redirecting", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(requireSessionOrThrow()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns the session when there is one", async () => {
    const session = makeSession();
    mocks.getSession.mockResolvedValue(session);

    await expect(requireSessionOrThrow()).resolves.toBe(session);
  });
});

describe("requirePermission (pages)", () => {
  it("redirects an unauthenticated visitor to login", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(requirePermission("inquiry:read")).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("throws AuthorizationError, naming the permission, for a signed-in user who lacks it", async () => {
    mocks.getSession.mockResolvedValue(makeSession("contact:read"));

    const failure = await requirePermission("inquiry:read").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AuthorizationError);
    expect((failure as AuthorizationError).permission).toBe("inquiry:read");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns the session when the permission is held", async () => {
    const session = makeSession("inquiry:read");
    mocks.getSession.mockResolvedValue(session);

    await expect(requirePermission("inquiry:read")).resolves.toBe(session);
  });

  it("does not treat a related permission as sufficient", async () => {
    mocks.getSession.mockResolvedValue(makeSession("product:read", "product:write"));

    await expect(requirePermission("product:publish")).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("requirePermissionOrThrow (actions and route handlers)", () => {
  it("distinguishes unauthenticated (AuthenticationError) from forbidden (AuthorizationError)", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requirePermissionOrThrow("inquiry:read")).rejects.toBeInstanceOf(
      AuthenticationError,
    );

    mocks.getSession.mockResolvedValue(makeSession("contact:read"));
    await expect(requirePermissionOrThrow("inquiry:read")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns the session when allowed", async () => {
    const session = makeSession("inquiry:read");
    mocks.getSession.mockResolvedValue(session);

    await expect(requirePermissionOrThrow("inquiry:read")).resolves.toBe(session);
  });
});
