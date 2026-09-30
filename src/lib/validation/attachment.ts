import { z } from "zod";
import { messageKey, type MessageKey } from "./message-key";

/** What the browser knows about a chosen file; the server re-checks the real bytes. */
export interface FileLike {
  readonly name: string;
  readonly size: number;
}

/** The upload rules a form shows and pre-checks, from describeUploadPolicy on the server. */
export interface UploadRules {
  readonly maxBytes: number;
  /** Canonical extensions without a dot ("pdf", "jpg", ...). */
  readonly extensions: readonly string[];
}

const BYTES_PER_MIB = 1024 * 1024;

export function isFileLike(value: unknown): value is FileLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as FileLike).name === "string" &&
    typeof (value as FileLike).size === "number"
  );
}

/** Megabytes for display, to one decimal ("5", "2.5"). */
export function toMegabytes(bytes: number): number {
  return Math.round((bytes / BYTES_PER_MIB) * 10) / 10;
}

/** The policy lists "jpg"; the same JPEG files are also named ".jpeg". */
export function acceptedExtensions(rules: UploadRules): string[] {
  return rules.extensions.includes("jpg") ? [...rules.extensions, "jpeg"] : [...rules.extensions];
}

/** Cheap checks that spare a round trip. The server decides from the file's contents. */
export function checkAttachment(file: FileLike, rules: UploadRules): MessageKey | null {
  if (file.size === 0) return messageKey("errors.upload.empty");
  if (file.size > rules.maxBytes) {
    return messageKey("validation.fileTooLarge", { max: toMegabytes(rules.maxBytes) });
  }
  const dot = file.name.lastIndexOf(".");
  const extension = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  return acceptedExtensions(rules).includes(extension) ? null : messageKey("validation.fileType");
}

export function attachmentField(rules: UploadRules) {
  return z
    .custom<FileLike | null>((value) => value === null || isFileLike(value), {
      error: messageKey("validation.invalid"),
    })
    .superRefine((file, context) => {
      const problem = file ? checkAttachment(file, rules) : null;
      if (problem) context.addIssue({ code: "custom", message: problem });
    });
}

/** How an extension is written on screen: "PDF", "JPG", and "WebP" as its makers spell it. */
export function displayExtension(extension: string): string {
  return extension === "webp" ? "WebP" : extension.toUpperCase();
}
