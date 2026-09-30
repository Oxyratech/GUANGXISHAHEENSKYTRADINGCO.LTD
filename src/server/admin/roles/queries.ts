import "server-only";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLE_KEYS,
  isPermission,
  type Permission,
  type RoleKey,
} from "@/server/auth/permissions";
import { getDb, toDatabaseError } from "@/server/db";

/*
 * Read model for the Roles screen: the seed's definitions give the name, description and the
 * "locked" flag (SUPER_ADMIN always holds every permission and cannot be edited); the database gives
 * what is actually granted right now, which is the source of truth for the matrix and for editing.
 */

export interface PermissionGroup {
  /** The part of the key before the colon, e.g. "product". */
  resource: string;
  permissions: readonly Permission[];
}

/** Every permission, grouped by resource, in the order PERMISSIONS declares them. */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = (() => {
  const order: string[] = [];
  const byResource = new Map<string, Permission[]>();
  for (const permission of ALL_PERMISSIONS) {
    const resource = permission.split(":")[0] ?? permission;
    if (!byResource.has(resource)) {
      order.push(resource);
      byResource.set(resource, []);
    }
    byResource.get(resource)?.push(permission);
  }
  return order.map((resource) => ({ resource, permissions: byResource.get(resource) ?? [] }));
})();

export interface RoleRow {
  key: RoleKey;
  name: string;
  description: string;
  isSystem: boolean;
  /** SUPER_ADMIN always holds every permission; its grants cannot be edited. */
  locked: boolean;
  permissions: ReadonlySet<Permission>;
  userCount: number;
}

/** @throws DatabaseUnavailableError when the database cannot be reached. */
export async function loadRoleMatrix(): Promise<RoleRow[]> {
  try {
    const rows = await getDb().role.findMany({
      select: {
        key: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { users: true } },
      },
    });

    const byKey = new Map(rows.map((row) => [row.key, row]));
    return ROLE_KEYS.map((key) => {
      const definition = ROLE_DEFINITIONS.find((role) => role.key === key);
      const row = byKey.get(key);
      const grantedKeys = row?.permissions
        .map((entry) => entry.permission.key)
        .filter(isPermission);
      return {
        key,
        name: row?.name ?? definition?.name ?? key,
        description: row?.description ?? definition?.description ?? "",
        isSystem: row?.isSystem ?? true,
        locked: key === "SUPER_ADMIN",
        permissions: new Set(key === "SUPER_ADMIN" ? ALL_PERMISSIONS : (grantedKeys ?? [])),
        userCount: row?._count.users ?? 0,
      };
    });
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** Every permission's human description, for the matrix's column headings. */
export function describePermission(permission: Permission): string {
  return PERMISSIONS[permission];
}
