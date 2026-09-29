import { logger } from "@/lib/logger";
import { writeAudit } from "@/server/audit";
import {
  AuthenticationError,
  hasAnyPermission,
  hasPermission,
  requireSessionOrThrow,
} from "@/server/auth/authorize";
import { isDatabaseUnavailableError } from "@/server/db";
import { contentDisposition } from "@/server/http/content-disposition";
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  serviceUnavailableResponse,
  unauthorizedResponse,
} from "@/server/http/responses";
import { getAssetMeta, isValidAssetId, readAssetBytes } from "@/server/storage";

/**
 * Private files (buyer attachments and other non-public uploads) for signed-in staff only.
 *
 * 401 no session; 403 signed in without the right permission; 404 unknown id or a PUBLIC asset
 * (those live under /media). The permission depends on the file: an inquiry attachment needs
 * `inquiry:read`, any other private file needs `media:read`. Users holding neither are refused
 * before the database is consulted, so they cannot probe which ids exist.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSessionOrThrow();
    if (!hasAnyPermission(session, ["inquiry:read", "media:read"])) return forbiddenResponse();

    const { id } = await params;
    if (!isValidAssetId(id)) return notFoundResponse();

    const meta = await getAssetMeta(id);
    if (!meta || meta.visibility !== "PRIVATE") return notFoundResponse();

    const required = meta.isInquiryAttachment ? "inquiry:read" : "media:read";
    if (!hasPermission(session, required)) {
      logger.warn("files.permission_denied", { userId: session.user.id, permission: required });
      return forbiddenResponse();
    }

    const bytes = await readAssetBytes(id);
    if (!bytes) return notFoundResponse();

    await writeAudit({
      actor: { id: session.user.id, email: session.user.email },
      action: "media.private_file_downloaded",
      entityType: "media",
      entityId: meta.id,
      summary: "Downloaded a private file",
    });

    return new Response(bytes, {
      headers: {
        "Content-Type": meta.mimeType,
        "Content-Length": String(bytes.length),
        // Always a download, never rendered in our origin, whatever the type.
        "Content-Disposition": contentDisposition("attachment", meta.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorizedResponse();
    if (isDatabaseUnavailableError(error)) return serviceUnavailableResponse();
    logger.error("files.serve_failed", { error });
    return serverErrorResponse();
  }
}
