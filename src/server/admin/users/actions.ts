"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AdminActionError,
  checkbox,
  defineAdminAction,
  id,
  requiredString,
  stringList,
} from "@/server/admin/action";
import {
  assertNotLastActiveSuperAdmin,
  assertNotSelfDeactivation,
  assertNotSelfSuperAdminRemoval,
  assertSuperAdminRoleChangeAllowed,
} from "@/server/admin/users/guards";
import { toRoleKeys } from "@/server/admin/users/queries";
import { isPlausibleEmail, normalizeEmail } from "@/server/auth/email";
import { isRoleKey, type RoleKey } from "@/server/auth/permissions";
import { destroyAllSessionsForUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { hashPassword, validatePasswordStrength } from "@/server/security/password";

/*
 * Server Actions behind the Users screens. Every one runs through defineAdminAction, so permission
 * checks, zod validation, audit and error mapping are never something a handler can forget. The
 * business rules that stop an admin from locking the console out live in ./guards, unit-tested apart
 * from these handlers.
 */

const emailField = requiredString(254);
const nameField = requiredString(120);
const newPasswordField = z
  .string({ error: "Enter a password." })
  .min(1, "Enter a password.")
  .max(128, "At most 128 characters.");
const roleKeysField = stringList(50)
  .refine((values) => values.length > 0, "Select at least one role.")
  .refine((values) => values.every(isRoleKey), "Unknown role.")
  .transform((values) => values as RoleKey[]);

function revalidateUser(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

async function loadTargetOrThrow(userId: string) {
  const target = await getDb().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isActive: true,
      roles: { select: { role: { select: { key: true } } } },
    },
  });
  if (!target) throw new AdminActionError("This user no longer exists. Reload the page.");
  return { ...target, roleKeys: toRoleKeys(target.roles) };
}

/** Creates a user with an initial password and role set. The admin shares the password out of band. */
export const createUser = defineAdminAction({
  name: "users.create",
  permission: ["user:write", "user:assign-role"],
  schema: z.object({
    name: nameField,
    email: emailField,
    password: newPasswordField,
    roles: roleKeysField,
  }),
  handler: async ({ input, session }) => {
    const email = normalizeEmail(input.email);
    if (!isPlausibleEmail(email)) {
      throw new AdminActionError("Enter a valid email address.", {
        email: ["Enter a valid email address."],
      });
    }
    const strength = validatePasswordStrength(input.password, email);
    if (!strength.ok) {
      throw new AdminActionError(strength.reason, { password: [strength.reason] });
    }
    assertSuperAdminRoleChangeAllowed({
      actorRoleKeys: session.roles,
      currentRoleKeys: [],
      nextRoleKeys: input.roles,
    });

    const db = getDb();
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new AdminActionError("That email address is already registered.", {
        email: ["That email address is already registered."],
      });
    }

    const roleRows = await db.role.findMany({
      where: { key: { in: input.roles } },
      select: { id: true, key: true },
    });
    if (roleRows.length !== new Set(input.roles).size) {
      throw new AdminActionError(
        "One of the selected roles no longer exists. Reload and try again.",
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = await db.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
        roles: { create: roleRows.map((role) => ({ roleId: role.id })) },
      },
      select: { id: true },
    });

    revalidateUser(user.id);
    return {
      data: { id: user.id },
      message: "User created.",
      audit: {
        action: "user.created",
        entityType: "user",
        entityId: user.id,
        summary: `Created user ${email}`,
        metadata: { roles: input.roles },
      },
    };
  },
});

/** Name and active flag. Deactivating destroys every session the user holds. */
export const updateUserProfile = defineAdminAction({
  name: "users.update_profile",
  permission: "user:write",
  schema: z.object({ id, name: nameField, active: checkbox }),
  handler: async ({ input, session }) => {
    const target = await loadTargetOrThrow(input.id);
    const isSelf = session.user.id === target.id;

    assertNotSelfDeactivation({ isSelf, nextActive: input.active });
    await assertNotLastActiveSuperAdmin(getDb(), {
      targetUserId: target.id,
      currentRoleKeys: target.roleKeys,
      nextActive: input.active,
      nextRoleKeys: target.roleKeys,
    });

    await getDb().user.update({
      where: { id: target.id },
      data: { name: input.name, isActive: input.active },
    });
    const deactivated = target.isActive && !input.active;
    if (deactivated) await destroyAllSessionsForUser(target.id);

    revalidateUser(target.id);
    return {
      data: { id: target.id },
      message: deactivated ? "User deactivated and its sessions signed out." : "Profile updated.",
      audit: {
        action: "user.updated",
        entityType: "user",
        entityId: target.id,
        summary: `Updated ${target.email}`,
        metadata: { name: input.name, active: input.active },
      },
    };
  },
});

