import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLE_KEYS,
  isPermission,
  type Permission,
  type RoleKey,
} from "@/server/auth/permissions";

/** The role/permission matrix the seed writes. These tests guard the shape of what it will grant. */

const role = (key: RoleKey) => {
  const definition = ROLE_DEFINITIONS.find((r) => r.key === key);
  if (!definition) throw new Error(`Missing role definition ${key}`);
  return definition;
};

const grants = (key: RoleKey, permission: Permission) => role(key).permissions.includes(permission);

describe("permission catalogue", () => {
  it("uses resource:action keys", () => {
    for (const key of ALL_PERMISSIONS) {
      expect(key).toMatch(/^[a-z]+:[a-z-]+$/);
    }
  });

  it("describes every permission", () => {
    for (const key of ALL_PERMISSIONS) {
      expect(PERMISSIONS[key].trim()).not.toBe("");
    }
  });
});

describe("role definitions", () => {
  it("define each built-in role exactly once, in ROLE_KEYS order", () => {
    expect(ROLE_DEFINITIONS.map((r) => r.key)).toEqual([...ROLE_KEYS]);
  });

  it("only grant permissions that exist, each at most once", () => {
    for (const { key, permissions } of ROLE_DEFINITIONS) {
      for (const permission of permissions) {
        expect(isPermission(permission), `${key} grants unknown permission ${permission}`).toBe(
          true,
        );
      }
      expect(new Set(permissions).size, `${key} lists a permission twice`).toBe(permissions.length);
    }
  });

  it("give every permission to at least one role", () => {
    const granted = new Set(ROLE_DEFINITIONS.flatMap((r) => r.permissions));
    expect(ALL_PERMISSIONS.filter((p) => !granted.has(p))).toEqual([]);
  });

  it("SUPER_ADMIN holds every permission", () => {
    expect([...role("SUPER_ADMIN").permissions].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it("ADMIN holds every permission except role:write", () => {
    expect([...role("ADMIN").permissions].sort()).toEqual(
      ALL_PERMISSIONS.filter((p) => p !== "role:write").sort(),
    );
    expect(grants("ADMIN", "role:write")).toBe(false);
  });

  it("only SUPER_ADMIN can edit role permissions", () => {
    const holders = ROLE_DEFINITIONS.filter((r) => r.permissions.includes("role:write")).map(
      (r) => r.key,
    );
    expect(holders).toEqual(["SUPER_ADMIN"]);
  });

  it("CONTENT_MANAGER manages content but has no access to inquiries, users or settings", () => {
    expect(grants("CONTENT_MANAGER", "product:write")).toBe(true);
    expect(grants("CONTENT_MANAGER", "news:publish")).toBe(true);
    expect(grants("CONTENT_MANAGER", "media:upload")).toBe(true);
    const forbidden = role("CONTENT_MANAGER").permissions.filter((p) =>
      /^(inquiry|contact|user|role|settings|audit):/.test(p),
    );
    expect(forbidden).toEqual([]);
  });

  it("SALES_MANAGER works inquiries but cannot change content, users or settings", () => {
    expect(grants("SALES_MANAGER", "inquiry:update")).toBe(true);
    expect(grants("SALES_MANAGER", "contact:update")).toBe(true);
    expect(grants("SALES_MANAGER", "product:read")).toBe(true);
    const forbidden = role("SALES_MANAGER").permissions.filter((p) =>
      /:(write|publish|delete|upload|assign-role)$/.test(p),
    );
    expect(forbidden).toEqual([]);
  });

  it("every role that can write a resource can also read it", () => {
    for (const { key, permissions } of ROLE_DEFINITIONS) {
      for (const permission of permissions) {
        const [resource, action] = permission.split(":");
        if (!["write", "publish", "delete", "upload"].includes(action)) continue;
        expect(permissions, `${key} can ${permission} but not ${resource}:read`).toContain(
          `${resource}:read`,
        );
      }
    }
  });
});
