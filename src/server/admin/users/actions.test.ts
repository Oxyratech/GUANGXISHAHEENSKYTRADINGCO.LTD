// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";
import type * as PasswordModule from "@/server/security/password";

const mocks = vi.hoisted(() => ({
  requirePermissionOrThrow: vi.fn(),
  writeAudit: vi.fn(),
  getRequestContext: vi.fn(),
  logError: vi.fn(),
  destroyAllSessionsForUser: vi.fn(),
  hashPassword: vi.fn(),
  revalidatePath: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userCreate: vi.fn(),
  userCount: vi.fn(),
  roleFindMany: vi.fn(),
  userRoleDeleteMany: vi.fn(),
  userRoleCreateMany: vi.fn(),
  transaction: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/auth/authorize", () => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return {
    AuthenticationError,
    AuthorizationError,
    requirePermissionOrThrow: mocks.requirePermissionOrThrow,
  };
});
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/server/auth/session", () => ({
  destroyAllSessionsForUser: mocks.destroyAllSessionsForUser,
}));
vi.mock("@/server/security/password", async () => {
  const actual = await vi.importActual<typeof PasswordModule>("@/server/security/password");
  return { ...actual, hashPassword: mocks.hashPassword };
});
vi.mock("@/server/db", () => ({
  getDb: () => ({
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
      create: mocks.userCreate,
      count: mocks.userCount,
    },
    role: { findMany: mocks.roleFindMany },
    userRole: { deleteMany: mocks.userRoleDeleteMany, createMany: mocks.userRoleCreateMany },
    $transaction: mocks.transaction,
  }),
}));

import {
  createUser,
  resetUserPassword,
  setUserActive,
  unlockUser,
  updateUserProfile,
  updateUserRoles,
} from "./actions";

const IP_HASH = "a".repeat(64);
const STRONG_PASSWORD = "Correct-Horse-77";
const ACTOR_ID = "00000000-0000-4000-8000-000000000001";
const TARGET_ID = "00000000-0000-4000-8000-000000000002";
const OTHER_ID = "00000000-0000-4000-8000-000000000003";
const GONE_ID = "00000000-0000-4000-8000-0000000000ff";

function adminSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    sessionId: "s1",
    user: { id: ACTOR_ID, email: "admin@example.com", name: "Admin" },
    roles: ["ADMIN"],
    permissions: new Set(["user:write", "user:assign-role"]),
    ...overrides,
  };
}

function superAdminSession(): AuthSession {
  return adminSession({
    roles: ["SUPER_ADMIN"],
    user: { id: ACTOR_ID, email: "root@example.com", name: "Root" },
  });
}

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

function targetRow(
  overrides: Partial<{
    id: string;
    email: string;
    isActive: boolean;
    roles: { role: { key: string } }[];
  }> = {},
) {
  return {
    id: TARGET_ID,
    email: "target@example.com",
    isActive: true,
    roles: [{ role: { key: "SALES_MANAGER" } }],
    ...overrides,
  };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset?.();
  mocks.requirePermissionOrThrow.mockResolvedValue(adminSession());
  mocks.writeAudit.mockResolvedValue(undefined);
  mocks.getRequestContext.mockResolvedValue({
    ip: "203.0.113.9",
    ipHash: IP_HASH,
    userAgent: "UA",
    origin: null,
  });
  mocks.destroyAllSessionsForUser.mockResolvedValue(1);
  mocks.hashPassword.mockResolvedValue("scrypt$hash");
  mocks.transaction.mockImplementation((ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : ops,
  );
});

