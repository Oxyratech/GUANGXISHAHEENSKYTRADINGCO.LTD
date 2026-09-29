/**
 * `npm run db:seed` — idempotent reference data (inquiry statuses, permissions, roles) and, only when
 * SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are both set, the first SUPER_ADMIN. See docs/DATABASE.md.
 *
 * Run by tsx outside Next.js, so it must not import modules marked `server-only`.
 */
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@/generated/prisma/client";
import { hashPassword, validatePasswordStrength } from "@/server/security/password";
import { loadEnvFiles } from "../scripts/load-env-files";
import { SeedConfigError } from "./seed-data/errors";
import { runSeed, type SeedReport } from "./seed-data/run-seed";

function summarise({ reference, admin }: SeedReport): string[] {
  const lines = [
    `Seeded ${reference.inquiryStatuses} inquiry statuses, ${reference.permissions} permissions, ` +
      `${reference.roles} roles and ${reference.rolePermissions} role grants.`,
  ];
  if (admin.outcome === "skipped") {
    lines.push(`No admin created: ${admin.reason}.`);
  } else if (admin.outcome === "created") {
    lines.push(
      "Created the initial SUPER_ADMIN (email from SEED_ADMIN_EMAIL). Remove SEED_ADMIN_PASSWORD now.",
    );
  } else {
    lines.push(
      "SEED_ADMIN_EMAIL already has an account; it was left unchanged. Remove SEED_ADMIN_PASSWORD.",
    );
  }
  return lines;
}

async function main(): Promise<void> {
  loadEnvFiles();

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new SeedConfigError("DATABASE_URL is not set (see .env.example for the format).");
  }

  const db = new PrismaClient({ adapter: new PrismaMssql(url) });
  try {
    const report = await runSeed(db, process.env, { hashPassword, validatePasswordStrength });
    for (const line of summarise(report)) console.log(line);
  } finally {
    await db.$disconnect().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  // Config errors are operator mistakes: print the message only, no stack.
  console.error(error instanceof SeedConfigError ? error.message : error);
  process.exitCode = 1;
});
