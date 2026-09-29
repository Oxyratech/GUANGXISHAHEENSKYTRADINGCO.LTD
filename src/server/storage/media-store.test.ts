// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    mediaAsset: { create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
    mediaBlob: { findUnique: vi.fn() },
  };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));
vi.mock("@/server/env", () => ({
  getAuthSecret: () => "k".repeat(48),
  getEnv: () => ({ UPLOAD_MAX_BYTES: 5 * 1024 * 1024 }),
}));

import { sha256Hex } from "@/server/security/hash";
import {
  deleteAsset,
  getAssetMeta,
  isValidAssetId,
  readAssetBytes,
  storeUpload,
} from "./media-store";
import { INQUIRY_ATTACHMENT, PRODUCT_IMAGE } from "./policies";
import { pdfBytes, pngBytes, text } from "./upload-fixtures";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const NOW = new Date("2026-06-18T12:00:00.000Z");

function metaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    kind: "IMAGE",
    visibility: "PUBLIC",
    fileName: "photo.png",
    mimeType: "image/png",
    sizeBytes: 100,
    sha256: "a".repeat(64),
    width: 8,
    height: 8,
    uploadedById: null,
    createdAt: NOW,
    _count: { attachments: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.db.mediaAsset.create.mockReset();
  mocks.db.mediaAsset.findUnique.mockReset();
  mocks.db.mediaAsset.deleteMany.mockReset();
  mocks.db.mediaBlob.findUnique.mockReset();
});

describe("isValidAssetId", () => {
  it("accepts GUIDs in either case and nothing else", () => {
    expect(isValidAssetId(ID)).toBe(true);
    expect(isValidAssetId(ID.toUpperCase())).toBe(true);
    for (const bad of [
      "",
      "123",
      `${ID}x`,
      "0f8fad5b-d9cb-469f-a165",
      "' OR 1=1 --",
      "../etc/passwd",
    ]) {
      expect(isValidAssetId(bad)).toBe(false);
    }
  });
});

