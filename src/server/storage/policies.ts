import "server-only";
import type { MediaVisibility } from "@/lib/domain/statuses";
import { getEnv } from "@/server/env";
import { FILE_TYPES, type FileTypeKey } from "./file-types";

export interface UploadPolicy {
  readonly name: string;
  /** Detected types this policy accepts. The client's MIME type and extension never widen it. */
  readonly allowed: readonly FileTypeKey[];
  readonly maxBytes: number;
  readonly visibility: MediaVisibility;
  /** Decompression-bomb guard for images: width × height above this is refused. */
  readonly maxImagePixels: number;
}

const MIB = 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const IMAGE_TYPES = ["jpeg", "png", "webp"] as const satisfies readonly FileTypeKey[];

/**
 * Buyer attachments on an inquiry. Public-facing and anonymous, so it is the tightest policy and its
 * limit follows UPLOAD_MAX_BYTES. PRIVATE: only reachable through /files/[id] with inquiry:read.
 */
export const INQUIRY_ATTACHMENT: UploadPolicy = {
  name: "INQUIRY_ATTACHMENT",
  allowed: ["pdf", ...IMAGE_TYPES, "docx", "xlsx"],
  get maxBytes() {
    return getEnv().UPLOAD_MAX_BYTES;
  },
  visibility: "PRIVATE",
  maxImagePixels: MAX_IMAGE_PIXELS,
};

/** Product photos uploaded by staff. PUBLIC: served from /media/[id]. */
export const PRODUCT_IMAGE: UploadPolicy = {
  name: "PRODUCT_IMAGE",
  allowed: IMAGE_TYPES,
  get maxBytes() {
    return getEnv().UPLOAD_MAX_BYTES;
  },
  visibility: "PUBLIC",
  maxImagePixels: MAX_IMAGE_PIXELS,
};

/**
 * Downloadable PDFs (catalogues, specification sheets) uploaded by staff. Fixed at 7 MiB: the
 * largest policy, kept under `serverActions.bodySizeLimit` (8mb) so every upload can use a Server Action.
 */
export const PUBLIC_DOCUMENT: UploadPolicy = {
  name: "PUBLIC_DOCUMENT",
  allowed: ["pdf"],
  maxBytes: 7 * MIB,
  visibility: "PUBLIC",
  maxImagePixels: MAX_IMAGE_PIXELS,
};

/** News covers and inline images. Same rules as product images. */
export const NEWS_IMAGE: UploadPolicy = {
  name: "NEWS_IMAGE",
  allowed: IMAGE_TYPES,
  get maxBytes() {
    return getEnv().UPLOAD_MAX_BYTES;
  },
  visibility: "PUBLIC",
  maxImagePixels: MAX_IMAGE_PIXELS,
};

export interface UploadPolicySummary {
  maxBytes: number;
  mimeTypes: string[];
  extensions: string[];
}

/** What a form needs to tell the visitor (and to set `accept`). Safe to pass to client components. */
export function describeUploadPolicy(policy: UploadPolicy): UploadPolicySummary {
  return {
    maxBytes: policy.maxBytes,
    mimeTypes: policy.allowed.map((key) => FILE_TYPES[key].mime),
    extensions: policy.allowed.map((key) => FILE_TYPES[key].ext),
  };
}
