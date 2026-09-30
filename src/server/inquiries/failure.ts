import "server-only";
import { logger } from "@/lib/logger";
import { messageKey, type MessageKey } from "@/lib/validation/message-key";
import { DatabaseUnavailableError, toDatabaseError } from "@/server/db";
import type { UploadErrorCode } from "@/server/storage";
import type { ActionResult } from "./types";

type Failure = Extract<ActionResult, { ok: false }>;

export const DATABASE_UNAVAILABLE: Failure = {
  ok: false,
  formError: messageKey("errors.form.databaseUnavailable"),
};

const UPLOAD_ERRORS = {
  too_large: messageKey("errors.upload.tooLarge"),
  empty: messageKey("errors.upload.empty"),
  type_not_allowed: messageKey("errors.upload.typeNotAllowed"),
  mismatch: messageKey("errors.upload.mismatch"),
  image_too_large_pixels: messageKey("errors.upload.imageTooLarge"),
  read_failed: messageKey("errors.upload.readFailed"),
} as const satisfies Record<UploadErrorCode, MessageKey>;

/** A refused attachment is a problem with the file field, so it is shown next to it. */
export function uploadFailure(code: UploadErrorCode): Failure {
  return { ok: false, fieldErrors: { attachment: UPLOAD_ERRORS[code] } };
}

/**
 * Anything that escaped a submission. A database that cannot be reached is a known, honest state;
 * everything else is a bug and is logged in full, but the visitor never sees more than "try again".
 */
export function failureFromError(scope: "inquiry" | "contact", error: unknown): Failure {
  const cause = toDatabaseError(error);
  if (cause instanceof DatabaseUnavailableError) {
    logger.warn(`${scope}.database_unavailable`, { cause: cause.cause });
    return DATABASE_UNAVAILABLE;
  }
  logger.error(`${scope}.submission_failed`, { error });
  return { ok: false, formError: messageKey("errors.form.generic") };
}
