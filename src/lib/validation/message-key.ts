import type { Messages } from "@/i18n/messages";

/**
 * Messages that travel between the schemas, the server actions and the forms are translation keys,
 * never sentences: the server does not know the visitor's language, the browser does. A key is the
 * path of a message in the catalogue, optionally followed by ICU arguments in query-string form:
 * "validation.tooLong?max=120". Arguments are numbers or plain tokens, so nothing needs escaping.
 */
type BaseMessageKey =
  | `validation.${keyof Messages["validation"]}`
  | `errors.form.${keyof Messages["errors"]["form"]}`
  | `errors.upload.${keyof Messages["errors"]["upload"]}`
  | "errors.databaseUnavailable"
  | "errors.network";

export type MessageKey = BaseMessageKey | `${BaseMessageKey}?${string}`;

export type MessageValues = Readonly<Record<string, string | number>>;

/** What a message renders when a string that is not one of our keys reaches the UI. */
const FALLBACK_KEY: BaseMessageKey = "validation.invalid";

export function messageKey(key: BaseMessageKey, values?: MessageValues): MessageKey {
  if (!values || Object.keys(values).length === 0) return key;
  const query = new URLSearchParams(Object.entries(values).map(([k, v]) => [k, String(v)]));
  return `${key}?${query.toString()}`;
}

const NUMERIC = /^-?\d+(?:\.\d+)?$/;
const KEY_PATTERN = /^(?:validation|errors)\.[A-Za-z][A-Za-z0-9.]*$/;

/** Splits a key into its catalogue path and ICU arguments. Anything unrecognised becomes a safe fallback. */
export function parseMessageKey(input: string): {
  key: string;
  values: Record<string, string | number>;
} {
  const separator = input.indexOf("?");
  const key = separator === -1 ? input : input.slice(0, separator);
  if (!KEY_PATTERN.test(key)) return { key: FALLBACK_KEY, values: {} };

  const values: Record<string, string | number> = {};
  if (separator !== -1) {
    for (const [name, value] of new URLSearchParams(input.slice(separator + 1))) {
      values[name] = NUMERIC.test(value) ? Number(value) : value;
    }
  }
  return { key, values };
}

/** A translator over the whole catalogue: `useTranslations()` in the browser, `getTranslations()` on the server. */
export type MessageTranslator = (key: never, values?: Record<string, string | number>) => string;

/** Keeps a message that is one of our keys and replaces anything else (a zod default sentence, say) with a generic one. */
export function normalizeMessageKey(message: string): MessageKey {
  const { key, values } = parseMessageKey(message);
  return messageKey(key as BaseMessageKey, values);
}

/** Turns a message key from a schema or an action result into text in the visitor's language. */
export function resolveMessage(t: MessageTranslator, input: string): string {
  const { key, values } = parseMessageKey(input);
  return t(key as never, values);
}