describe("storeUpload", () => {
  it("stores metadata and bytes together, recording the detected type and the content hash", async () => {
    const png = await pngBytes(12, 7);
    mocks.db.mediaAsset.create.mockResolvedValue(
      metaRow({
        sizeBytes: png.length,
        sha256: sha256Hex(png),
        width: 12,
        height: 7,
        uploadedById: "u1",
      }),
    );
    const file = new File([new Uint8Array(png)], "Big Photo.exe.PNG", { type: "image/png" });

    const result = await storeUpload({ file, policy: PRODUCT_IMAGE, uploadedById: "u1" });

    const args = mocks.db.mediaAsset.create.mock.calls[0][0];
    expect(args.data).toMatchObject({
      kind: "IMAGE",
      visibility: "PUBLIC",
      mimeType: "image/png",
      sizeBytes: png.length,
      sha256: sha256Hex(png),
      width: 12,
      height: 7,
      uploadedById: "u1",
    });
    // Only the extension of the detected type survives, and inner dots are flattened.
    expect(args.data.fileName).toBe("Big Photo_exe.png");
    expect(Buffer.from(args.data.blob.create.data).equals(png)).toBe(true);
    // Reading the row back must never pull the bytes.
    expect(args.select).not.toHaveProperty("blob");

    expect(result).toEqual({
      ok: true,
      asset: expect.objectContaining({
        id: ID,
        kind: "IMAGE",
        visibility: "PUBLIC",
        sha256: sha256Hex(png),
      }),
    });
    expect(JSON.stringify(result)).not.toContain("blob");
  });

  it("takes visibility from the policy (private for inquiry attachments)", async () => {
    mocks.db.mediaAsset.create.mockResolvedValue(
      metaRow({ kind: "DOCUMENT", visibility: "PRIVATE" }),
    );

    await storeUpload({
      file: new File([pdfBytes()], "quote.pdf", { type: "application/pdf" }),
      policy: INQUIRY_ATTACHMENT,
    });

    const { data } = mocks.db.mediaAsset.create.mock.calls[0][0];
    expect(data).toMatchObject({
      kind: "DOCUMENT",
      visibility: "PRIVATE",
      mimeType: "application/pdf",
      uploadedById: null,
    });
    expect(data.width).toBeNull();
  });

  it("returns the validation code and writes nothing for a rejected file", async () => {
    const result = await storeUpload({
      file: new File([text("MZ\x90\x00\x03")], "invoice.png", { type: "image/png" }),
      policy: PRODUCT_IMAGE,
    });

    expect(result).toEqual({ ok: false, code: "type_not_allowed" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("surfaces a connection failure as DatabaseUnavailableError", async () => {
    mocks.db.mediaAsset.create.mockRejectedValue(
      Object.assign(new Error("down"), { code: "P1001" }),
    );

    await expect(
      storeUpload({
        file: new File([pdfBytes()], "a.pdf", { type: "application/pdf" }),
        policy: INQUIRY_ATTACHMENT,
      }),
    ).rejects.toMatchObject({ name: "DatabaseUnavailableError" });
  });
});

describe("getAssetMeta", () => {
  it("returns null for a malformed id without querying", async () => {
    expect(await getAssetMeta("not-a-guid")).toBeNull();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("returns null when there is no such asset", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue(null);
    expect(await getAssetMeta(ID)).toBeNull();
  });

  it("maps a row, flagging inquiry attachments", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue(
      metaRow({ visibility: "PRIVATE", _count: { attachments: 2 } }),
    );

    expect(await getAssetMeta(ID)).toMatchObject({
      id: ID,
      visibility: "PRIVATE",
      isInquiryAttachment: true,
      createdAt: NOW,
    });
  });

  it("fails closed on an unrecognised visibility value", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue(
      metaRow({ visibility: "SOMETHING_ELSE", kind: "WEIRD" }),
    );

    expect(await getAssetMeta(ID)).toMatchObject({ visibility: "PRIVATE", kind: "DOCUMENT" });
  });
});

describe("readAssetBytes", () => {
  it("returns the stored bytes", async () => {
    mocks.db.mediaBlob.findUnique.mockResolvedValue({ data: new Uint8Array([1, 2, 3]) });

    const bytes = await readAssetBytes(ID);

    expect(bytes).toEqual(Buffer.from([1, 2, 3]));
    expect(mocks.db.mediaBlob.findUnique).toHaveBeenCalledWith({
      where: { mediaAssetId: ID },
      select: { data: true },
    });
  });

  it("returns null for a missing blob or a malformed id", async () => {
    mocks.db.mediaBlob.findUnique.mockResolvedValue(null);

    expect(await readAssetBytes(ID)).toBeNull();
    expect(await readAssetBytes("nope")).toBeNull();
  });
});

describe("deleteAsset", () => {
  const counts = (overrides: Record<string, number> = {}) => ({
    _count: {
      productImages: 0,
      productDocs: 0,
      attachments: 0,
      newsCovers: 0,
      seoOgImages: 0,
      ...overrides,
    },
  });

  it("deletes an unreferenced asset", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue(counts());
    mocks.db.mediaAsset.deleteMany.mockResolvedValue({ count: 1 });

    expect(await deleteAsset(ID)).toBe("deleted");
    expect(mocks.db.mediaAsset.deleteMany).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it.each(["productImages", "productDocs", "attachments", "newsCovers", "seoOgImages"])(
    "refuses to delete an asset still used by %s",
    async (relation) => {
      mocks.db.mediaAsset.findUnique.mockResolvedValue(counts({ [relation]: 1 }));

      expect(await deleteAsset(ID)).toBe("in_use");
      expect(mocks.db.mediaAsset.deleteMany).not.toHaveBeenCalled();
    },
  );

  it("reports not_found for unknown or malformed ids", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue(null);
    expect(await deleteAsset(ID)).toBe("not_found");
    expect(await deleteAsset("bad")).toBe("not_found");
  });

  it("maps a foreign-key violation from a concurrent reference to in_use", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue(counts());
    mocks.db.mediaAsset.deleteMany.mockRejectedValue(
      Object.assign(new Error("FK"), { code: "P2003" }),
    );

    expect(await deleteAsset(ID)).toBe("in_use");
  });
});
