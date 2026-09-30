import "server-only";
import { logger } from "@/lib/logger";
import { messageKey } from "@/lib/validation/message-key";
import { guardPublicSubmission } from "@/server/security/anti-spam";
import { readEmailField } from "./form-data";
import { generateReferenceCode, type ReferencePrefix } from "./reference-code";
import type { ActionResult } from "./types";

export type GuardOutcome = { proceed: true } | { proceed: false; result: ActionResult };

/**
 * The public-form checks, mapped to what the visitor is told. A filled honeypot is answered like a
 * success (with a code that was never stored) so a bot learns nothing from the reply; the other
 * refusals are honest, because a real visitor can act on them.
 */
export async function guardSubmission(args: {
  formData: FormData;
  scope: "inquiry" | "contact";
  prefix: ReferencePrefix;
}): Promise<GuardOutcome> {
  const { formData, scope, prefix } = args;
  const outcome = await guardPublicSubmission({
    formData,
    scope,
    email: readEmailField(formData),
  });
  if (outcome.ok) return { proceed: true };

  logger.info(`${scope}.submission_refused`, { code: outcome.code });
  switch (outcome.code) {
    case "spam":
      return { proceed: false, result: { ok: true, referenceCode: generateReferenceCode(prefix) } };
    case "rate_limited":
      return {
        proceed: false,
        result: { ok: false, formError: messageKey("errors.form.rateLimited") },
      };
    case "too_fast":
      return {
        proceed: false,
        result: { ok: false, formError: messageKey("errors.form.tooFast") },
      };
    case "expired":
      return {
        proceed: false,
        result: { ok: false, formError: messageKey("validation.formExpired") },
      };
  }
}
