// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  requirePermissionOrThrow: vi.fn(),
  writeAudit: vi.fn(),
  getRequestContext: vi.fn(),
  logError: vi.fn(),
  revalidatePath: vi.fn(),
  roleFindUnique: vi.fn(),
  permissionFindMany: vi.fn(),
  rolePermissionDeleteMany: vi.fn(),
  rolePermissionCreateMany: vi.fn(),
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
vi.mock("@/server/db", () => ({
  getDb: () => ({
    role: { findUnique: mocks.roleFindUnique },
    permission: { findMany: mocks.permissionFindMany },
    rolePermission: {
      deleteMany: mocks.rolePermissionDeleteMany,
      createMany: mocks.rolePermissionCreateMany,
    },
    $transaction: mocks.transaction,
  }),
}));

import { updateRolePermissions } from "./actions";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "u1", email: "admin@example.com", name: "Admin" },
  roles: ["SUPER_ADMIN"],
  permissions: new Set(["role:write"]),
};

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset?.();
  mocks.requirePermissionOrThrow.mockResolvedValue(session);
  mocks.writeAudit.mockResolvedValue(undefined);
  mocks.getRequestContext.mockResolvedValue({
    ip: "203.0.113.9",
    ipHash: "a".repeat(64),
    userAgent: "UA",
    origin: null,
  });
  mocks.transaction.mockImplementation((ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : ops,
  );
});

describe("updateRolePermissions", () => {
  it("requires role:write", async () => {
    await updateRolePermissions(
      undefined,
      form({ roleKey: "SALES_MANAGER", permissions: ["inquiry:read"] }),
    );
    expect(mocks.requirePermissionOrThrow).toHaveBeenCalledWith("role:write");
  });

  it("refuses to edit the Super Admin role", async () => {
    const state = await updateRolePermissions(
      undefined,
      form({ roleKey: "SUPER_ADMIN", permissions: ["inquiry:read"] }),
    );

    expect(state).toMatchObject({ status: "error" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an unrecognised permission before touching the database", async () => {
    const state = await updateRolePermissions(
      undefined,
      form({ roleKey: "SALES_MANAGER", permissions: ["not:a-real-permission"] }),
    );

    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.roleFindUnique).not.toHaveBeenCalled();
  });

  it("reports a role that no longer exists", async () => {
    mocks.roleFindUnique.mockResolvedValue(null);

    const state = await updateRolePermissions(
      undefined,
      form({ roleKey: "SALES_MANAGER", permissions: ["inquiry:read"] }),
    );

    expect(state).toMatchObject({ status: "error" });
  });

  it("saves nothing and reports no change when the submitted set matches what is granted", async () => {
    mocks.roleFindUnique.mockResolvedValue({
      id: "role-1",
      permissions: [{ permission: { key: "inquiry:read" } }],
    });

    const state = await updateRolePermissions(
      undefined,
      form({ roleKey: "SALES_MANAGER", permissions: ["inquiry:read"] }),
    );

    expect(state).toMatchObject({ status: "success", message: "No changes to save." });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("grants and revokes transactionally, and audits both sides of the diff", async () => {
    mocks.roleFindUnique.mockResolvedValue({
      id: "role-1",
      permissions: [{ permission: { key: "inquiry:read" } }],
    });
    mocks.permissionFindMany.mockResolvedValue([
      { id: "perm-contact", key: "contact:read" },
      { id: "perm-inquiry", key: "inquiry:read" },
    ]);

    const state = await updateRolePermissions(
      undefined,
      form({ roleKey: "SALES_MANAGER", permissions: ["contact:read"] }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.rolePermissionDeleteMany).toHaveBeenCalledWith({
      where: { roleId: "role-1", permissionId: { in: ["perm-inquiry"] } },
    });
    expect(mocks.rolePermissionCreateMany).toHaveBeenCalledWith({
      data: [{ roleId: "role-1", permissionId: "perm-contact" }],
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "role.permissions_updated",
        metadata: { granted: ["contact:read"], revoked: ["inquiry:read"] },
      }),
    );
  });
});