/** Quick deactivate/reactivate from the list, without opening the edit form. */
export const setUserActive = defineAdminAction({
  name: "users.set_active",
  permission: "user:write",
  schema: z.object({ id, active: checkbox }),
  handler: async ({ input, session }) => {
    const target = await loadTargetOrThrow(input.id);
    const isSelf = session.user.id === target.id;

    assertNotSelfDeactivation({ isSelf, nextActive: input.active });
    await assertNotLastActiveSuperAdmin(getDb(), {
      targetUserId: target.id,
      currentRoleKeys: target.roleKeys,
      nextActive: input.active,
      nextRoleKeys: target.roleKeys,
    });

    await getDb().user.update({ where: { id: target.id }, data: { isActive: input.active } });
    const deactivated = target.isActive && !input.active;
    if (deactivated) await destroyAllSessionsForUser(target.id);

    revalidateUser(target.id);
    return {
      data: { id: target.id, active: input.active },
      message: input.active ? "User reactivated." : "User deactivated and its sessions signed out.",
      audit: {
        action: input.active ? "user.reactivated" : "user.deactivated",
        entityType: "user",
        entityId: target.id,
        summary: `${input.active ? "Reactivated" : "Deactivated"} ${target.email}`,
      },
    };
  },
});

/** Replaces the roles a user holds. Always destroys every session of the user afterwards. */
export const updateUserRoles = defineAdminAction({
  name: "users.update_roles",
  permission: "user:assign-role",
  schema: z.object({ id, roles: roleKeysField }),
  handler: async ({ input, session }) => {
    const target = await loadTargetOrThrow(input.id);
    const isSelf = session.user.id === target.id;

    assertSuperAdminRoleChangeAllowed({
      actorRoleKeys: session.roles,
      currentRoleKeys: target.roleKeys,
      nextRoleKeys: input.roles,
    });
    assertNotSelfSuperAdminRemoval({
      isSelf,
      currentRoleKeys: target.roleKeys,
      nextRoleKeys: input.roles,
    });
    const db = getDb();
    await assertNotLastActiveSuperAdmin(db, {
      targetUserId: target.id,
      currentRoleKeys: target.roleKeys,
      nextActive: target.isActive,
      nextRoleKeys: input.roles,
    });

    const roleRows = await db.role.findMany({
      where: { key: { in: input.roles } },
      select: { id: true, key: true },
    });
    if (roleRows.length !== new Set(input.roles).size) {
      throw new AdminActionError(
        "One of the selected roles no longer exists. Reload and try again.",
      );
    }

    await db.$transaction([
      db.userRole.deleteMany({ where: { userId: target.id } }),
      db.userRole.createMany({
        data: roleRows.map((role) => ({ userId: target.id, roleId: role.id })),
      }),
    ]);
    await destroyAllSessionsForUser(target.id);

    revalidateUser(target.id);
    return {
      data: { id: target.id },
      message: "Roles updated. The user's other sessions were signed out.",
      audit: {
        action: "user.roles_updated",
        entityType: "user",
        entityId: target.id,
        summary: `Updated roles for ${target.email}`,
        metadata: { roles: input.roles },
      },
    };
  },
});

/** Clears a lockout so the user can sign in again immediately. */
export const unlockUser = defineAdminAction({
  name: "users.unlock",
  permission: "user:write",
  schema: z.object({ id }),
  handler: async ({ input }) => {
    const target = await loadTargetOrThrow(input.id);
    await getDb().user.update({
      where: { id: target.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    revalidateUser(target.id);
    return {
      data: { id: target.id },
      message: "Account unlocked.",
      audit: {
        action: "user.unlocked",
        entityType: "user",
        entityId: target.id,
        summary: `Unlocked ${target.email}`,
      },
    };
  },
});

/** Sets a new password chosen by the admin and signs the user out everywhere. Never logs the password. */
export const resetUserPassword = defineAdminAction({
  name: "users.reset_password",
  permission: "user:write",
  schema: z.object({ id, password: newPasswordField, confirmPassword: newPasswordField }),
  handler: async ({ input }) => {
    const target = await loadTargetOrThrow(input.id);
    if (input.password !== input.confirmPassword) {
      throw new AdminActionError("The password and its confirmation do not match.", {
        confirmPassword: ["The password and its confirmation do not match."],
      });
    }
    const strength = validatePasswordStrength(input.password, target.email);
    if (!strength.ok) {
      throw new AdminActionError(strength.reason, { password: [strength.reason] });
    }

    const passwordHash = await hashPassword(input.password);
    await getDb().user.update({
      where: { id: target.id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    });
    await destroyAllSessionsForUser(target.id);

    revalidateUser(target.id);
    return {
      data: { id: target.id },
      message: "Password reset. The user's sessions were signed out.",
      audit: {
        action: "user.password_reset",
        entityType: "user",
        entityId: target.id,
        summary: `Reset password for ${target.email}`,
      },
    };
  },
});
