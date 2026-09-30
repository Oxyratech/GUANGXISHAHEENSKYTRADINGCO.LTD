"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { asDatabaseOutage } from "@/server/admin/access";
import { sanitizeAdminNextPath } from "@/server/admin/next-path";
import { authenticate } from "@/server/auth/login";
import { createSession } from "@/server/auth/session";
import { isDatabaseConfigured } from "@/server/db";
import { getRequestContext } from "@/server/http/request-context";
import type { LoginErrorCode, LoginState } from "./login-state";

const loginSchema = z.object({
  email: z
    .string({ error: "Enter your email address." })
    .trim()
    .min(1, "Enter your email address.")
    .max(254, "Enter your email address."),
  password: z
    .string({ error: "Enter your password." })
    .min(1, "Enter your password.")
    // Bounds the work scrypt is asked to do for one request; real passwords are far shorter.
    .max(1024, "Enter your password."),
  next: z.string().max(2000).optional(),
});

const MESSAGES: Record<Exclude<LoginErrorCode, "invalid_input" | "internal">, string> = {
  // One message for an unknown email, a wrong password and a deactivated account: the page must not
  // say which addresses have accounts.
  invalid_credentials: "The email or password is incorrect.",
  locked:
    "This account is temporarily locked after too many failed sign-in attempts. Try again in about 15 minutes.",
  rate_limited:
    "Too many sign-in attempts from this connection. Wait about 15 minutes and try again.",
  not_configured:
    "The admin area needs a database connection (DATABASE_URL). See docs/DATABASE.md.",
  unavailable:
    "The database is not available right now, so sign-in is not possible. Try again shortly.",
};

function failure(code: keyof typeof MESSAGES, email: string): LoginState {
  return { status: "error", code, message: MESSAGES[code], email };
}

/**
 * Signs a person in: validates the form, checks the credentials (which rate-limits, locks and audits),
 * starts the session and redirects. The password is used once and never appears in a returned
 * state, a log line or an error message. `next` is only honoured when it is an internal /admin path.
 */
export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? undefined,
    password: formData.get("password") ?? undefined,
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors;
    const submittedEmail = formData.get("email");
    return {
      status: "error",
      code: "invalid_input",
      message: "Enter your email address and password.",
      fieldErrors: { email: errors.email?.[0], password: errors.password?.[0] },
      ...(typeof submittedEmail === "string" ? { email: submittedEmail.slice(0, 254) } : {}),
    };
  }
  const { email, password, next } = parsed.data;

  if (!isDatabaseConfigured()) return failure("not_configured", email);

  try {
    const request = await getRequestContext();
    const context = { ipHash: request.ipHash, userAgent: request.userAgent };

    const result = await authenticate({ email, password, ctx: context });
    if (!result.ok) return failure(result.reason, email);

    await createSession(result.userId, context);
  } catch (error) {
    if (asDatabaseOutage(error)) return failure("unavailable", email);

    const reference = randomBytes(4).toString("hex").toUpperCase();
    logger.error("admin.login_failed", { reference, error });
    return {
      status: "error",
      code: "internal",
      message: `Sign-in failed because of an unexpected error. Reference: ${reference}.`,
      email,
    };
  }

  // Outside the try block: redirect() works by throwing, and the catch above must not see it.
  redirect(sanitizeAdminNextPath(next));
}
