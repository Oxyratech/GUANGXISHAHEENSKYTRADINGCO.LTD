import type { Locale } from "@/i18n/locales";

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

/** Short file type label such as "PDF": from the verified MIME type, else the file extension. */
export function fileTypeLabel(mimeType: string, fileName: string): string {
  const known = MIME_LABELS[mimeType.toLowerCase()];
  if (known) return known;
  const extension = /\.([A-Za-z0-9]{1,5})$/.exec(fileName)?.[1];
  return extension ? extension.toUpperCase() : "FILE";
}

/** "1.2 MB" with Latin digits in every language, so sizes read the same on all pages. */
export function formatFileSize(bytes: number, locale: Locale): string {
  const safe = Math.max(0, bytes);
  const [unit, divisor] =
    safe >= 1024 * 1024
      ? (["megabyte", 1024 * 1024] as const)
      : safe >= 1024
        ? (["kilobyte", 1024] as const)
        : (["byte", 1] as const);
  return new Intl.NumberFormat(`${locale}-u-nu-latn`, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: unit === "byte" ? 0 : 1,
  }).format(safe / divisor);
}
