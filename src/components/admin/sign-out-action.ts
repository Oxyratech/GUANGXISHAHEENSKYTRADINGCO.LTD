"use server";

import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { ADMIN_LOGIN_PATH } from "@/server/admin/next-path";
import { writeAudit } from "@/server/audit";
import { destroySession, getSession, type AuthSession } from "@/server/auth/session";
import { getRequestContext } from "@/server/http/request-context";

/**
 * Signs the user out. A Server Action posted by a form, never a link, so a GET (prefetch, an image
 * tag on another site) cannot end anyone's session. The cookie is cleared even when the database is
 * down, and the audit entry is best effort: neither can keep a person from leaving.
 */
export async function signOutAction(): Promise<void> {
  let session: AuthSession | null = null;
  try {
    session = await getSession();
  } catch (error) {
    logger.warn("admin.sign_out_session_unavailable", { error });
  }

  await destroySession();

  if (session) {
    try {
      const { ipHash } = await getRequestContext();
      await writeAudit({
        actor: { id: session.user.id, email: session.user.email },
        action: "auth.logout",
        entityType: "user",
        entityId: session.user.id,
        summary: "Signed out",
        ipHash,
      });
    } catch (error) {
      logger.warn("admin.sign_out_audit_failed", { error });
    }
  }
  redirect(ADMIN_LOGIN_PATH);
}