describe("createUser", () => {
  it("requires user:write and user:assign-role, in that order", async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.roleFindMany.mockResolvedValue([{ id: "r1", key: "SALES_MANAGER" }]);
    mocks.userCreate.mockResolvedValue({ id: "new-1" });

    await createUser(
      undefined,
      form({
        name: "New Person",
        email: "new@example.com",
        password: STRONG_PASSWORD,
        roles: "SALES_MANAGER",
      }),
    );

    expect(mocks.requirePermissionOrThrow.mock.calls.map(([p]) => p)).toEqual([
      "user:write",
      "user:assign-role",
    ]);
  });

  it("rejects an email that is already registered, without a generic 'duplicate' code", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "existing" });

    const state = await createUser(
      undefined,
      form({
        name: "New",
        email: "taken@example.com",
        password: STRONG_PASSWORD,
        roles: "SALES_MANAGER",
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      fieldErrors: { email: ["That email address is already registered."] },
    });
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("rejects a password that fails the strength policy", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const state = await createUser(
      undefined,
      form({ name: "New", email: "new@example.com", password: "short", roles: "SALES_MANAGER" }),
    );

    expect(state).toMatchObject({ status: "error", fieldErrors: { password: expect.any(Array) } });
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("refuses a non-Super-Admin actor granting the Super Admin role", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const state = await createUser(
      undefined,
      form({
        name: "New",
        email: "new@example.com",
        password: STRONG_PASSWORD,
        roles: "SUPER_ADMIN",
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { roles: [expect.stringContaining("Only a Super Admin")] },
    });
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("allows a Super Admin actor to create another Super Admin, and audits it", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(superAdminSession());
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.roleFindMany.mockResolvedValue([{ id: "r1", key: "SUPER_ADMIN" }]);
    mocks.userCreate.mockResolvedValue({ id: "new-1" });

    const state = await createUser(
      undefined,
      form({
        name: "New Root",
        email: "new-root@example.com",
        password: STRONG_PASSWORD,
        roles: "SUPER_ADMIN",
      }),
    );

    expect(state).toMatchObject({ status: "success", data: { id: "new-1" } });
    expect(mocks.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new-root@example.com",
          roles: { create: [{ roleId: "r1" }] },
        }),
      }),
    );
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.created", entityType: "user" }),
    );
  });

  it("never sends the password itself to the audit log", async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.roleFindMany.mockResolvedValue([{ id: "r1", key: "SALES_MANAGER" }]);
    mocks.userCreate.mockResolvedValue({ id: "new-1" });

    await createUser(
      undefined,
      form({
        name: "New",
        email: "new@example.com",
        password: STRONG_PASSWORD,
        roles: "SALES_MANAGER",
      }),
    );

    const [entry] = mocks.writeAudit.mock.calls[0] as [Record<string, unknown>];
    expect(JSON.stringify(entry)).not.toContain(STRONG_PASSWORD);
  });
});

describe("updateUserProfile", () => {
  it("refuses to deactivate your own account", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(
      adminSession({ user: { id: TARGET_ID, email: "a@example.com", name: "A" } }),
    );
    mocks.userFindUnique.mockResolvedValue(targetRow({ id: TARGET_ID }));

    const state = await updateUserProfile(
      undefined,
      form({ id: TARGET_ID, name: "A", active: "" }),
    );

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("refuses to deactivate the last active Super Admin", async () => {
    mocks.userFindUnique.mockResolvedValue(
      targetRow({ id: TARGET_ID, roles: [{ role: { key: "SUPER_ADMIN" } }] }),
    );
    mocks.userCount.mockResolvedValue(0);

    const state = await updateUserProfile(
      undefined,
      form({ id: TARGET_ID, name: "Root", active: "" }),
    );

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("allows deactivating a Super Admin when another remains, and destroys their sessions", async () => {
    mocks.userFindUnique.mockResolvedValue(
      targetRow({ id: TARGET_ID, roles: [{ role: { key: "SUPER_ADMIN" } }] }),
    );
    mocks.userCount.mockResolvedValue(1);
    mocks.userUpdate.mockResolvedValue({});

    const state = await updateUserProfile(
      undefined,
      form({ id: TARGET_ID, name: "Root", active: "" }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { name: "Root", isActive: false },
    });
    expect(mocks.destroyAllSessionsForUser).toHaveBeenCalledWith(TARGET_ID);
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.updated" }),
    );
  });

  it("does not destroy sessions when the account stays active", async () => {
    mocks.userFindUnique.mockResolvedValue(targetRow());
    mocks.userUpdate.mockResolvedValue({});

    await updateUserProfile(undefined, form({ id: TARGET_ID, name: "Someone", active: "on" }));

    expect(mocks.destroyAllSessionsForUser).not.toHaveBeenCalled();
  });

  it("reports a record deleted since the page loaded as 'this user no longer exists'", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const state = await updateUserProfile(
      undefined,
      form({ id: GONE_ID, name: "X", active: "on" }),
    );

    expect(state).toMatchObject({
      status: "error",
      message: expect.stringContaining("no longer exists"),
    });
  });
});

describe("setUserActive", () => {
  it("is refused for your own account, same as the profile form", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(
      adminSession({ user: { id: TARGET_ID, email: "a@example.com", name: "A" } }),
    );
    mocks.userFindUnique.mockResolvedValue(targetRow({ id: TARGET_ID }));

    const state = await setUserActive(undefined, form({ id: TARGET_ID, active: "" }));

    expect(state).toMatchObject({ status: "error" });
  });
});

