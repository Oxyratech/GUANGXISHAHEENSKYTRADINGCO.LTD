import "server-only";

/** RFC 5987 `attr-char`: everything else in the UTF-8 form of the name is percent-encoded. */
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Printable ASCII only, with the characters that would break a quoted-string removed. */
function asciiFallback(fileName: string): string {
  const cleaned = fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\%;]/g, "_")
    .trim();
  return cleaned.length > 0 ? cleaned : "download";
}

/**
 * Content-Disposition with both an ASCII `filename` (old clients) and an RFC 5987 `filename*`
 * carrying the real UTF-8 name (Arabic and Chinese names survive). `fileName` is expected to be
 * sanitised already; this function still guarantees it cannot inject header syntax.
 */
export function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  return `${type}; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${encodeRfc5987(fileName)}`;
}
