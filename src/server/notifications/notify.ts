import "server-only";
import { after } from "next/server";
import { logger } from "@/lib/logger";
import { readMailConfig, sendMail } from "./mailer";
import {
  buildContactEmail,
  buildInquiryEmail,
  type ContactNotification,
  type EmailContent,
  type InquiryNotification,
} from "./templates";

type Kind = "inquiry" | "contact";

/** Delivery errors carry addresses; log only what identifies the failure, never the recipient. */
function describeMailError(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) return { name: "UnknownError" };
  const { name, code, responseCode } = error as {
    name?: unknown;
    code?: unknown;
    responseCode?: unknown;
  };
  return { name, code, responseCode };
}

async function deliver(
  kind: Kind,
  referenceCode: string,
  replyTo: string,
  build: () => EmailContent,
): Promise<void> {
  try {
    const config = readMailConfig();
    if (!config) {
      logger.debug("notification.skipped", { kind, reason: "not_configured" });
      return;
    }
    await sendMail(config, { ...build(), replyTo });
    logger.info("notification.sent", { kind, referenceCode });
  } catch (error) {
    // The submission is already stored; a mail problem must not undo or delay it.
    logger.warn("notification.failed", { kind, referenceCode, ...describeMailError(error) });
  }
}

/** E-mails the company inbox about a stored inquiry. Never rejects. */
export function notifyInquiryReceived(details: InquiryNotification): Promise<void> {
  return deliver("inquiry", details.referenceCode, details.data.email, () =>
    buildInquiryEmail(details),
  );
}

/** E-mails the company inbox about a stored contact message. Never rejects. */
export function notifyContactReceived(details: ContactNotification): Promise<void> {
  return deliver("contact", details.referenceCode, details.data.email, () =>
    buildContactEmail(details),
  );
}

/**
 * Runs `task` once the response has been sent, so a slow or dead mail server cannot delay the
 * visitor's confirmation. Outside a request (tests, scripts) there is no "after"; the task then
 * just starts in the background.
 */
function runAfterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}

export function queueInquiryNotification(details: InquiryNotification): void {
  runAfterResponse(() => notifyInquiryReceived(details));
}

export function queueContactNotification(details: ContactNotification): void {
  runAfterResponse(() => notifyContactReceived(details));
}
