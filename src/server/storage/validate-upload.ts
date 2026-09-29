import "server-only";
import sharp from "sharp";
import type { MediaKind } from "@/lib/domain/statuses";
import { FILE_TYPES, fileTypeKeyForMime, sniffFileType } from "./file-types";
import type { UploadPolicy } from "./policies";

export type UploadErrorCode =
  | "too_large"
  | "empty"
  | "type_not_allowed"
  | "mismatch"
  | "image_too_large_pixels"
  | "read_failed";

export type ValidatedUpload =
  | {
      ok: true;
      bytes: Buffer<ArrayBuffer>;
      /** Detected, never client-declared. */
      mime: string;
      /** Safe extension for the detected type (no dot). */
      ext: string;
      kind: MediaKind;
      width: number | null;
      height: number | null;
    }
  | { ok: false; code: UploadErrorCode };

/** Browsers send these when they do not recognise a file; that is "no claim", not a wrong claim. */
const NEUTRAL_DECLARED_TYPES = new Set(["", "application/octet-stream"]);

function declaredExtension(fileName: string): string | null {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : null;
}

/**
 * Decides whether an uploaded file may be stored under `policy`.
 *
 * The file's real type comes from its bytes (sniffFileType). The allow-list is checked against that
 * detected type only. The MIME type and extension the client supplied are cross-checked and any
 * disagreement is refused (`mismatch`), but they can never make a file acceptable.
 */
export async function validateUpload(file: File, policy: UploadPolicy): Promise<ValidatedUpload> {
  if (file.size === 0) return { ok: false, code: "empty" };
  // Checked before reading, so an oversized upload costs no memory.
  if (file.size > policy.maxBytes) return { ok: false, code: "too_large" };

  let bytes: Buffer<ArrayBuffer>;
  try {
    bytes = Buffer.from(await file.arrayBuffer());
  } catch {
    return { ok: false, code: "read_failed" };
  }
  if (bytes.length === 0) return { ok: false, code: "empty" };
  if (bytes.length > policy.maxBytes) return { ok: false, code: "too_large" };

  const detected = sniffFileType(bytes);
  const key = detected ? fileTypeKeyForMime(detected.mime) : undefined;
  if (!detected || !key || !policy.allowed.includes(key))
    return { ok: false, code: "type_not_allowed" };

  const type = FILE_TYPES[key];
  const declaredMime = file.type.split(";")[0].trim().toLowerCase();
  if (
    !NEUTRAL_DECLARED_TYPES.has(declaredMime) &&
    !(type.declaredMimes as readonly string[]).includes(declaredMime)
  ) {
    return { ok: false, code: "mismatch" };
  }
  const extension = declaredExtension(file.name);
  if (extension !== null && !(type.declaredExtensions as readonly string[]).includes(extension)) {
    return { ok: false, code: "mismatch" };
  }

  if (type.kind !== "IMAGE") {
    return {
      ok: true,
      bytes,
      mime: type.mime,
      ext: type.ext,
      kind: type.kind,
      width: null,
      height: null,
    };
  }

  // Header-only read: it reveals the dimensions without decoding, so a small file that claims to
  // be enormous (decompression bomb) is refused before anything tries to render it. sharp's own
  // pixel limit is switched off here because it would throw an error indistinguishable from a
  // corrupt file; the policy limit is enforced explicitly below.
  let width: number | undefined;
  let height: number | undefined;
  try {
    ({ width, height } = await sharp(bytes, { limitInputPixels: false }).metadata());
  } catch {
    return { ok: false, code: "read_failed" };
  }
  if (!width || !height) return { ok: false, code: "read_failed" };
  if (width * height > policy.maxImagePixels) return { ok: false, code: "image_too_large_pixels" };

  return { ok: true, bytes, mime: type.mime, ext: type.ext, kind: type.kind, width, height };
}
