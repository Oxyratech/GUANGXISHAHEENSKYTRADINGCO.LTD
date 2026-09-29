import "server-only";
import { getDb, toDatabaseError } from "@/server/db";
import {
  MEDIA_KINDS,
  MEDIA_VISIBILITIES,
  type MediaKind,
  type MediaVisibility,
} from "@/lib/domain/statuses";
import { sha256Hex } from "@/server/security/hash";
import type { UploadPolicy } from "./policies";
import { sanitizeFileName } from "./sanitize-file-name";
import { validateUpload, type UploadErrorCode } from "./validate-upload";

/** Metadata about a stored file. Never contains the bytes. */
export interface AssetMeta {
  id: string;
  kind: MediaKind;
  visibility: MediaVisibility;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  uploadedById: string | null;
  createdAt: Date;
  /** True when a business inquiry references the file (decides which permission may download it). */
  isInquiryAttachment: boolean;
}

export type StoreUploadResult =
  { ok: true; asset: AssetMeta } | { ok: false; code: UploadErrorCode };

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Asset ids are GUIDs; anything else is answered "not found" without touching the database. */
export function isValidAssetId(id: string): boolean {
  return GUID.test(id);
}

const META_SELECT = {
  id: true,
  kind: true,
  visibility: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  sha256: true,
  width: true,
  height: true,
  uploadedById: true,
  createdAt: true,
  _count: { select: { attachments: true } },
} as const;

interface MetaRow {
  id: string;
  kind: string;
  visibility: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  uploadedById: string | null;
  createdAt: Date;
  _count: { attachments: number };
}

function toMeta(row: MetaRow): AssetMeta {
  return {
    id: row.id,
    kind: (MEDIA_KINDS as readonly string[]).includes(row.kind)
      ? (row.kind as MediaKind)
      : "DOCUMENT",
    // Unknown value: fail closed, treat as private.
    visibility: (MEDIA_VISIBILITIES as readonly string[]).includes(row.visibility)
      ? (row.visibility as MediaVisibility)
      : "PRIVATE",
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    width: row.width,
    height: row.height,
    uploadedById: row.uploadedById,
    createdAt: row.createdAt,
    isInquiryAttachment: row._count.attachments > 0,
  };
}

/**
 * Validates `file` against `policy`, then stores metadata and bytes. Expected failures (too large,
 * wrong type, ...) come back as `{ ok: false, code }`; database failures throw.
 *
 * The asset row and its blob are one nested create, which Prisma executes in a single transaction:
 * there is never metadata without bytes or the reverse. Nothing is written to disk.
 */
export async function storeUpload(args: {
  file: File;
  policy: UploadPolicy;
  uploadedById?: string | null;
}): Promise<StoreUploadResult> {
  const { file, policy, uploadedById } = args;

  const validated = await validateUpload(file, policy);
  if (!validated.ok) return validated;

  try {
    const row = await getDb().mediaAsset.create({
      data: {
        kind: validated.kind,
        visibility: policy.visibility,
        fileName: sanitizeFileName(file.name, validated.ext),
        mimeType: validated.mime,
        sizeBytes: validated.bytes.length,
        sha256: sha256Hex(validated.bytes),
        width: validated.width,
        height: validated.height,
        uploadedById: uploadedById ?? null,
        blob: { create: { data: validated.bytes } },
      },
      select: META_SELECT,
    });
    return { ok: true, asset: toMeta(row) };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export async function getAssetMeta(id: string): Promise<AssetMeta | null> {
  if (!isValidAssetId(id)) return null;
  try {
    const row = await getDb().mediaAsset.findUnique({ where: { id }, select: META_SELECT });
    return row ? toMeta(row) : null;
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** The file's bytes, or null. Callers must have decided the requester may see the asset first. */
export async function readAssetBytes(id: string): Promise<Buffer<ArrayBuffer> | null> {
  if (!isValidAssetId(id)) return null;
  try {
    const row = await getDb().mediaBlob.findUnique({
      where: { mediaAssetId: id },
      select: { data: true },
    });
    return row ? Buffer.from(row.data) : null;
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export type DeleteAssetResult = "deleted" | "not_found" | "in_use";

/** Deletes an asset and its bytes unless a product, article, SEO record or inquiry still uses it. */
export async function deleteAsset(id: string): Promise<DeleteAssetResult> {
  if (!isValidAssetId(id)) return "not_found";
  try {
    const db = getDb();
    const row = await db.mediaAsset.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            productImages: true,
            productDocs: true,
            attachments: true,
            newsCovers: true,
            seoOgImages: true,
          },
        },
      },
    });
    if (!row) return "not_found";
    if (Object.values(row._count).some((count) => count > 0)) return "in_use";

    const { count } = await db.mediaAsset.deleteMany({ where: { id } });
    return count > 0 ? "deleted" : "not_found";
  } catch (error) {
    // A reference created between the check and the delete trips the foreign key (P2003).
    if ((error as { code?: unknown } | null)?.code === "P2003") return "in_use";
    throw toDatabaseError(error);
  }
}
