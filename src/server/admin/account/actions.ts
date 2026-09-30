"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { AdminActionError, defineAdminAction } from "@/server/admin/action";
import { ADMIN_LOGIN_PATH } from "@/server/admin/next-path";
import { writeAudit } from "@/server/audit";
import { requireSessionOrThrow } from "@/server/auth/authorize";
import { destroyAllSessionsForUser, destroySession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getRequestContext } from "@/server/http/request-context";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/security/password";

/*
 * Self-service actions for the signed-in user's own Account page. There is no permission that gates
 * "manage your own account": every seeded role holds dashboard:read (it is every user's landing
 * page), so it is used here as the "any signed-in admin user" check, and defineAdminAction's pipeline
 * (validation, audit, error mapping) applies the same as everywhere else.
 */

const currentPasswordField = z
  .string({ error: "Enter your current password." })
  .min(1, "Enter your current password.")
  .max(1024, "Enter your current password.");
const newPasswordField = z
  .string({ error: "Enter a new password." })
  .min(1, "Enter a new password.")
  .max(128, "At most 128 characters.");

/**
 * Changes the caller's own password. Requires the current password, destroys every *other* session
 * of the account and keeps the one making the request, so the person is not signed out by their own
 * change. Never logs a password.
 */
export const changeOwnPassword = defineAdminAction({
  name: "account.change_password",
  permission: "dashboard:read",
  schema: z.object({
    currentPassword: currentPasswordField,
    newPassword: newPasswordField,
    confirmPassword: newPasswordField,
  }),
  handler: async ({ input, session }) => {
    const db = getDb();
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) throw new AdminActionError("Your account could not be found. Sign in again.");

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new AdminActionError("Current password is incorrect.", {
        currentPassword: ["Current password is incorrect."],
      });
    }
    if (input.newPassword !== input.confirmPassword) {
      throw new AdminActionError("The new password and its confirmation do not match.", {
        confirmPassword: ["The new password and its confirmation do not match."],
      });
    }
    const strength = validatePasswordStrength(input.newPassword, user.email);
    if (!strength.ok) {
      throw new AdminActionError(strength.reason, { newPassword: [strength.reason] });
    }

    const passwordHash = await hashPassword(input.newPassword);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });
    // Keep the session making this request; drop every other one the account holds.
    await db.session.deleteMany({ where: { userId: user.id, id: { not: session.sessionId } } });

    return {
      data: null,
      message: "Password changed. Your other sessions were signed out.",
      audit: {
        action: "account.password_changed",
        entityType: "user",
        entityId: user.id,
        summary: "Changed own password",
      },
    };
  },
});

/**
 * Signs the account out of every session, including the one making this request, and sends the
 * person back to the login page. A plain redirecting action (like the shell's sign-out), not a
 * defineAdminAction: there is no form state to show once the visitor is on their way to /admin/login.
 */
export async function signOutEverywhereAction(): Promise<void> {
  const session = await requireSessionOrThrow();
  const count = await destroyAllSessionsForUser(session.user.id);
  await destroySession();

  try {
    const { ipHash } = await getRequestContext();
    await writeAudit({
      actor: { id: session.user.id, email: session.user.email },
      action: "account.signed_out_everywhere",
      entityType: "user",
      entityId: session.user.id,
      summary: "Signed out of every session from the Account page",
      metadata: { sessionCount: count },
      ipHash,
    });
  } catch (error) {
    logger.warn("account.sign_out_everywhere_audit_failed", { error });
  }

  redirect(ADMIN_LOGIN_PATH);
}
