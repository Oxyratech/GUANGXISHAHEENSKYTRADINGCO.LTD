"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AdminActionError, defineAdminAction, stringList } from "@/server/admin/action";
import { isPermission, isRoleKey, type Permission } from "@/server/auth/permissions";
import { getDb } from "@/server/db";

/*
 * Editing a role's permission set. Permitted only to whoever holds role:write (by the seeded matrix,
 * only SUPER_ADMIN: see ROLE_DEFINITIONS), and never for SUPER_ADMIN itself, which is locked to every
 * permission so the console can never be left without a fully-privileged role. Applied transactionally
 * so a request either changes everything it asked for or nothing.
 */

const permissionsField = stringList(80)
  .refine((values) => values.every(isPermission), "Unknown permission.")
  .transform((values) => values as Permission[]);

export const updateRolePermissions = defineAdminAction({
  name: "roles.update_permissions",
  permission: "role:write",
  schema: z.object({ roleKey: z.string().min(1).max(50), permissions: permissionsField }),
  handler: async ({ input }) => {
    if (!isRoleKey(input.roleKey)) {
      throw new AdminActionError("Unknown role.");
    }
    if (input.roleKey === "SUPER_ADMIN") {
      throw new AdminActionError("The Super Admin role always holds every permission.");
    }

    const db = getDb();
    const role = await db.role.findUnique({
      where: { key: input.roleKey },
      select: { id: true, permissions: { select: { permission: { select: { key: true } } } } },
    });
    if (!role) throw new AdminActionError("This role no longer exists. Reload the page.");

    const current = new Set(
      role.permissions.map((entry) => entry.permission.key).filter(isPermission),
    );
    const next = new Set(input.permissions);
    const granted = input.permissions.filter((permission) => !current.has(permission));
    const revoked = [...current].filter((permission) => !next.has(permission));

    if (granted.length === 0 && revoked.length === 0) {
      return { data: { roleKey: input.roleKey }, message: "No changes to save." };
    }

    const permissionRows = await db.permission.findMany({
      where: { key: { in: [...granted, ...revoked] } },
      select: { id: true, key: true },
    });
    const idOf = new Map(permissionRows.map((row) => [row.key, row.id]));
    const grantedIds = granted.map((key) => idOf.get(key)).filter((v): v is string => Boolean(v));
    const revokedIds = revoked.map((key) => idOf.get(key)).filter((v): v is string => Boolean(v));

    await db.$transaction([
      ...(revokedIds.length > 0
        ? [
            db.rolePermission.deleteMany({
              where: { roleId: role.id, permissionId: { in: revokedIds } },
            }),
          ]
        : []),
      ...(grantedIds.length > 0
        ? [
            db.rolePermission.createMany({
              data: grantedIds.map((permissionId) => ({ roleId: role.id, permissionId })),
            }),
          ]
        : []),
    ]);

    revalidatePath("/admin/roles");
    return {
      data: { roleKey: input.roleKey },
      message: "Role permissions updated.",
      audit: {
        action: "role.permissions_updated",
        entityType: "role",
        entityId: input.roleKey,
        summary: `Updated permissions for ${input.roleKey}`,
        metadata: { granted, revoked },
      },
    };
  },
});
