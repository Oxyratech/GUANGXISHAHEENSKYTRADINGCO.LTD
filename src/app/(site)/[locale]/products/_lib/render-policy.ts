import { connection } from "next/server";
import type { ProductsResult } from "@/server/products";

/**
 * Keeps a failed database read out of the page cache. Pages here are cached for five minutes; a
 * page rendered while the database is unreachable would otherwise be served as "unavailable" for
 * that long after the database is back. Waiting for a request turns this one render into an
 * uncached one (at revalidation time the previous good page keeps being served).
 *
 * No DATABASE_URL is not a failure: the catalogue is then honestly empty, and that page may be
 * cached (and is prerendered at build time, where no database is ever needed).
 */
export async function skipCacheWhenUnavailable(
  ...results: readonly ProductsResult<unknown>[]
): Promise<void> {
  if (results.some((result) => !result.ok && result.cause !== "not_configured")) {
    await connection();
  }
}
