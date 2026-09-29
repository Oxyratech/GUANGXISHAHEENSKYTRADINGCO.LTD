import "server-only";
import { logger, redact } from "@/lib/logger";
import { getDb } from "@/server/db";

export interface AuditEntry {
  /** Who did it. Null/omitted for unauthenticated events (failed sign-in, public form). */
  actor?: { id: string; email: string } | null;
  /** Dotted verb, e.g. "inquiry.status_changed", "auth.login_failed". */
  action: string;
  entityType: string;
  entityId?: string;
  summary?: string;
  /** Small structured context. Redacted, then capped; never put secrets or full PII here. */
  metadata?: Record<string, unknown>;
  /** Already-hashed IP (see hashIp). */
  ipHash?: string;
}

const MAX_METADATA_LENGTH = 4000;

function cap(value: string | undefined, max: number): string | null {
  return value === undefined ? null : value.slice(0, max);
}

function serialiseMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  try {
    const json = JSON.stringify(redact(metadata));
    if (json.length <= MAX_METADATA_LENGTH) return json;
    return JSON.stringify({ truncated: true, preview: json.slice(0, MAX_METADATA_LENGTH - 100) });
  } catch {
    return JSON.stringify({ truncated: true, preview: "[unserialisable]" });
  }
}

/**
 * Appends one row to the audit log. It never throws: a failure to record must not undo or block
 * the action that was already performed, so it is logged for the operator instead.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await getDb().auditLog.create({
      data: {
        actorId: entry.actor?.id ?? null,
        actorEmail: cap(entry.actor?.email, 254),
        action: entry.action.slice(0, 100),
        entityType: entry.entityType.slice(0, 60),
        entityId: cap(entry.entityId, 64),
        summary: cap(entry.summary, 500),
        metadata: serialiseMetadata(entry.metadata),
        ipHash: entry.ipHash && /^[0-9a-f]{64}$/.test(entry.ipHash) ? entry.ipHash : null,
      },
    });
  } catch (error) {
    logger.error("audit.write_failed", {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      error,
    });
  }
}
