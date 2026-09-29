import "server-only";
import { logger } from "@/lib/logger";
import { getDb } from "@/server/db";
import { hmacHex } from "./hash";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  inquiry: { limit: 5, windowSeconds: 3600 },
  contact: { limit: 5, windowSeconds: 3600 },
  login: { limit: 10, windowSeconds: 900 },
  upload: { limit: 10, windowSeconds: 3600 },
} as const satisfies Record<string, Omit<RateLimitOptions, "key">>;

/**
 * Builds a counter key from a scope and identifying parts (IP hash, email, ...). The parts are
 * HMAC-ed, so the table holds neither raw emails nor reversible IP hashes.
 */
export function rateLimitKey(scope: string, ...parts: string[]): string {
  return `${scope}:${hmacHex(`rl:${scope}:${parts.join("\u0000")}`).slice(0, 48)}`;
}

/*
 * Fixed-window counter shared by every server instance through the RateLimitCounter table.
 *
 * Atomicity: a read-then-write (SELECT, then INSERT/UPDATE) lets two concurrent requests both see
 * "count = 4" and both pass a limit of 5. A single MERGE ... WITH (HOLDLOCK) takes a range lock for
 * the key, so the check-and-increment is one atomic statement, including the first insert (no
 * unique-key race) and the window rollover. It needs no transaction and no retry loop, and it
 * returns the new count in the same round trip. Prisma has no native upsert-with-increment that is
 * atomic on SQL Server, hence the parameterised raw query (values are bound, never interpolated).
 */
async function consumeFromDatabase(opts: RateLimitOptions, now: number): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = opts;
  const nowDate = new Date(now);
  const nextReset = new Date(now + windowSeconds * 1000);

  const rows = await getDb().$queryRaw<{ count: number | bigint; resetAt: Date | string }[]>`
    MERGE [RateLimitCounter] WITH (HOLDLOCK) AS target
    USING (SELECT ${key} AS [key]) AS source
      ON target.[key] = source.[key]
    WHEN MATCHED AND target.[resetAt] <= CAST(${nowDate} AS DATETIME2) THEN
      UPDATE SET [count] = 1, [resetAt] = CAST(${nextReset} AS DATETIME2)
    WHEN MATCHED THEN
      UPDATE SET [count] = target.[count] + 1
    WHEN NOT MATCHED THEN
      INSERT ([key], [count], [resetAt]) VALUES (source.[key], 1, CAST(${nextReset} AS DATETIME2))
    OUTPUT inserted.[count] AS [count], inserted.[resetAt] AS [resetAt];
  `;

  const row = rows[0];
  if (!row) throw new Error("rate limit MERGE returned no row");

  const count = Number(row.count);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(row.resetAt),
  };
}

// ---- In-memory fallback (per instance) --------------------------------------------------------

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const MEMORY_MAX_ENTRIES = 10_000;
const MEMORY_SWEEP_INTERVAL_MS = 60_000;

const globalForLimiter = globalThis as unknown as {
  __shaheenRateLimitMemory?: Map<string, MemoryEntry>;
  __shaheenRateLimitSweptAt?: number;
};

// On globalThis so duplicated module instances within one process share one budget.
function memoryStore(): Map<string, MemoryEntry> {
  return (globalForLimiter.__shaheenRateLimitMemory ??= new Map());
}

function sweepMemory(store: Map<string, MemoryEntry>, now: number): void {
  const due = now - (globalForLimiter.__shaheenRateLimitSweptAt ?? 0) >= MEMORY_SWEEP_INTERVAL_MS;
  if (!due && store.size < MEMORY_MAX_ENTRIES) return;

  globalForLimiter.__shaheenRateLimitSweptAt = now;
  for (const [key, entry] of store) if (entry.resetAt <= now) store.delete(key);
  // Still over budget (a flood of distinct keys): drop the oldest entries, Map preserves insertion order.
  for (const key of store.keys()) {
    if (store.size < MEMORY_MAX_ENTRIES) break;
    store.delete(key);
  }
}

function consumeFromMemory(opts: RateLimitOptions, now: number): RateLimitResult {
  const store = memoryStore();
  sweepMemory(store, now);

  let entry = store.get(opts.key);
  if (!entry || entry.resetAt <= now)
    entry = { count: 0, resetAt: now + opts.windowSeconds * 1000 };
  entry.count += 1;
  store.set(opts.key, entry);

  return {
    allowed: entry.count <= opts.limit,
    remaining: Math.max(0, opts.limit - entry.count),
    resetAt: new Date(entry.resetAt),
  };
}

// ---- Housekeeping ------------------------------------------------------------------------------

const CLEANUP_INTERVAL_MS = 5 * 60_000;
const EXPIRED_ROW_GRACE_MS = 60 * 60_000;
let lastCleanupAt = 0;

/** Opportunistic: expired rows are deleted by whichever request comes along, no scheduler needed. */
function cleanupExpired(now: number): void {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  void (async () => {
    try {
      await getDb().rateLimitCounter.deleteMany({
        where: { resetAt: { lt: new Date(now - EXPIRED_ROW_GRACE_MS) } },
      });
    } catch (error) {
      logger.debug("rate_limit.cleanup_failed", { error });
    }
  })();
}

let databaseWasFailing = false;

/**
 * Counts one hit against `key` and reports whether it is within `limit` for the current window.
 * Never throws: if the database cannot be used, the limit is enforced per server instance in
 * memory (weaker across instances, but forms keep working and abuse stays bounded).
 */
export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    const result = await consumeFromDatabase(opts, now);
    databaseWasFailing = false;
    cleanupExpired(now);
    return result;
  } catch (error) {
    if (!databaseWasFailing) {
      databaseWasFailing = true;
      logger.warn("rate_limit.database_unavailable_using_memory", { error });
    }
    return consumeFromMemory(opts, now);
  }
}
