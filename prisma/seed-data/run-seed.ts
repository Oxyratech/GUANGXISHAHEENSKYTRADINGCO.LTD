import { planAdminSeed, seedSuperAdmin, type AdminSeedOutcome } from "./admin-user";
import { seedReferenceData, type ReferenceDataSummary } from "./reference-data";
import type { PasswordPolicy, SeedDb, SeedEnv } from "./types";

export interface SeedReport {
  reference: ReferenceDataSummary;
  admin: { outcome: AdminSeedOutcome } | { outcome: "skipped"; reason: string };
}

/**
 * The whole seed, free of process and connection concerns so it can run against a fake client.
 * It writes reference data only (statuses, permissions, roles) plus the optional first admin; it
 * never creates products, news, inquiries or any other business content.
 *
 * @throws SeedConfigError before any write when the admin variables are set but invalid.
 */
export async function runSeed(
  db: SeedDb,
  env: SeedEnv,
  policy: PasswordPolicy,
): Promise<SeedReport> {
  const plan = planAdminSeed(env, policy);

  const reference = await seedReferenceData(db);
  if (plan.action === "skip") {
    return { reference, admin: { outcome: "skipped", reason: plan.reason } };
  }
  const outcome = await seedSuperAdmin(db, plan, reference.roleIds.SUPER_ADMIN, policy);
  return { reference, admin: { outcome } };
}
