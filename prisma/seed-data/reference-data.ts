import { INQUIRY_STATUS_DEFINITIONS } from "@/lib/domain/statuses";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  type Permission,
  type RoleKey,
} from "@/server/auth/permissions";
import type { SeedDb } from "./types";

export interface ReferenceDataSummary {
  inquiryStatuses: number;
  permissions: number;
  roles: number;
  rolePermissions: number;
  /** Needed to attach the optional initial admin to SUPER_ADMIN. */
  roleIds: Record<RoleKey, string>;
}

/**
 * Makes the database reflect the code-defined reference data: inquiry lifecycle rows, permissions,
 * the built-in roles and their baseline permission grants.
 *
 * Idempotent: everything is an upsert keyed on a natural key, so a re-run only refreshes labels and
 * descriptions. It never deletes and never removes a grant, so extra grants added in the admin UI
 * survive; a baseline grant removed in the admin UI is restored on the next run (code is the baseline).
 */
export async function seedReferenceData(db: SeedDb): Promise<ReferenceDataSummary> {
  for (const { code, ...fields } of INQUIRY_STATUS_DEFINITIONS) {
    await db.inquiryStatus.upsert({ where: { code }, create: { code, ...fields }, update: fields });
  }

  const permissionIds = new Map<Permission, string>();
  for (const key of ALL_PERMISSIONS) {
    const description = PERMISSIONS[key];
    const row = await db.permission.upsert({
      where: { key },
      create: { key, description },
      update: { description },
      select: { id: true },
    });
    permissionIds.set(key, row.id);
  }

  const roleIds = {} as Record<RoleKey, string>;
  let rolePermissions = 0;
  for (const { key, name, description, permissions } of ROLE_DEFINITIONS) {
    // isSystem: the built-in roles are referenced by code and must not be deleted from the admin UI.
    const fields = { name, description, isSystem: true };
    const role = await db.role.upsert({
      where: { key },
      create: { key, ...fields },
      update: fields,
      select: { id: true },
    });
    roleIds[key] = role.id;

    for (const permission of permissions) {
      const permissionId = permissionIds.get(permission);
      if (!permissionId) throw new Error(`Role ${key} references unknown permission ${permission}`);
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        create: { roleId: role.id, permissionId },
        update: {},
      });
      rolePermissions += 1;
    }
  }

  return {
    inquiryStatuses: INQUIRY_STATUS_DEFINITIONS.length,
    permissions: permissionIds.size,
    roles: ROLE_DEFINITIONS.length,
    rolePermissions,
    roleIds,
  };
}
