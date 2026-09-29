// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fileTypeKeyForMime, sniffFileType } from "./file-types";
import {
  CONTENT_TYPES,
  docxBytes,
  jpegBytes,
  pdfBytes,
  pngBytes,
  text,
  webpBytes,
  xlsxBytes,
  zipBytes,
} from "./upload-fixtures";
import { readZipListing } from "./zip";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("sniffFileType: genuine files", () => {
  it("recognises PDF", () => {
    expect(sniffFileType(pdfBytes())).toEqual({ mime: "application/pdf", ext: "pdf" });
    expect(sniffFileType(text("%PDF-2.0\nrest"))).toEqual({ mime: "application/pdf", ext: "pdf" });
  });

  it("recognises JPEG, PNG and WebP produced by a real encoder", async () => {
    expect(sniffFileType(await jpegBytes())).toEqual({ mime: "image/jpeg", ext: "jpg" });
    expect(sniffFileType(await pngBytes())).toEqual({ mime: "image/png", ext: "png" });
    expect(sniffFileType(await webpBytes())).toEqual({ mime: "image/webp", ext: "webp" });
  });

  it("recognises DOCX and XLSX packages", () => {
    expect(sniffFileType(docxBytes())).toEqual({ mime: DOCX_MIME, ext: "docx" });
    expect(sniffFileType(xlsxBytes())).toEqual({ mime: XLSX_MIME, ext: "xlsx" });
  });

  it("works on plain Uint8Array views, including sub-arrays of a larger buffer", () => {
    const doc = docxBytes();
    const padded = new Uint8Array(doc.length + 10);
    padded.set(doc, 10);

    expect(sniffFileType(new Uint8Array(doc))).toEqual({ mime: DOCX_MIME, ext: "docx" });
    expect(sniffFileType(padded.subarray(10))).toEqual({ mime: DOCX_MIME, ext: "docx" });
  });

  it("accepts packages written the way Office does: data descriptors and UTF-8 names flagged", () => {
    const flags = 0x0008 | 0x0800;
    const office = zipBytes([
      { ...CONTENT_TYPES, flags },
      { name: "_rels/.rels", content: "<Relationships/>", flags },
      { name: "word/document.xml", content: "<w:document/>", flags },
      { name: "word/media/图片.png", content: "x", flags },
    ]);

    expect(sniffFileType(office)).toEqual({ mime: DOCX_MIME, ext: "docx" });
  });

  it("finds the ZIP directory even when the archive carries a comment", () => {
    const withComment = zipBytes(
      [CONTENT_TYPES, { name: "word/document.xml", content: "<w:document/>" }],
      { comment: "made by a test" },
    );
    expect(sniffFileType(withComment)).toEqual({ mime: DOCX_MIME, ext: "docx" });
  });
});

