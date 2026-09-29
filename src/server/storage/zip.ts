import "server-only";

/**
 * Minimal ZIP central-directory reader. It never inflates anything: it only lists entry names and
 * declared sizes, which is all that is needed to recognise an OOXML package (DOCX/XLSX) and to
 * refuse archive bombs before any other tool sees the file.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const EOCD_MIN_LENGTH = 22;
const CENTRAL_HEADER_LENGTH = 46;
const MAX_COMMENT_LENGTH = 0xffff;
const MAX_ENTRIES = 5000;

export interface ZipListing {
  names: string[];
  /** Sum of the sizes the archive claims for its entries once extracted. */
  declaredUncompressedBytes: number;
}

function findEndOfCentralDirectory(view: DataView): number {
  const earliest = Math.max(0, view.byteLength - EOCD_MIN_LENGTH - MAX_COMMENT_LENGTH);
  for (let offset = view.byteLength - EOCD_MIN_LENGTH; offset >= earliest; offset--) {
    if (view.getUint32(offset, true) !== EOCD_SIGNATURE) continue;
    const commentLength = view.getUint16(offset + 20, true);
    if (offset + EOCD_MIN_LENGTH + commentLength <= view.byteLength) return offset;
  }
  return -1;
}

/**
 * Returns the entry list, or null when the bytes are not a well-formed, plain ZIP: bad or
 * truncated structure, ZIP64, encrypted entries, an implausible number of entries, or entry names
 * that try to escape their directory.
 */
export function readZipListing(bytes: Uint8Array): ZipListing | null {
  if (bytes.byteLength < EOCD_MIN_LENGTH) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) return null;

  const entryCount = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryOffset = view.getUint32(eocd + 16, true);

  const isZip64 =
    entryCount === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff;
  if (isZip64 || entryCount === 0 || entryCount > MAX_ENTRIES) return null;
  if (directoryOffset + directorySize > eocd) return null;

  const decoder = new TextDecoder("utf-8");
  const directoryEnd = directoryOffset + directorySize;
  const names: string[] = [];
  let declaredUncompressedBytes = 0;
  let position = directoryOffset;

  for (let index = 0; index < entryCount; index++) {
    if (position + CENTRAL_HEADER_LENGTH > directoryEnd) return null;
    if (view.getUint32(position, true) !== CENTRAL_HEADER_SIGNATURE) return null;

    const flags = view.getUint16(position + 8, true);
    const uncompressedSize = view.getUint32(position + 24, true);
    const nameLength = view.getUint16(position + 28, true);
    const extraLength = view.getUint16(position + 30, true);
    const commentLength = view.getUint16(position + 32, true);
    const localHeaderOffset = view.getUint32(position + 42, true);

    const nameStart = position + CENTRAL_HEADER_LENGTH;
    const next = nameStart + nameLength + extraLength + commentLength;
    if (next > directoryEnd) return null;

    const encrypted = (flags & 0x1) !== 0;
    if (encrypted || uncompressedSize === 0xffffffff) return null;
    if (localHeaderOffset + 4 > directoryOffset) return null;
    if (view.getUint32(localHeaderOffset, true) !== LOCAL_HEADER_SIGNATURE) return null;

    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) return null;

    names.push(name);
    declaredUncompressedBytes += uncompressedSize;
    position = next;
  }

  return { names, declaredUncompressedBytes };
}
