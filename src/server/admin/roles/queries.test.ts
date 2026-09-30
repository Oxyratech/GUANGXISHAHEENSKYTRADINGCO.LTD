// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_PERMISSIONS } from "@/server/auth/permissions";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), getDb: vi.fn() }));

vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));

import { PERMISSION_GROUPS, loadRoleMatrix } from "./queries";

beforeEach(() => {
  mocks.findMany.mockReset().mockResolvedValue([]);
  mocks.getDb.mockReset().mockReturnValue({ role: { findMany: mocks.findMany } });
});

describe("PERMISSION_GROUPS", () => {
  it("covers every permission exactly once, grouped by its resource prefix", () => {
    const flattened = PERMISSION_GROUPS.flatMap((group) => group.permissions);
    expect(flattened).toHaveLength(ALL_PERMISSIONS.length);
    expect(new Set(flattened).size).toBe(ALL_PERMISSIONS.length);
    for (const group of PERMISSION_GROUPS) {
      for (const permission of group.permissions) {
        expect(permission.startsWith(`${group.resource}:`)).toBe(true);
      }
    }
  });
});

describe("loadRoleMatrix", () => {
  it("always shows SUPER_ADMIN as locked and holding every permission, ignoring the database", async () => {
    mocks.findMany.mockResolvedValue([
      {
        key: "SUPER_ADMIN",
        name: "Super Admin",
        description: "d",
        isSystem: true,
        permissions: [],
        _count: { users: 1 },
      },
    ]);

    const roles = await loadRoleMatrix();
    const superAdmin = roles.find((role) => role.key === "SUPER_ADMIN");

    expect(superAdmin?.locked).toBe(true);
    expect(superAdmin?.permissions.size).toBe(ALL_PERMISSIONS.length);
  });

  it("returns the four roles in a fixed order, even if the database returns them differently", async () => {
    mocks.findMany.mockResolvedValue([
      {
        key: "SALES_MANAGER",
        name: "Sales",
        description: "",
        isSystem: true,
        permissions: [],
        _count: { users: 0 },
      },
      {
        key: "SUPER_ADMIN",
        name: "Super Admin",
        description: "",
        isSystem: true,
        permissions: [],
        _count: { users: 1 },
      },
    ]);

    const roles = await loadRoleMatrix();

    expect(roles.map((role) => role.key)).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
      "CONTENT_MANAGER",
      "SALES_MANAGER",
    ]);
  });

  it("reflects exactly what RolePermission grants for a non-locked role", async () => {
    mocks.findMany.mockResolvedValue([
      {
        key: "SALES_MANAGER",
        name: "Sales",
        description: "",
        isSystem: true,
        permissions: [
          { permission: { key: "inquiry:read" } },
          { permission: { key: "contact:read" } },
        ],
        _count: { users: 3 },
      },
    ]);

    const roles = await loadRoleMatrix();
    const sales = roles.find((role) => role.key === "SALES_MANAGER");

    expect(sales?.locked).toBe(false);
    expect([...(sales?.permissions ?? [])].sort()).toEqual(["contact:read", "inquiry:read"]);
    expect(sales?.userCount).toBe(3);
  });

  it("falls back to the seed definition for a role missing from the database", async () => {
    mocks.findMany.mockResolvedValue([]);

    const roles = await loadRoleMatrix();
    const admin = roles.find((role) => role.key === "ADMIN");

    expect(admin?.name).toBe("Admin");
    expect(admin?.permissions.size).toBe(0);
  });
});