describe("sniffFileType: things that must never be accepted", () => {
  it.each([
    ["a Windows executable", text("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff")],
    ["an ELF binary", text("\x7fELF\x02\x01\x01\x00")],
    ["a shell script", text("#!/bin/sh\nrm -rf /\n")],
    ["an HTML page", text("<!DOCTYPE html><html><script>alert(1)</script></html>")],
    ["an HTML page with a leading BOM", text("\xef\xbb\xbf<html></html>")],
    [
      "an SVG image",
      text('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
    ],
    ["a bare SVG", text('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ["a PHP script", text("<?php system($_GET['c']); ?>")],
    ["a GIF/PHP polyglot", text("GIF89a<?php system($_GET['c']); ?>")],
    ["a gzip archive", text("\x1f\x8b\x08\x00\x00\x00\x00\x00")],
    ["a RAR archive", text("Rar!\x1a\x07\x00")],
    ["a 7z archive", text("7z\xbc\xaf\x27\x1c\x00\x04")],
    ["a legacy OLE document (.doc/.xls)", text("\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")],
    ["text that only starts like a PDF", text("%PDF-not-a-version")],
    ["a JPEG signature with no marker", Buffer.from([0xff, 0xd8, 0xff])],
    ["a RIFF file that is not WebP (WAV)", text("RIFF\x24\x00\x00\x00WAVEfmt ")],
    ["plain text", text("hello world, please open the attachment")],
    ["an empty buffer", Buffer.alloc(0)],
    ["a single byte", Buffer.from([0x25])],
  ])("rejects %s", (_name, bytes) => {
    expect(sniffFileType(bytes)).toBeNull();
  });

  it("does not let a JPEG/PNG/PDF payload smuggle a dangerous type past the signature", () => {
    // Signature says PNG: it IS treated as PNG (and served as image/png with nosniff), never as HTML.
    expect(
      sniffFileType(
        Buffer.concat([
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          text("<html>"),
        ]),
      ),
    ).toEqual({ mime: "image/png", ext: "png" });
  });
});

describe("sniffFileType: ZIP-based files that are not DOCX/XLSX", () => {
  it("rejects a plain archive", () => {
    expect(
      sniffFileType(
        zipBytes([
          { name: "a.txt", content: "a" },
          { name: "b.exe", content: "MZ" },
        ]),
      ),
    ).toBeNull();
  });

  it("rejects an Office-looking package with no [Content_Types].xml", () => {
    expect(
      sniffFileType(zipBytes([{ name: "word/document.xml", content: "<w:document/>" }])),
    ).toBeNull();
  });

  it("rejects a package that has [Content_Types].xml but neither word/ nor xl/ (e.g. a PowerPoint or a JAR)", () => {
    expect(
      sniffFileType(zipBytes([CONTENT_TYPES, { name: "ppt/presentation.xml", content: "<p/>" }])),
    ).toBeNull();
    expect(
      sniffFileType(zipBytes([CONTENT_TYPES, { name: "META-INF/MANIFEST.MF", content: "m" }])),
    ).toBeNull();
  });

  it("rejects an ambiguous package containing both word/ and xl/ parts", () => {
    expect(
      sniffFileType(
        zipBytes([
          CONTENT_TYPES,
          { name: "word/document.xml", content: "<w/>" },
          { name: "xl/workbook.xml", content: "<x/>" },
        ]),
      ),
    ).toBeNull();
  });

  it("rejects macro-enabled packages (.docm/.xlsm)", () => {
    expect(
      sniffFileType(
        zipBytes([
          CONTENT_TYPES,
          { name: "word/document.xml", content: "<w/>" },
          { name: "word/vbaProject.bin", content: "x" },
        ]),
      ),
    ).toBeNull();
  });

  it("rejects encrypted entries, ZIP64 markers and truncated archives", () => {
    expect(
      sniffFileType(
        zipBytes([
          { ...CONTENT_TYPES, flags: 1 },
          { name: "word/document.xml", content: "<w/>" },
        ]),
      ),
    ).toBeNull();
    expect(
      sniffFileType(
        zipBytes([CONTENT_TYPES, { name: "word/document.xml", content: "<w/>" }], { zip64: true }),
      ),
    ).toBeNull();

    const whole = docxBytes();
    expect(sniffFileType(whole.subarray(0, whole.length - 10))).toBeNull();
    expect(sniffFileType(whole.subarray(0, 40))).toBeNull();
  });

  it("rejects archive bombs by their declared size, without inflating anything", () => {
    const bomb = zipBytes([
      CONTENT_TYPES,
      { name: "word/document.xml", content: "<w/>", declaredSize: 400 * 1024 * 1024 },
    ]);
    expect(sniffFileType(bomb)).toBeNull();
  });

  it("rejects entry names that try to escape their directory", () => {
    for (const evil of [
      "../evil.xml",
      "/etc/passwd",
      "word/..\\..\\evil.xml",
      "word/../../evil.xml",
    ]) {
      expect(
        sniffFileType(
          zipBytes([CONTENT_TYPES, { name: "word/document.xml", content: "<w/>" }, { name: evil }]),
        ),
      ).toBeNull();
    }
  });

  it("rejects an empty ZIP", () => {
    const empty = Buffer.alloc(22);
    empty.writeUInt32LE(0x06054b50, 0);
    expect(sniffFileType(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), empty]))).toBeNull();
  });
});

describe("readZipListing", () => {
  it("lists names and sums declared sizes", () => {
    const listing = readZipListing(
      zipBytes([
        { name: "a.txt", content: "abc" },
        { name: "dir/b.txt", content: "de" },
      ]),
    );

    expect(listing).toEqual({ names: ["a.txt", "dir/b.txt"], declaredUncompressedBytes: 5 });
  });

  it("returns null for garbage of any length without throwing", () => {
    for (const length of [0, 1, 21, 22, 23, 200]) {
      expect(readZipListing(Buffer.alloc(length, 0x50))).toBeNull();
    }
  });
});

describe("fileTypeKeyForMime", () => {
  it("maps detected MIME types back to registry keys", () => {
    expect(fileTypeKeyForMime("image/jpeg")).toBe("jpeg");
    expect(fileTypeKeyForMime(DOCX_MIME)).toBe("docx");
    expect(fileTypeKeyForMime("image/svg+xml")).toBeUndefined();
  });
});
