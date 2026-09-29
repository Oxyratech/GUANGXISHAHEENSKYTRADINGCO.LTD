import "server-only";

const MAX_STEM_LENGTH = 100;
const FALLBACK_STEM = "file";

// Control characters (Cc), format characters (Cf: bidi overrides/isolates/marks, zero-width joiners,
// BOM) and line/paragraph separators. None belong in a file name, and the bidi ones can make a name
// that ends in ".exe" display as if it ended in ".jpg".
const INVISIBLE_OR_CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
// Illegal in Windows file names (path separators are handled by taking the last segment).
const RESERVED_CHARACTERS = /[<>:"|?*]/g;
const WINDOWS_DEVICE_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function truncateByCodePoints(value: string, max: number): string {
  const characters = Array.from(value);
  return characters.length > max ? characters.slice(0, max).join("") : value;
}

/**
 * Makes an uploaded file's name safe to store and to show: no directories, no control or
 * direction-override characters, no reserved characters, bounded length.
 *
 * With `ext` (the extension derived from the DETECTED type) the result always ends in exactly that
 * extension and dots inside the name are flattened, so "invoice.php.png" cannot survive as a
 * double extension. Without it, only a short alphanumeric original extension is kept.
 */
export function sanitizeFileName(name: string, ext?: string): string {
  // Take the last path segment: browsers may send a full Windows path, attackers may send "../".
  const lastSegment = name.split(/[\\/]/).pop() ?? "";

  const cleaned = lastSegment
    .normalize("NFC")
    .replace(INVISIBLE_OR_CONTROL, "")
    .replace(RESERVED_CHARACTERS, "_")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "");

  let stem = cleaned;
  let extension = "";
  const lastDot = cleaned.lastIndexOf(".");
  if (lastDot > 0) {
    stem = cleaned.slice(0, lastDot);
    extension = cleaned.slice(lastDot + 1).toLowerCase();
  }

  const forcedExtension = ext?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (forcedExtension) {
    // The original extension is superseded, and inner dots go so "a.php.png" cannot stay a double extension.
    stem = stem.replace(/\./g, "_");
    extension = forcedExtension;
  } else if (!/^[a-z0-9]{1,8}$/.test(extension)) {
    extension = "";
  }

  stem = truncateByCodePoints(stem.trim(), MAX_STEM_LENGTH).replace(/[. ]+$/, "");
  if (stem.length === 0) stem = FALLBACK_STEM;
  if (WINDOWS_DEVICE_NAMES.test(stem)) stem = `_${stem}`;

  return extension ? `${stem}.${extension}` : stem;
}
