/**
 * The complete vocabulary of analytics events. Analytics here means aggregate, cookieless counts
 * (Plausible): how many people looked at a product or started an inquiry, never who they are.
 */
export const ANALYTICS_EVENTS = [
  "page_view",
  "product_view",
  "inquiry_started",
  "inquiry_submitted",
  "contact_submitted",
  "language_changed",
  "document_viewed",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/**
 * The only property names an event may carry. They describe the content being looked at (a slug, a
 * locale, where a form was opened from), never a person: no names, emails, phone numbers, message
 * text or identifiers of any kind.
 */
export const ANALYTICS_PROP_KEYS = [
  "locale",
  "from",
  "to",
  "category",
  "service",
  "product",
  "document",
  "source",
] as const;

type AnalyticsPropKey = (typeof ANALYTICS_PROP_KEYS)[number];

type AnalyticsPropValue = string | number | boolean;

export type AnalyticsProps = Partial<Record<AnalyticsPropKey, AnalyticsPropValue>>;

const MAX_STRING_LENGTH = 64;
/** Slug-like tokens only: letters, digits, dot, dash, underscore. Spaces and "@" cannot appear. */
const SAFE_TOKEN = /^[A-Za-z0-9._-]+$/;
/** Seven or more digits in a row is what a phone number looks like. */
const LOOKS_LIKE_PHONE_NUMBER = /\d{7,}/;

function isSafeValue(value: unknown): value is AnalyticsPropValue {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return (
    typeof value === "string" &&
    value.length <= MAX_STRING_LENGTH &&
    SAFE_TOKEN.test(value) &&
    !LOOKS_LIKE_PHONE_NUMBER.test(value)
  );
}

/**
 * Keeps only allow-listed keys with short, token-like primitive values. TypeScript already limits
 * what callers may pass; this is the runtime guarantee that nothing else can leave the browser.
 */
export function sanitizeProps(
  props: Readonly<Record<string, unknown>> | undefined,
): AnalyticsProps {
  if (!props) return {};
  const clean: AnalyticsProps = {};
  for (const key of ANALYTICS_PROP_KEYS) {
    const value = props[key];
    if (isSafeValue(value)) clean[key] = value;
  }
  return clean;
}
