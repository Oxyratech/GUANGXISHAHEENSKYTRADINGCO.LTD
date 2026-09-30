import "server-only";
import type { PageParams } from "@/server/admin/pagination";
import { getDb, toDatabaseError } from "@/server/db";

/*
 * Read-only queries for the audit log. The log is append-only and has no admin-facing write path, so
 * there is no actions.ts beside this file. ipHash is selected but the UI must only ever show a
 * shortened prefix of it (see components/admin/audit), never the full 64-character hash.
 */

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  /** Matched against the stored actor-email snapshot, not a live join to User. */
  actorEmail?: string;
  from?: Date;
  /** Exclusive upper bound; callers pass the end of the selected day. */
  to?: Date;
}

export interface AuditLogRow {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  createdAt: Date;
}

export interface AuditLogDetail extends AuditLogRow {
  metadata: string | null;
  ipHash: string | null;
}

const LIST_SELECT = {
  id: true,
  actorEmail: true,
  action: true,
  entityType: true,
  entityId: true,
  summary: true,
  createdAt: true,
} as const;

function buildWhere(filters: AuditLogFilters) {
  const createdAt: { gte?: Date; lt?: Date } = {};
  if (filters.from) createdAt.gte = filters.from;
  if (filters.to) createdAt.lt = filters.to;

  return {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.actorEmail ? { actorEmail: { contains: filters.actorEmail.trim() } } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
  };
}

/** @throws DatabaseUnavailableError when the database cannot be reached. */
export async function listAuditLogs(
  filters: AuditLogFilters,
  page: PageParams,
): Promise<{ rows: AuditLogRow[]; total: number }> {
  const where = buildWhere(filters);
  try {
    const db = getDb();
    const [rows, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: page.skip,
        take: page.take,
        select: LIST_SELECT,
      }),
      db.auditLog.count({ where }),
    ]);
    return { rows: rows.map((row) => ({ ...row, id: row.id.toString() })), total };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** Distinct actions and entity types actually present, for the filter selects. */
export async function loadAuditLogFacets(): Promise<{ actions: string[]; entityTypes: string[] }> {
  try {
    const db = getDb();
    const [actions, entityTypes] = await Promise.all([
      db.auditLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
      }),
      db.auditLog.findMany({
        distinct: ["entityType"],
        select: { entityType: true },
        orderBy: { entityType: "asc" },
      }),
    ]);
    return {
      actions: actions.map((row) => row.action),
      entityTypes: entityTypes.map((row) => row.entityType),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** @throws DatabaseUnavailableError when the database cannot be reached. */
export async function getAuditLogById(id: string): Promise<AuditLogDetail | null> {
  const bigintId = /^\d+$/.test(id) ? BigInt(id) : null;
  if (bigintId === null) return null;

  try {
    const row = await getDb().auditLog.findUnique({
      where: { id: bigintId },
      select: {
        id: true,
        actorEmail: true,
        action: true,
        entityType: true,
        entityId: true,
        summary: true,
        metadata: true,
        ipHash: true,
        createdAt: true,
      },
    });
    return row ? { ...row, id: row.id.toString() } : null;
  } catch (error) {
    throw toDatabaseError(error);
  }
}
