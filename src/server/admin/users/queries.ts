import "server-only";
import { ROLE_KEYS, isRoleKey, type RoleKey } from "@/server/auth/permissions";
import { getDb, toDatabaseError } from "@/server/db";
import type { PageParams } from "@/server/admin/pagination";

/*
 * Reads for the Users screens. Selects list only public-safe columns (no password hash, no session
 * data); the roles a user holds are always returned in the fixed ROLE_KEYS order, not database order.
 */

export interface UserListRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: RoleKey[];
}

export interface UserListFilters {
  /** Matched against name and email. */
  search?: string;
  role?: RoleKey;
  active?: boolean;
}

function sortRoles(roles: readonly RoleKey[]): RoleKey[] {
  return ROLE_KEYS.filter((key) => roles.includes(key));
}

const LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { key: true } } } },
} as const;

/** Roles from a Prisma `roles: { role: { key } }[]` include, deduplicated and in ROLE_KEYS order. */
export function toRoleKeys(roles: { role: { key: string } }[]): RoleKey[] {
  return sortRoles(roles.map((entry) => entry.role.key).filter(isRoleKey));
}

/** @throws DatabaseUnavailableError when the database cannot be reached. */
export async function listUsers(
  filters: UserListFilters,
  page: PageParams,
): Promise<{ rows: UserListRow[]; total: number }> {
  const search = filters.search?.trim();
  const where = {
    ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
    ...(filters.active !== undefined ? { isActive: filters.active } : {}),
    ...(filters.role ? { roles: { some: { role: { key: filters.role } } } } : {}),
  };

  try {
    const db = getDb();
    const [rows, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: page.skip,
        take: page.take,
        select: LIST_SELECT,
      }),
      db.user.count({ where }),
    ]);
    return {
      rows: rows.map((row) => ({ ...row, roles: toRoleKeys(row.roles) })),
      total,
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: RoleKey[];
  sessionCount: number;
}

/** @throws DatabaseUnavailableError when the database cannot be reached. */
export async function getUserById(id: string): Promise<UserDetail | null> {
  try {
    const user = await getDb().user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        failedLoginCount: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: { select: { role: { select: { key: true } } } },
        _count: { select: { sessions: true } },
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      failedLoginCount: user.failedLoginCount,
      lockedUntil: user.lockedUntil,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: toRoleKeys(user.roles),
      sessionCount: user._count.sessions,
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** How many *other* active users hold the Super Admin role; used to warn before the last one is lost. */
export async function countOtherActiveSuperAdmins(excludeUserId: string): Promise<number> {
  try {
    return await getDb().user.count({
      where: {
        id: { not: excludeUserId },
        isActive: true,
        roles: { some: { role: { key: "SUPER_ADMIN" } } },
      },
    });
  } catch (error) {
    throw toDatabaseError(error);
  }
}
