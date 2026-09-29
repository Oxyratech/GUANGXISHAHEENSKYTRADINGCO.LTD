/**
 * Database failure taxonomy. Callers catch DatabaseUnavailableError to show a friendly, truthful
 * message ("we could not save your request right now") instead of a stack trace — and never a
 * fake success.
 */
export type DatabaseUnavailableCause = "not_configured" | "connection" | "timeout";

export class DatabaseUnavailableError extends Error {
  override readonly cause: DatabaseUnavailableCause;

  constructor(message: string, options: { cause: DatabaseUnavailableCause }) {
    super(message);
    this.name = "DatabaseUnavailableError";
    this.cause = options.cause;
  }
}

const CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ESOCKET",
  "ELOGIN",
  "EINSTLOOKUP",
  "P1000", // authentication failed
  "P1001", // can't reach database server
  "P1017", // server closed the connection
]);
const TIMEOUT_CODES = new Set(["ETIMEOUT", "ETIMEDOUT", "P1002", "P2024"]);

function readCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/** Heuristic: is this error about reaching / authenticating to the database (not a query bug)? */
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof DatabaseUnavailableError) return true;
  const code = readCode(error);
  if (code && (CONNECTION_CODES.has(code) || TIMEOUT_CODES.has(code))) return true;
  const name = error instanceof Error ? error.name : "";
  return name === "PrismaClientInitializationError";
}

/** Normalises connection-level failures to DatabaseUnavailableError; returns other errors as-is. */
export function toDatabaseError(error: unknown): unknown {
  if (error instanceof DatabaseUnavailableError) return error;
  if (!isDatabaseUnavailableError(error)) return error;
  const code = readCode(error);
  const message = error instanceof Error ? error.message : "Database unavailable";
  return new DatabaseUnavailableError(message, {
    cause: code && TIMEOUT_CODES.has(code) ? "timeout" : "connection",
  });
}
