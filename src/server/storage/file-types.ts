import "server-only";
import type { MediaKind } from "@/lib/domain/statuses";
import { readZipListing } from "./zip";

/**
 * Every file type the site will ever store. Anything not listed here (SVG, HTML, scripts,
 * executables, archives, legacy Office formats with macros, ...) cannot be detected and is therefore
 * always rejected, whatever a policy says.
 */
export const FILE_TYPES = {
  pdf: {
    mime: "application/pdf",
    ext: "pdf",
    kind: "DOCUMENT",
    declaredMimes: ["application/pdf", "application/x-pdf"],
    declaredExtensions: ["pdf"],
  },
  jpeg: {
    mime: "image/jpeg",
    ext: "jpg",
    kind: "IMAGE",
    declaredMimes: ["image/jpeg", "image/jpg", "image/pjpeg"],
    declaredExtensions: ["jpg", "jpeg", "jpe", "jfif"],
  },
  png: {
    mime: "image/png",
    ext: "png",
    kind: "IMAGE",
    declaredMimes: ["image/png"],
    declaredExtensions: ["png"],
  },
  webp: {
    mime: "image/webp",
    ext: "webp",
    kind: "IMAGE",
    declaredMimes: ["image/webp"],
    declaredExtensions: ["webp"],
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
    kind: "DOCUMENT",
    declaredMimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    declaredExtensions: ["docx"],
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
    kind: "DOCUMENT",
    declaredMimes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    declaredExtensions: ["xlsx"],
  },
} as const satisfies Record<
  string,
  {
    mime: string;
    ext: string;
    kind: MediaKind;
    declaredMimes: readonly string[];
    declaredExtensions: readonly string[];
  }
>;

export type FileTypeKey = keyof typeof FILE_TYPES;

export interface DetectedFileType {
  mime: string;
  ext: string;
}

/** Which registered type a detected MIME belongs to. */
export function fileTypeKeyForMime(mime: string): FileTypeKey | undefined {
  return (Object.keys(FILE_TYPES) as FileTypeKey[]).find((key) => FILE_TYPES[key].mime === mime);
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return (
    bytes.length >= offset + signature.length &&
    signature.every((value, i) => bytes[offset + i] === value)
  );
}

const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0));
const PDF_MAGIC = ascii("%PDF-");
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const RIFF_MAGIC = ascii("RIFF");
const WEBP_MAGIC = ascii("WEBP");
const ZIP_LOCAL_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/** Declared size of everything inside an OOXML package; real documents are far below this. */
const MAX_OOXML_UNCOMPRESSED_BYTES = 300 * 1024 * 1024;

function detectOoxml(bytes: Uint8Array): DetectedFileType | null {
  const listing = readZipListing(bytes);
  if (!listing || listing.declaredUncompressedBytes > MAX_OOXML_UNCOMPRESSED_BYTES) return null;

  const { names } = listing;
  if (!names.includes("[Content_Types].xml")) return null;
  // A macro-enabled package (.docm/.xlsm) is a different, riskier type than the one we accept.
  if (names.some((name) => name.toLowerCase().endsWith("vbaproject.bin"))) return null;

  const isWord = names.some((name) => name.startsWith("word/"));
  const isExcel = names.some((name) => name.startsWith("xl/"));
  if (isWord === isExcel) return null;

  const type = isWord ? FILE_TYPES.docx : FILE_TYPES.xlsx;
  return { mime: type.mime, ext: type.ext };
}

/**
 * Identifies a file from its content alone. Never consults a file name or client-declared MIME.
 * Returns null for anything that is not one of FILE_TYPES.
 */
export function sniffFileType(bytes: Uint8Array): DetectedFileType | null {
  // "%PDF-" followed by a version digit, so text that merely starts with those letters is not a PDF.
  if (startsWith(bytes, PDF_MAGIC) && bytes.length > 8 && bytes[5] >= 0x30 && bytes[5] <= 0x39) {
    return { mime: FILE_TYPES.pdf.mime, ext: FILE_TYPES.pdf.ext };
  }
  if (startsWith(bytes, JPEG_MAGIC) && bytes.length > 3 && bytes[3] >= 0xc0 && bytes[3] !== 0xff) {
    return { mime: FILE_TYPES.jpeg.mime, ext: FILE_TYPES.jpeg.ext };
  }
  if (startsWith(bytes, PNG_MAGIC)) return { mime: FILE_TYPES.png.mime, ext: FILE_TYPES.png.ext };
  if (startsWith(bytes, RIFF_MAGIC) && startsWith(bytes, WEBP_MAGIC, 8)) {
    return { mime: FILE_TYPES.webp.mime, ext: FILE_TYPES.webp.ext };
  }
  if (startsWith(bytes, ZIP_LOCAL_MAGIC)) return detectOoxml(bytes);
  return null;
}
