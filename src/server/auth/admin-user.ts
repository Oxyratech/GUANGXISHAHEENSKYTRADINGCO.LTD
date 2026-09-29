// No `server-only`: this is the logic behind `npm run admin:create`, which runs under tsx where that
// package throws. It takes the database client as an argument instead of calling getDb().
import type { PrismaClient } from "@/generated/prisma/client";
import { hashPassword, validatePasswordStrength } from "../security/password";
import { isPlausibleEmail, normalizeEmail } from "./email";
import { isRoleKey, type RoleKey } from "./permissions";

export interface AdminUserInput {
  email: string;
  name: string;
  password: string;
  role: string;
}

export type AdminUserValidation =
  | { ok: true; value: { email: string; name: string; password: string; role: RoleKey } }
  | { ok: false; errors: string[] };

export function validateAdminUserInput(input: AdminUserInput): AdminUserValidation {
  const errors: string[] = [];
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  if (!isPlausibleEmail(email)) errors.push("Enter a valid email address.");
  if (name.length < 1 || name.length > 120)
    errors.push("Name must be between 1 and 120 characters.");
  if (!isRoleKey(input.role)) errors.push(`Unknown role "${input.role}".`);

  const strength = validatePasswordStrength(input.password, email);
  if (!strength.ok) errors.push(strength.reason);

  if (errors.length > 0 || !isRoleKey(input.role)) return { ok: false, errors };
  return { ok: true, value: { email, name, password: input.password, role: input.role } };
}

export type UpsertAdminResult =
  { ok: true; userId: string; created: boolean } | { ok: false; error: "role_missing" };

/**
 * Creates the user, or updates an existing one with the same email: new name, new password, active
 * again, unlocked, roles replaced by exactly `role`, and every existing session revoked. Records an
 * audit row. The role must already exist (created by `npm run db:seed`).
 */
export async function upsertAdminUser(
  db: PrismaClient,
  value: Extract<AdminUserValidation, { ok: true }>["value"],
): Promise<UpsertAdminResult> {
  const role = await db.role.findUnique({ where: { key: value.role }, select: { id: true } });
  if (!role) return { ok: false, error: "role_missing" };

  const passwordHash = await hashPassword(value.password);

  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: value.email },
      select: { id: true },
    });

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: value.name,
            passwordHash,
            isActive: true,
            failedLoginCount: 0,
            lockedUntil: null,
          },
          select: { id: true },
        })
      : await tx.user.create({
          data: { email: value.email, name: value.name, passwordHash },
          select: { id: true },
        });

    await tx.userRole.deleteMany({ where: { userId: user.id } });
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
    if (existing) await tx.session.deleteMany({ where: { userId: user.id } });

    await tx.auditLog.create({
      data: {
        action: existing ? "user.updated_via_cli" : "user.created_via_cli",
        entityType: "user",
        entityId: user.id,
        summary: `Admin user ${existing ? "updated" : "created"} from the command line with role ${value.role}`,
        metadata: JSON.stringify({ role: value.role }),
      },
    });

    return { ok: true as const, userId: user.id, created: !existing };
  });
}
