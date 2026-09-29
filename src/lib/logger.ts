/**
 * Structured logger: one JSON object per line on stdout/stderr, so a log shipper (Azure Monitor,
 * Vercel, Docker) can parse it without configuration.
 *
 * Every field is passed through `redact` before it is written: values under secret-looking keys are
 * replaced, long strings are truncated and errors are flattened. Callers should still avoid putting
 * personal data in fields (log a hash or an id instead of an email or IP).
 *
 * This is the only file in the code base allowed to call `console.*`.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogLevelSetting = LogLevel | "silent";

const LEVEL_ORDER: Record<LogLevelSetting, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/** Keys whose values are never logged. Deliberately broad: a false positive costs nothing. */
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|set-cookie/i;

const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 1000;
const MAX_STACK_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 5;

function truncate(value: string, max = MAX_STRING_LENGTH): string {
  return value.length > max ? `${value.slice(0, max)}…[+${value.length - max} chars]` : value;
}

function redactError(error: Error, depth: number, seen: WeakSet<object>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: error.name,
    message: truncate(error.message),
  };
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" || typeof code === "number") out.code = code;
  if (error.stack) out.stack = truncate(error.stack, MAX_STACK_LENGTH);
  if (error.cause !== undefined) out.cause = walk(error.cause, depth + 1, seen);
  return out;
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  switch (typeof value) {
    case "string":
      return truncate(value);
    case "number":
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "function":
    case "symbol":
      return undefined;
  }

  const obj = value as object;
  if (seen.has(obj)) return "[Circular]";
  if (depth >= MAX_DEPTH) return "[MaxDepth]";
  seen.add(obj);

  try {
    if (obj instanceof Error) return redactError(obj, depth, seen);
    if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? null : obj.toISOString();
    if (ArrayBuffer.isView(obj)) return `[binary ${obj.byteLength} bytes]`;
    if (obj instanceof ArrayBuffer) return `[binary ${obj.byteLength} bytes]`;
    if (Array.isArray(obj)) {
      const items = obj.slice(0, MAX_ARRAY_ITEMS).map((item) => walk(item, depth + 1, seen));
      if (obj.length > MAX_ARRAY_ITEMS) items.push(`[+${obj.length - MAX_ARRAY_ITEMS} more]`);
      return items;
    }

    const out: Record<string, unknown> = {};
    const entries = Object.entries(obj);
    for (const [key, item] of entries.slice(0, MAX_OBJECT_KEYS)) {
      const safe = SENSITIVE_KEY.test(key) ? REDACTED : walk(item, depth + 1, seen);
      if (safe !== undefined) out[key] = safe;
    }
    if (entries.length > MAX_OBJECT_KEYS)
      out["…"] = `[+${entries.length - MAX_OBJECT_KEYS} more keys]`;
    return out;
  } finally {
    // Only ancestors count as cycles: the same object appearing in two branches is fine.
    seen.delete(obj);
  }
}

/** Returns a JSON-safe copy of `value` with secret-keyed values replaced and oversize data cut. */
export function redact(value: unknown): unknown {
  return walk(value, 0, new WeakSet());
}

function activeThreshold(): number {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (configured && configured in LEVEL_ORDER) return LEVEL_ORDER[configured as LogLevelSetting];
  if (process.env.NODE_ENV === "test") return LEVEL_ORDER.silent;
  return process.env.NODE_ENV === "production" ? LEVEL_ORDER.info : LEVEL_ORDER.debug;
}

function emit(level: LogLevel, event: string, fields?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < activeThreshold()) return;

  const record: Record<string, unknown> = { ts: new Date().toISOString(), level, event };
  if (fields && Object.keys(fields).length > 0) record.fields = redact(fields);

  let line: string;
  try {
    line = JSON.stringify(record);
  } catch {
    line = JSON.stringify({ ts: record.ts, level, event, fields: "[unserialisable]" });
  }

  switch (level) {
    case "error":
      // eslint-disable-next-line no-console
      console.error(line);
      break;
    case "warn":
      // eslint-disable-next-line no-console
      console.warn(line);
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(line);
  }
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};
