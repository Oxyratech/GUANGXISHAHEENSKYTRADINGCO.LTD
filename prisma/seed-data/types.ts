import type { PrismaClient } from "@/generated/prisma/client";

/**
 * The slice of the Prisma client the seed uses. Narrowing it keeps the seed honest about which tables
 * it may touch and lets tests pass a small in-memory fake instead of a database.
 */
export type SeedDb = Pick<
  PrismaClient,
  "inquiryStatus" | "permission" | "role" | "rolePermission" | "user" | "auditLog" | "$transaction"
>;

/** Password hashing and policy come from src/server/security/password; injected so the seed logic stays pure. */
export interface PasswordPolicy {
  hashPassword(plain: string): Promise<string>;
  validatePasswordStrength(
    plain: string,
    email?: string,
  ): { ok: true } | { ok: false; reason: string };
}

/** The environment the seed reads (only SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, both optional). */
export type SeedEnv = Readonly<Record<string, string | undefined>>;
