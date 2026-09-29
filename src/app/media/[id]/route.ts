import { logger } from "@/lib/logger";
import { isDatabaseUnavailableError } from "@/server/db";
import { contentDisposition } from "@/server/http/content-disposition";
import {
  etagMatches,
  notFoundResponse,
  serverErrorResponse,
  serviceUnavailableResponse,
} from "@/server/http/responses";
import { getAssetMeta, isValidAssetId, readAssetBytes } from "@/server/storage";

/**
 * Public media: images and documents an editor has published. PRIVATE assets answer 404, exactly
 * like ids that do not exist, so their existence is never disclosed here (they are served by
 * /files/[id] behind authorisation).
 *
 * The bytes are immutable for a given id, so responses are cached for a year and revalidated by
 * ETag (the content hash) when a cache does ask.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isValidAssetId(id)) return notFoundResponse();

    const meta = await getAssetMeta(id);
    if (!meta || meta.visibility !== "PUBLIC") return notFoundResponse();

    const etag = `"${meta.sha256}"`;
    const cacheHeaders = {
      ETag: etag,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    if (etagMatches(request.headers.get("if-none-match"), etag)) {
      return new Response(null, { status: 304, headers: cacheHeaders });
    }

    const bytes = await readAssetBytes(id);
    if (!bytes) return notFoundResponse();

    return new Response(bytes, {
      headers: {
        ...cacheHeaders,
        // The verified type stored at upload time, never one derived from the file name.
        "Content-Type": meta.mimeType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": contentDisposition(
          meta.kind === "IMAGE" ? "inline" : "attachment",
          meta.fileName,
        ),
      },
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return serviceUnavailableResponse();
    logger.error("media.serve_failed", { error });
    return serverErrorResponse();
  }
}
