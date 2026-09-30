import "server-only";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locales";
import { messageKey, normalizeMessageKey, type MessageKey } from "@/lib/validation/message-key";
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/server/security/anti-spam";

/** Fields that belong to the plumbing, not to the schema. */
const ATTACHMENT_FIELD = "attachment";
const LOCALE_FIELD = "locale";
const PLUMBING_FIELDS: ReadonlySet<string> = new Set([
  HONEYPOT_FIELD,
  FORM_TOKEN_FIELD,
  LOCALE_FIELD,
  ATTACHMENT_FIELD,
]);
/** React adds these to a form that submits to a Server Action. */
const FRAMEWORK_FIELD_PREFIX = "$ACTION_";

const TRUE_VALUES: ReadonlySet<string> = new Set(["true", "on", "1"]);

export interface Submission {
  /** Schema input: every submitted field except the plumbing. Values are strings, or a boolean for consent. */
  fields: Record<string, unknown>;
  locale: Locale;
  /** The chosen file; null when none was chosen (a browser sends an empty, nameless part). */
  attachment: File | null;
}

/**
 * Reads a form post into schema input. Only the first value of a repeated field is used. Unknown
 * fields are passed through on purpose so a strict schema can reject them.
 */
export function readSubmission(formData: FormData): Submission {
  const fields: Record<string, unknown> = {};
  for (const [name, value] of formData.entries()) {
    if (PLUMBING_FIELDS.has(name) || name.startsWith(FRAMEWORK_FIELD_PREFIX)) continue;
    if (name in fields) continue;
    fields[name] = name === "consent" && typeof value === "string" ? TRUE_VALUES.has(value) : value;
  }

  const locale = formData.get(LOCALE_FIELD);
  const attachment = formData.get(ATTACHMENT_FIELD);
  const hasFile = attachment instanceof File && !(attachment.size === 0 && attachment.name === "");

  return {
    fields,
    locale: typeof locale === "string" && isLocale(locale) ? locale : DEFAULT_LOCALE,
    attachment: hasFile ? attachment : null,
  };
}

/** Text of a form field for the anti-spam guard, which only wants it to rate-limit by e-mail. */
export function readEmailField(formData: FormData): string | undefined {
  const email = formData.get("email");
  return typeof email === "string" && email.length > 0 && email.length <= 254 ? email : undefined;
}

interface IssueLike {
  code: string;
  path: readonly PropertyKey[];
  message: string;
}

export interface ValidationFailure {
  fieldErrors: Record<string, MessageKey>;
  formError?: MessageKey;
}

/**
 * Field-name -> message key for the first problem of every field. A problem that belongs to no
 * field (an unexpected key) has nothing to point at, so it becomes a general form error.
 */
export function collectIssues(issues: readonly IssueLike[]): ValidationFailure {
  const fieldErrors: Record<string, MessageKey> = {};
  let formError: MessageKey | undefined;
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && issue.code !== "unrecognized_keys") {
      fieldErrors[field] ??= normalizeMessageKey(issue.message);
    } else {
      formError ??= messageKey("errors.form.generic");
    }
  }
  return { fieldErrors, formError };
}
