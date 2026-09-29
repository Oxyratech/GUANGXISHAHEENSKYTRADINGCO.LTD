// Test helpers: byte buffers that look like real files, built without shipping binary fixtures.
import { crc32 } from "node:zlib";
import sharp from "sharp";

export const text = (value: string) => Buffer.from(value, "latin1");

export async function pngBytes(width = 8, height = 8): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#0b1f3a" } })
    .png()
    .toBuffer();
}

export async function jpegBytes(width = 8, height = 8): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#b8862b" } })
    .jpeg()
    .toBuffer();
}

export async function webpBytes(width = 8, height = 8): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#2563eb" } })
    .webp()
    .toBuffer();
}

export const pdfBytes = () =>
  text("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");

export interface ZipEntry {
  name: string;
  content?: string;
  /** Overrides for crafting hostile archives. */
  declaredSize?: number;
  flags?: number;
}

/** A structurally valid ZIP (stored, no compression) with the given entries. */
export function zipBytes(
  entries: ZipEntry[],
  options: { comment?: string; zip64?: boolean } = {},
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.content ?? "", "utf8");
    const checksum = crc32(data);
    const size = entry.declaredSize ?? data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.flags ?? 0, 6);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(entry.flags ?? 0, 8);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const directory = Buffer.concat(centrals);
  const comment = Buffer.from(options.comment ?? "", "utf8");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(options.zip64 ? 0xffff : entries.length, 8);
  end.writeUInt16LE(options.zip64 ? 0xffff : entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(comment.length, 20);

  return Buffer.concat([...locals, directory, end, comment]);
}

const CONTENT_TYPES = { name: "[Content_Types].xml", content: "<Types/>" };

export const docxBytes = () =>
  zipBytes([
    CONTENT_TYPES,
    { name: "_rels/.rels", content: "<Relationships/>" },
    { name: "word/document.xml", content: "<w:document/>" },
  ]);

export const xlsxBytes = () =>
  zipBytes([
    CONTENT_TYPES,
    { name: "_rels/.rels", content: "<Relationships/>" },
    { name: "xl/workbook.xml", content: "<workbook/>" },
  ]);

export { CONTENT_TYPES };
