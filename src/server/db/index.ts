import "server-only";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@/generated/prisma/client";
import { DatabaseUnavailableError } from "./errors";

export { DatabaseUnavailableError, isDatabaseUnavailableError, toDatabaseError } from "./errors";
export type { PrismaClient } from "@/generated/prisma/client";

/** True when a connection string has been provided. Public content pages work without one. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const globalForDb = globalThis as unknown as { __shaheenPrisma?: PrismaClient };

/**
 * Returns the shared Prisma client, creating it lazily on first use so that importing this module
 * (and building the app) never requires — or touches — a database.
 *
 * @throws DatabaseUnavailableError when DATABASE_URL is not set.
 */
export function getDb(): PrismaClient {
  if (globalForDb.__shaheenPrisma) return globalForDb.__shaheenPrisma;

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DatabaseUnavailableError("DATABASE_URL is not configured", {
      cause: "not_configured",
    });
  }

  const client = new PrismaClient({ adapter: new PrismaMssql(url) });
  // Reuse across hot reloads in development and across invocations in a warm serverless instance.
  globalForDb.__shaheenPrisma = client;
  return client;
}
