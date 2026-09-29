// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  INQUIRY_ATTACHMENT,
  NEWS_IMAGE,
  PRODUCT_IMAGE,
  PUBLIC_DOCUMENT,
  describeUploadPolicy,
  type UploadPolicy,
} from "./policies";
import {
  docxBytes,
  jpegBytes,
  pdfBytes,
  pngBytes,
  text,
  webpBytes,
  xlsxBytes,
} from "./upload-fixtures";
import { validateUpload } from "./validate-upload";

const MIB = 1024 * 1024;

function file(bytes: Uint8Array | string, name: string, type = "") {
  return new File([bytes as BlobPart], name, { type });
}

describe("upload policies", () => {
  it("INQUIRY_ATTACHMENT: PDF, JPEG, PNG, WebP, DOCX, XLSX; 5 MiB; PRIVATE", () => {
    expect(INQUIRY_ATTACHMENT.allowed).toEqual(["pdf", "jpeg", "png", "webp", "docx", "xlsx"]);
    expect(INQUIRY_ATTACHMENT.maxBytes).toBe(5 * MIB);
    expect(INQUIRY_ATTACHMENT.visibility).toBe("PRIVATE");
  });

  it("PRODUCT_IMAGE and NEWS_IMAGE: JPEG, PNG, WebP; 5 MiB; PUBLIC", () => {
    for (const policy of [PRODUCT_IMAGE, NEWS_IMAGE]) {
      expect(policy.allowed).toEqual(["jpeg", "png", "webp"]);
      expect(policy.maxBytes).toBe(5 * MIB);
      expect(policy.visibility).toBe("PUBLIC");
    }
  });

  it("PUBLIC_DOCUMENT: PDF only; 7 MiB; PUBLIC", () => {
    expect(PUBLIC_DOCUMENT.allowed).toEqual(["pdf"]);
    expect(PUBLIC_DOCUMENT.maxBytes).toBe(7 * MIB);
    expect(PUBLIC_DOCUMENT.visibility).toBe("PUBLIC");
  });

  it("never allows SVG, HTML, scripts, executables or archives", () => {
    const everything = [INQUIRY_ATTACHMENT, PRODUCT_IMAGE, PUBLIC_DOCUMENT, NEWS_IMAGE].flatMap(
      (p) => [...p.allowed],
    );
    const permitted = new Set(everything);

    expect([...permitted].sort()).toEqual(["docx", "jpeg", "pdf", "png", "webp", "xlsx"]);
  });

  it("describeUploadPolicy summarises a policy for forms", () => {
    expect(describeUploadPolicy(PRODUCT_IMAGE)).toEqual({
      maxBytes: 5 * MIB,
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      extensions: ["jpg", "png", "webp"],
    });
  });

  it("the standard limit follows UPLOAD_MAX_BYTES, read lazily", () => {
    vi.stubEnv("UPLOAD_MAX_BYTES", "1048576");
    try {
      expect(INQUIRY_ATTACHMENT.maxBytes).toBe(MIB);
      expect(PUBLIC_DOCUMENT.maxBytes).toBe(7 * MIB);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(INQUIRY_ATTACHMENT.maxBytes).toBe(5 * MIB);
  });
});

describe("validateUpload: accepted files", () => {
  it("accepts a real PNG and reports the detected type and dimensions", async () => {
    const result = await validateUpload(
      file(await pngBytes(12, 7), "photo.png", "image/png"),
      PRODUCT_IMAGE,
    );

    expect(result).toMatchObject({
      ok: true,
      mime: "image/png",
      ext: "png",
      kind: "IMAGE",
      width: 12,
      height: 7,
    });
    if (result.ok) expect(result.bytes.length).toBeGreaterThan(0);
  });

  it("accepts JPEG (jpg/jpeg names, alias MIME types) and WebP", async () => {
    const jpeg = await jpegBytes();
    for (const [name, type] of [
      ["a.jpg", "image/jpeg"],
      ["a.JPEG", "image/jpeg"],
      ["a.jpe", "image/pjpeg"],
      ["a.jpg", "image/jpg"],
    ] as const) {
      expect(await validateUpload(file(jpeg, name, type), PRODUCT_IMAGE)).toMatchObject({
        ok: true,
        ext: "jpg",
      });
    }
    expect(
      await validateUpload(file(await webpBytes(), "a.webp", "image/webp"), PRODUCT_IMAGE),
    ).toMatchObject({
      ok: true,
      mime: "image/webp",
    });
  });

  it("accepts PDF, DOCX and XLSX under the inquiry policy with null dimensions", async () => {
    const pdf = await validateUpload(
      file(pdfBytes(), "quote.pdf", "application/pdf"),
      INQUIRY_ATTACHMENT,
    );
    const docx = await validateUpload(file(docxBytes(), "spec.docx"), INQUIRY_ATTACHMENT);
    const xlsx = await validateUpload(file(xlsxBytes(), "sheet.xlsx"), INQUIRY_ATTACHMENT);

    expect(pdf).toMatchObject({
      ok: true,
      mime: "application/pdf",
      kind: "DOCUMENT",
      width: null,
      height: null,
    });
    expect(docx).toMatchObject({ ok: true, ext: "docx" });
    expect(xlsx).toMatchObject({ ok: true, ext: "xlsx" });
  });

  it("treats an unknown client MIME type or a missing extension as no claim, not a wrong claim", async () => {
    const png = await pngBytes();

    expect(await validateUpload(file(png, "photo.png", ""), PRODUCT_IMAGE)).toMatchObject({
      ok: true,
    });
    expect(
      await validateUpload(file(png, "photo.png", "application/octet-stream"), PRODUCT_IMAGE),
    ).toMatchObject({
      ok: true,
    });
    expect(await validateUpload(file(png, "photo", "image/png"), PRODUCT_IMAGE)).toMatchObject({
      ok: true,
    });
    expect(
      await validateUpload(file(png, "photo.png", "IMAGE/PNG; charset=binary"), PRODUCT_IMAGE),
    ).toMatchObject({
      ok: true,
    });
  });
});

describe("validateUpload: hostile files are rejected by content, whatever they are called", () => {
  const exe = text("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00");

  it.each([
    ["an executable renamed .png with an image MIME", exe, "invoice.png", "image/png"],
    ["an executable renamed .pdf", exe, "invoice.pdf", "application/pdf"],
    ["an executable with no declared type at all", exe, "setup.exe", ""],
    [
      "HTML renamed .jpg",
      text("<html><script>alert(document.cookie)</script></html>"),
      "photo.jpg",
      "image/jpeg",
    ],
    ["HTML declared as a PDF", text("<!doctype html><h1>hi</h1>"), "a.pdf", "application/pdf"],
    [
      "SVG renamed .png",
      text('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
      "logo.png",
      "image/png",
    ],
    [
      "SVG under its own name",
      text('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      "logo.svg",
      "image/svg+xml",
    ],
    [
      "a PHP web shell renamed .jpg",
      text("<?php system($_GET['c']); ?>"),
      "shell.php.jpg",
      "image/jpeg",
    ],
    ["a GIF/PHP polyglot", text("GIF89a<?php system($_GET['c']); ?>"), "cat.gif", "image/gif"],
    ["a shell script", text("#!/bin/sh\nrm -rf /\n"), "run.sh", "application/x-sh"],
    ["a plain ZIP archive", null, "bundle.zip", "application/zip"],
    ["a plain ZIP renamed .docx", null, "report.docx", ""],
  ] as const)("%s", async (_name, bytes, fileName, type) => {
    const { zipBytes } = await import("./upload-fixtures");
    const payload =
      bytes ??
      zipBytes([
        { name: "readme.txt", content: "x" },
        { name: "run.exe", content: "MZ" },
      ]);

    expect(await validateUpload(file(payload, fileName, type), INQUIRY_ATTACHMENT)).toEqual({
      ok: false,
      code: "type_not_allowed",
    });
  });

  it("rejects a macro-enabled package renamed .docx", async () => {
    const { zipBytes, CONTENT_TYPES } = await import("./upload-fixtures");
    const docm = zipBytes([
      CONTENT_TYPES,
      { name: "word/document.xml", content: "<w/>" },
      { name: "word/vbaProject.bin", content: "macro" },
    ]);

    expect(await validateUpload(file(docm, "report.docx"), INQUIRY_ATTACHMENT)).toEqual({
      ok: false,
      code: "type_not_allowed",
    });
  });
});

describe("validateUpload: the allow-list applies to the detected type", () => {
  it("refuses a genuine file whose type the policy does not list", async () => {
    expect(
      await validateUpload(file(pdfBytes(), "a.pdf", "application/pdf"), PRODUCT_IMAGE),
    ).toEqual({
      ok: false,
      code: "type_not_allowed",
    });
    expect(
      await validateUpload(file(await pngBytes(), "a.png", "image/png"), PUBLIC_DOCUMENT),
    ).toEqual({
      ok: false,
      code: "type_not_allowed",
    });
    expect(await validateUpload(file(docxBytes(), "a.docx"), NEWS_IMAGE)).toEqual({
      ok: false,
      code: "type_not_allowed",
    });
  });

  it("a client-declared type can never widen a policy", async () => {
    // The bytes are a PDF; claiming to be an image does not help, and PDF is not allowed for images.
    expect(await validateUpload(file(pdfBytes(), "a.png", "image/png"), PRODUCT_IMAGE)).toEqual({
      ok: false,
      code: "type_not_allowed",
    });
  });
});

describe("validateUpload: client claims that contradict the content", () => {
  it("rejects a mismatched extension", async () => {
    const png = await pngBytes();

    expect(await validateUpload(file(png, "photo.jpg", "image/png"), PRODUCT_IMAGE)).toEqual({
      ok: false,
      code: "mismatch",
    });
    expect(await validateUpload(file(png, "photo.exe", "image/png"), PRODUCT_IMAGE)).toEqual({
      ok: false,
      code: "mismatch",
    });
    expect(await validateUpload(file(docxBytes(), "sheet.xlsx"), INQUIRY_ATTACHMENT)).toEqual({
      ok: false,
      code: "mismatch",
    });
  });

  it("rejects a mismatched MIME type", async () => {
    expect(
      await validateUpload(file(await pngBytes(), "photo.png", "image/jpeg"), PRODUCT_IMAGE),
    ).toEqual({
      ok: false,
      code: "mismatch",
    });
    expect(
      await validateUpload(file(pdfBytes(), "a.pdf", "text/html"), INQUIRY_ATTACHMENT),
    ).toEqual({
      ok: false,
      code: "mismatch",
    });
  });
});

describe("validateUpload: size", () => {
  it("rejects an empty file", async () => {
    expect(
      await validateUpload(file(new Uint8Array(0), "empty.png", "image/png"), PRODUCT_IMAGE),
    ).toEqual({
      ok: false,
      code: "empty",
    });
  });

  it("rejects a file over the policy limit before reading it", async () => {
    const big = file(Buffer.alloc(5 * MIB + 1, 0x25), "big.pdf", "application/pdf");
    const read = vi.spyOn(big, "arrayBuffer");

    expect(await validateUpload(big, INQUIRY_ATTACHMENT)).toEqual({ ok: false, code: "too_large" });
    expect(read).not.toHaveBeenCalled();
  });

  it("accepts a file of exactly the limit", async () => {
    const policy: UploadPolicy = { ...PUBLIC_DOCUMENT, maxBytes: pdfBytes().length };

    expect(
      await validateUpload(file(pdfBytes(), "a.pdf", "application/pdf"), policy),
    ).toMatchObject({ ok: true });
    expect(
      await validateUpload(file(pdfBytes(), "a.pdf", "application/pdf"), {
        ...policy,
        maxBytes: policy.maxBytes - 1,
      }),
    ).toEqual({
      ok: false,
      code: "too_large",
    });
  });

  it("uses the limit from the policy, so each policy can differ", async () => {
    const sixMib = file(
      Buffer.concat([pdfBytes(), Buffer.alloc(6 * MIB, 0x20)]),
      "big.pdf",
      "application/pdf",
    );

    expect(await validateUpload(sixMib, INQUIRY_ATTACHMENT)).toEqual({
      ok: false,
      code: "too_large",
    });
    expect(await validateUpload(sixMib, PUBLIC_DOCUMENT)).toMatchObject({ ok: true });
  });
});

describe("validateUpload: images", () => {
  it("refuses an image with more pixels than the policy allows (decompression-bomb guard)", async () => {
    const policy: UploadPolicy = { ...PRODUCT_IMAGE, maxImagePixels: 100 };

    expect(await validateUpload(file(await pngBytes(10, 10), "a.png"), policy)).toMatchObject({
      ok: true,
    });
    expect(await validateUpload(file(await pngBytes(11, 10), "a.png"), policy)).toEqual({
      ok: false,
      code: "image_too_large_pixels",
    });
  });

  it("judges an image by its header, so a tiny file declaring a huge canvas is refused unrendered", async () => {
    const { crc32 } = await import("node:zlib");
    const chunk = (type: string, data: Buffer) => {
      const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
      const length = Buffer.alloc(4);
      length.writeUInt32BE(data.length);
      const checksum = Buffer.alloc(4);
      checksum.writeUInt32BE(crc32(body));
      return Buffer.concat([length, body, checksum]);
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(100_000, 0);
    header.writeUInt32BE(100_000, 4);
    header.writeUInt8(8, 8); // bit depth
    header.writeUInt8(0, 9); // greyscale
    const bomb = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", Buffer.from([0x78, 0x9c, 0x63, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01])),
      chunk("IEND", Buffer.alloc(0)),
    ]);

    expect(bomb.length).toBeLessThan(200);
    expect(await validateUpload(file(bomb, "bomb.png", "image/png"), PRODUCT_IMAGE)).toEqual({
      ok: false,
      code: "image_too_large_pixels",
    });
  });

  it("reports read_failed for an image whose header cannot be parsed", async () => {
    const truncated = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(16, 0x01),
    ]);

    expect(await validateUpload(file(truncated, "a.png", "image/png"), PRODUCT_IMAGE)).toEqual({
      ok: false,
      code: "read_failed",
    });
  });
});

describe("validateUpload: I/O", () => {
  it("reports read_failed when the file cannot be read", async () => {
    const unreadable = file(pdfBytes(), "a.pdf", "application/pdf");
    vi.spyOn(unreadable, "arrayBuffer").mockRejectedValue(new Error("disk error"));

    expect(await validateUpload(unreadable, INQUIRY_ATTACHMENT)).toEqual({
      ok: false,
      code: "read_failed",
    });
  });
});