describe("updateUserRoles", () => {
  it("checks only user:assign-role", async () => {
    mocks.userFindUnique.mockResolvedValue(targetRow());
    mocks.roleFindMany.mockResolvedValue([{ id: "r2", key: "CONTENT_MANAGER" }]);

    await updateUserRoles(undefined, form({ id: TARGET_ID, roles: "CONTENT_MANAGER" }));

    expect(mocks.requirePermissionOrThrow).toHaveBeenCalledWith("user:assign-role");
    expect(mocks.requirePermissionOrThrow).toHaveBeenCalledTimes(1);
  });

  it("refuses a non-Super-Admin actor revoking someone's Super Admin role", async () => {
    mocks.userFindUnique.mockResolvedValue(
      targetRow({ roles: [{ role: { key: "SUPER_ADMIN" } }] }),
    );

    const state = await updateUserRoles(undefined, form({ id: TARGET_ID, roles: "ADMIN" }));

    expect(state).toMatchObject({ status: "error" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("refuses removing your own Super Admin role even as a Super Admin", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(superAdminSession());
    mocks.userFindUnique.mockResolvedValue(
      targetRow({ id: ACTOR_ID, roles: [{ role: { key: "SUPER_ADMIN" } }] }),
    );

    const state = await updateUserRoles(undefined, form({ id: ACTOR_ID, roles: "ADMIN" }));

    expect(state).toMatchObject({ status: "error" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("refuses demoting the last active Super Admin", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(superAdminSession());
    mocks.userFindUnique.mockResolvedValue(
      targetRow({ id: OTHER_ID, roles: [{ role: { key: "SUPER_ADMIN" } }] }),
    );
    mocks.userCount.mockResolvedValue(0);

    const state = await updateUserRoles(undefined, form({ id: OTHER_ID, roles: "ADMIN" }));

    expect(state).toMatchObject({ status: "error" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("replaces the roles transactionally and always destroys the user's sessions", async () => {
    mocks.userFindUnique.mockResolvedValue(targetRow());
    mocks.roleFindMany.mockResolvedValue([{ id: "r2", key: "CONTENT_MANAGER" }]);

    const state = await updateUserRoles(
      undefined,
      form({ id: TARGET_ID, roles: "CONTENT_MANAGER" }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.userRoleDeleteMany).toHaveBeenCalledWith({ where: { userId: TARGET_ID } });
    expect(mocks.userRoleCreateMany).toHaveBeenCalledWith({
      data: [{ userId: TARGET_ID, roleId: "r2" }],
    });
    expect(mocks.destroyAllSessionsForUser).toHaveBeenCalledWith(TARGET_ID);
  });

  it("rejects a role that no longer exists in the database", async () => {
    mocks.userFindUnique.mockResolvedValue(targetRow());
    mocks.roleFindMany.mockResolvedValue([]);

    const state = await updateUserRoles(
      undefined,
      form({ id: TARGET_ID, roles: "CONTENT_MANAGER" }),
    );

    expect(state).toMatchObject({ status: "error" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("unlockUser", () => {
  it("clears the failed-login count and lockout, and audits it", async () => {
    mocks.userFindUnique.mockResolvedValue(targetRow());
    mocks.userUpdate.mockResolvedValue({});

    const state = await unlockUser(undefined, form({ id: TARGET_ID }));

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.unlocked" }),
    );
  });
});

describe("resetUserPassword", () => {
  it("rejects a mismatched confirmation without hashing anything", async () => {
    mocks.userFindUnique.mockResolvedValue(targetRow());

    const state = await resetUserPassword(
      undefined,
      form({ id: TARGET_ID, password: STRONG_PASSWORD, confirmPassword: "different-one-99" }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { confirmPassword: expect.any(Array) },
    });
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("rejects a weak password", async () => {
    mocks.userFindUnique.mockResolvedValue(targetRow());

    const state = await resetUserPassword(
      undefined,
      form({ id: TARGET_ID, password: "weak", confirmPassword: "weak" }),
    );

    expect(state).toMatchObject({ status: "error", fieldErrors: { password: expect.any(Array) } });
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("sets the new password, unlocks the account and destroys every session, never logging the password", async () => {
    mocks.userFindUnique.mockResolvedValue(targetRow());
    mocks.userUpdate.mockResolvedValue({});

    const state = await resetUserPassword(
      undefined,
      form({ id: TARGET_ID, password: STRONG_PASSWORD, confirmPassword: STRONG_PASSWORD }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.hashPassword).toHaveBeenCalledWith(STRONG_PASSWORD);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { passwordHash: "scrypt$hash", failedLoginCount: 0, lockedUntil: null },
    });
    expect(mocks.destroyAllSessionsForUser).toHaveBeenCalledWith(TARGET_ID);
    const [entry] = mocks.writeAudit.mock.calls[0] as [Record<string, unknown>];
    expect(JSON.stringify(entry)).not.toContain(STRONG_PASSWORD);
  });
});
