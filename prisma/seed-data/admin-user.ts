import { randomUUID } from "node:crypto";
import { z } from "zod";
import { SeedConfigError } from "./errors";
import type { PasswordPolicy, SeedDb, SeedEnv } from "./types";

/** Display name only; the admin can rename the account after signing in. */
const ADMIN_DISPLAY_NAME = "Site Administrator";

const emailSchema = z.email().max(254);

type AdminSeedPlan =
  { action: "skip"; reason: string } | { action: "create"; email: string; password: string };

/**
 * Decides, from the environment alone, whether an initial SUPER_ADMIN should be created. Pure and
 * side-effect free so the seed can reject bad input before it writes anything.
 *
 * Only one variable set is a skip, not an error: operators are told to delete SEED_ADMIN_PASSWORD
 * after the first run, which leaves exactly that state on every later deploy.
 *
 * @throws SeedConfigError when both variables are set but the values are unusable.
 */
export function planAdminSeed(
  env: SeedEnv,
  policy: Pick<PasswordPolicy, "validatePasswordStrength">,
): AdminSeedPlan {
  const rawEmail = env.SEED_ADMIN_EMAIL?.trim() ?? "";
  const password = env.SEED_ADMIN_PASSWORD ?? "";

  if (!rawEmail && !password) {
    return { action: "skip", reason: "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are not set" };
  }
  if (!rawEmail || !password) {
    const missing = rawEmail ? "SEED_ADMIN_PASSWORD" : "SEED_ADMIN_EMAIL";
    return { action: "skip", reason: `${missing} is not set (both are required)` };
  }

  const email = rawEmail.toLowerCase();
  if (!emailSchema.safeParse(email).success) {
    throw new SeedConfigError("SEED_ADMIN_EMAIL is not a valid email address");
  }
  const strength = policy.validatePasswordStrength(password, email);
  if (!strength.ok) {
    throw new SeedConfigError(`SEED_ADMIN_PASSWORD was rejected: ${strength.reason}`);
  }
  return { action: "create", email, password };
}

export type AdminSeedOutcome = "created" | "exists";

/**
 * Creates the initial SUPER_ADMIN unless a user with that email already exists. An existing user is
 * never modified (no password reset, no role change): re-running the seed must not be a way to
 * take over or reset an account.
 */
export async function seedSuperAdmin(
  db: SeedDb,
  plan: Extract<AdminSeedPlan, { action: "create" }>,
  superAdminRoleId: string,
  policy: Pick<PasswordPolicy, "hashPassword">,
): Promise<AdminSeedOutcome> {
  const existing = await db.user.findUnique({ where: { email: plan.email }, select: { id: true } });
  if (existing) return "exists";

  const passwordHash = await policy.hashPassword(plan.password);
  // The id is chosen here so the audit row can reference it; the transaction makes the user, its role
  // link and the audit row all-or-nothing.
  const id = randomUUID();
  await db.$transaction([
    db.user.create({
      data: {
        id,
        email: plan.email,
        name: ADMIN_DISPLAY_NAME,
        passwordHash,
        roles: { create: { roleId: superAdminRoleId } },
      },
      select: { id: true },
    }),
    db.auditLog.create({
      data: {
        action: "user.created_via_seed",
        entityType: "user",
        entityId: id,
        summary: "Initial SUPER_ADMIN created by the database seed",
        metadata: JSON.stringify({ role: "SUPER_ADMIN" }),
      },
      select: { id: true },
    }),
  ]);
  return "created";
}
