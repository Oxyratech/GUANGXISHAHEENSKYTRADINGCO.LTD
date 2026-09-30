// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";
import type * as PasswordModule from "@/server/security/password";

const mocks = vi.hoisted(() => ({
  requirePermissionOrThrow: vi.fn(),
  requireSessionOrThrow: vi.fn(),
  writeAudit: vi.fn(),
  getRequestContext: vi.fn(),
  logWarn: vi.fn(),
  destroyAllSessionsForUser: vi.fn(),
  destroySession: vi.fn(),
  redirect: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  sessionDeleteMany: vi.fn(),
}));

class RedirectSignal extends Error {
  constructor(readonly path: string) {
    super(`redirect:${path}`);
  }
}

vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  },
  redirect: mocks.redirect.mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  }),
}));
vi.mock("@/server/auth/authorize", () => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return {
    AuthenticationError,
    AuthorizationError,
    requirePermissionOrThrow: mocks.requirePermissionOrThrow,
    requireSessionOrThrow: mocks.requireSessionOrThrow,
  };
});
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: mocks.logWarn, info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/server/auth/session", () => ({
  destroyAllSessionsForUser: mocks.destroyAllSessionsForUser,
  destroySession: mocks.destroySession,
}));
vi.mock("@/server/security/password", async () => {
  const actual = await vi.importActual<typeof PasswordModule>("@/server/security/password");
  return { ...actual, hashPassword: mocks.hashPassword, verifyPassword: mocks.verifyPassword };
});
vi.mock("@/server/db", () => ({
  getDb: () => ({
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    session: { deleteMany: mocks.sessionDeleteMany },
  }),
}));

import { changeOwnPassword, signOutEverywhereAction } from "./actions";

const session: AuthSession = {
  sessionId: "session-1",
  user: { id: "u1", email: "me@example.com", name: "Me" },
  roles: ["SALES_MANAGER"],
  permissions: new Set(["dashboard:read"]),
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset?.();
  mocks.requirePermissionOrThrow.mockResolvedValue(session);
  mocks.requireSessionOrThrow.mockResolvedValue(session);
  mocks.writeAudit.mockResolvedValue(undefined);
  mocks.getRequestContext.mockResolvedValue({
    ip: "203.0.113.9",
    ipHash: "a".repeat(64),
    userAgent: "UA",
    origin: null,
  });
  mocks.destroyAllSessionsForUser.mockResolvedValue(2);
  mocks.destroySession.mockResolvedValue(undefined);
  mocks.hashPassword.mockResolvedValue("scrypt$newhash");
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.userFindUnique.mockResolvedValue({
    id: "u1",
    email: "me@example.com",
    passwordHash: "scrypt$oldhash",
  });
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

describe("changeOwnPassword", () => {
  it("requires dashboard:read (the baseline permission every role holds)", async () => {
    await changeOwnPassword(
      undefined,
      form({
        currentPassword: "old-pass",
        newPassword: "Correct-Horse-77",
        confirmPassword: "Correct-Horse-77",
      }),
    );
    expect(mocks.requirePermissionOrThrow).toHaveBeenCalledWith("dashboard:read");
  });

  it("rejects an incorrect current password without hashing a new one", async () => {
    mocks.verifyPassword.mockResolvedValue(false);

    const state = await changeOwnPassword(
      undefined,
      form({
        currentPassword: "wrong",
        newPassword: "Correct-Horse-77",
        confirmPassword: "Correct-Horse-77",
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { currentPassword: expect.any(Array) },
    });
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("rejects a confirmation that does not match", async () => {
    const state = await changeOwnPassword(
      undefined,
      form({
        currentPassword: "old-pass",
        newPassword: "Correct-Horse-77",
        confirmPassword: "Different-One-99",
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { confirmPassword: expect.any(Array) },
    });
  });

  it("rejects a new password that fails the strength policy", async () => {
    const state = await changeOwnPassword(
      undefined,
      form({ currentPassword: "old-pass", newPassword: "weak", confirmPassword: "weak" }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { newPassword: expect.any(Array) },
    });
  });

  it("changes the password and signs out every other session, but keeps this one", async () => {
    const state = await changeOwnPassword(
      undefined,
      form({
        currentPassword: "old-pass",
        newPassword: "Correct-Horse-77",
        confirmPassword: "Correct-Horse-77",
      }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "scrypt$newhash" },
    });
    expect(mocks.sessionDeleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", id: { not: "session-1" } },
    });
    expect(mocks.destroyAllSessionsForUser).not.toHaveBeenCalled();
  });

  it("never includes the password in the audit entry", async () => {
    await changeOwnPassword(
      undefined,
      form({
        currentPassword: "old-pass",
        newPassword: "Correct-Horse-77",
        confirmPassword: "Correct-Horse-77",
      }),
    );

    const [entry] = mocks.writeAudit.mock.calls[0] as [Record<string, unknown>];
    expect(JSON.stringify(entry)).not.toContain("Correct-Horse-77");
    expect(entry).toMatchObject({ action: "account.password_changed" });
  });
});

describe("signOutEverywhereAction", () => {
  it("requires a session, destroys every session and redirects to login", async () => {
    await expect(signOutEverywhereAction()).rejects.toBeInstanceOf(RedirectSignal);

    expect(mocks.requireSessionOrThrow).toHaveBeenCalledTimes(1);
    expect(mocks.destroyAllSessionsForUser).toHaveBeenCalledWith("u1");
    expect(mocks.destroySession).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("audits the sign-out with the session count, and still redirects if the audit write fails", async () => {
    mocks.writeAudit.mockRejectedValue(new Error("db down"));

    await expect(signOutEverywhereAction()).rejects.toBeInstanceOf(RedirectSignal);

    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "account.signed_out_everywhere",
        metadata: { sessionCount: 2 },
      }),
    );
    expect(mocks.logWarn).toHaveBeenCalled();
  });
});
