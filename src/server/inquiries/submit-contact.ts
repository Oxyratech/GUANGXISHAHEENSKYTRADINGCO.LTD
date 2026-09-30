import "server-only";
import { logger } from "@/lib/logger";
import { contactSchema } from "@/lib/validation/contact";
import { isDatabaseConfigured } from "@/server/db";
import { getRequestContext } from "@/server/http/request-context";
import { queueContactNotification } from "@/server/notifications";
import { createContactMessage } from "./create-contact-message";
import { DATABASE_UNAVAILABLE, failureFromError } from "./failure";
import { collectIssues, readSubmission } from "./form-data";
import { guardSubmission } from "./guard";
import type { ActionResult } from "./types";

/**
 * A contact form post. Same contract as an inquiry: success only once the message is stored, an
 * honest error otherwise, and it never throws.
 */
export async function handleContactSubmission(formData: FormData): Promise<ActionResult> {
  const guard = await guardSubmission({ formData, scope: "contact", prefix: "MSG" });
  if (!guard.proceed) return guard.result;

  if (!isDatabaseConfigured()) {
    logger.warn("contact.database_not_configured");
    return DATABASE_UNAVAILABLE;
  }

  const submission = readSubmission(formData);
  const parsed = contactSchema.safeParse(submission.fields);
  if (!parsed.success) return { ok: false, ...collectIssues(parsed.error.issues) };

  try {
    const { ipHash, userAgent } = await getRequestContext();
    const submittedAt = new Date();
    const created = await createContactMessage({
      data: parsed.data,
      locale: submission.locale,
      ipHash,
      userAgent,
      consentAcceptedAt: submittedAt,
    });

    logger.info("contact.created", {
      messageId: created.id,
      referenceCode: created.referenceCode,
      locale: submission.locale,
    });
    queueContactNotification({
      referenceCode: created.referenceCode,
      submittedAt,
      locale: submission.locale,
      data: parsed.data,
    });
    return { ok: true, referenceCode: created.referenceCode };
  } catch (error) {
    return failureFromError("contact", error);
  }
}
