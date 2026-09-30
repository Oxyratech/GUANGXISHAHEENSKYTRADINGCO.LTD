import "server-only";
import { AdminActionError } from "@/server/admin/action";
import type { RoleKey } from "@/server/auth/permissions";
import type { PrismaClient } from "@/server/db";

/*
 * The rules that keep the admin from locking everyone out or letting an escalation slip through.
 * They are pure where possible (unit-testable without a database) and take a database only for the
 * one check that needs to see other rows: whether a Super Admin is the last one standing.
 */

/** True when the change adds or removes SUPER_ADMIN from the set of roles a user holds. */
export function isSuperAdminRoleChange(
  currentRoleKeys: readonly RoleKey[],
  nextRoleKeys: readonly RoleKey[],
): boolean {
  return currentRoleKeys.includes("SUPER_ADMIN") !== nextRoleKeys.includes("SUPER_ADMIN");
}

/** Only a Super Admin may grant or revoke the Super Admin role. */
export function assertSuperAdminRoleChangeAllowed(params: {
  actorRoleKeys: readonly RoleKey[];
  currentRoleKeys: readonly RoleKey[];
  nextRoleKeys: readonly RoleKey[];
}): void {
  if (
    isSuperAdminRoleChange(params.currentRoleKeys, params.nextRoleKeys) &&
    !params.actorRoleKeys.includes("SUPER_ADMIN")
  ) {
    throw new AdminActionError("Only a Super Admin can grant or revoke the Super Admin role.", {
      roles: ["Only a Super Admin can grant or revoke the Super Admin role."],
    });
  }
}

/** Nobody, not even a Super Admin, may remove the Super Admin role from their own account. */
export function assertNotSelfSuperAdminRemoval(params: {
  isSelf: boolean;
  currentRoleKeys: readonly RoleKey[];
  nextRoleKeys: readonly RoleKey[];
}): void {
  if (
    params.isSelf &&
    params.currentRoleKeys.includes("SUPER_ADMIN") &&
    !params.nextRoleKeys.includes("SUPER_ADMIN")
  ) {
    throw new AdminActionError("You cannot remove the Super Admin role from your own account.", {
      roles: ["You cannot remove the Super Admin role from your own account."],
    });
  }
}

/** Nobody may deactivate their own account (it would lock them out with no way back in). */
export function assertNotSelfDeactivation(params: { isSelf: boolean; nextActive: boolean }): void {
  if (params.isSelf && !params.nextActive) {
    throw new AdminActionError("You cannot deactivate your own account.");
  }
}

/**
 * The last active Super Admin can never be deactivated or demoted: it would leave nobody able to
 * manage roles. Runs only when the change would actually take the target out of that set; a change
 * that leaves the target active and holding SUPER_ADMIN never needs to look at other rows.
 */
export async function assertNotLastActiveSuperAdmin(
  db: PrismaClient,
  params: {
    targetUserId: string;
    currentRoleKeys: readonly RoleKey[];
    nextActive: boolean;
    nextRoleKeys: readonly RoleKey[];
  },
): Promise<void> {
  const wasSuperAdmin = params.currentRoleKeys.includes("SUPER_ADMIN");
  if (!wasSuperAdmin) return;

  const staysSuperAdminAndActive = params.nextActive && params.nextRoleKeys.includes("SUPER_ADMIN");
  if (staysSuperAdminAndActive) return;

  const remaining = await db.user.count({
    where: {
      id: { not: params.targetUserId },
      isActive: true,
      roles: { some: { role: { key: "SUPER_ADMIN" } } },
    },
  });
  if (remaining === 0) {
    throw new AdminActionError(
      "At least one active Super Admin must remain. Promote another user to Super Admin first.",
    );
  }
}
