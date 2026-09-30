// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { PageParams } from "@/server/admin/pagination";

const mocks = vi.hoisted(() => {
  const db = {
    mediaAsset: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    inquiryAttachment: { count: vi.fn(), findMany: vi.fn() },
  };
  return { db, getDb: vi.fn(() => db), findMediaUsage: vi.fn() };
});

vi.mock("@/server/db", () => ({
  getDb: mocks.getDb,
  toDatabaseError: (error: unknown) => error,
}));
vi.mock("./usage", () => ({ findMediaUsage: mocks.findMediaUsage }));

import { getMediaAssetDetail, listMediaLibrary, listPrivateAttachments } from "./queries";

const PAGE: PageParams = { page: 1, pageSize: 20, skip: 0, take: 20 };

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.mediaAsset.count.mockReset().mockResolvedValue(0);
  mocks.db.mediaAsset.findMany.mockReset().mockResolvedValue([]);
  mocks.db.mediaAsset.findUnique.mockReset().mockResolvedValue(null);
  mocks.db.inquiryAttachment.count.mockReset().mockResolvedValue(0);
  mocks.db.inquiryAttachment.findMany.mockReset().mockResolvedValue([]);
  mocks.findMediaUsage.mockReset().mockResolvedValue(null);
});

describe("listMediaLibrary", () => {
  it("filters by kind, visibility and file name, and paginates", async () => {
    await listMediaLibrary({ kind: "IMAGE", visibility: "PUBLIC", search: "logo" }, PAGE);

    const countArgs = mocks.db.mediaAsset.count.mock.calls[0][0];
    expect(countArgs.where).toEqual({
      kind: "IMAGE",
      visibility: "PUBLIC",
      fileName: { contains: "logo" },
    });
    const findArgs = mocks.db.mediaAsset.findMany.mock.calls[0][0];
    expect(findArgs.where).toEqual(countArgs.where);
    expect(findArgs.skip).toBe(0);
    expect(findArgs.take).toBe(20);
    expect(findArgs.orderBy).toEqual({ createdAt: "desc" });
  });

  it("never selects blob bytes, and maps relation counts to usage", async () => {
    mocks.db.mediaAsset.count.mockResolvedValue(1);
    mocks.db.mediaAsset.findMany.mockResolvedValue([
      {
        id: "m1",
        kind: "IMAGE",
        visibility: "PUBLIC",
        fileName: "a.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 100,
        sha256: "a".repeat(64),
        width: 10,
        height: 10,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        uploadedBy: { id: "u1", name: "A", email: "a@example.com" },
        _count: { productImages: 2, productDocs: 0, newsCovers: 1, seoOgImages: 0, attachments: 0 },
      },
    ]);

    const { rows, meta } = await listMediaLibrary({}, PAGE);

    expect(rows[0].usage).toEqual({
      productImages: 2,
      productDocuments: 0,
      newsCovers: 1,
      seoOgImages: 0,
      inquiryAttachments: 0,
    });
    expect(meta.total).toBe(1);
    const select = mocks.db.mediaAsset.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("blob");
  });

  it("lets a database outage through", async () => {
    mocks.db.mediaAsset.count.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await expect(listMediaLibrary({}, PAGE)).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});

describe("listPrivateAttachments", () => {
  it("searches the file name and the inquiry's reference code", async () => {
    await listPrivateAttachments({ search: "INQ-1" }, PAGE);

    const args = mocks.db.inquiryAttachment.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      OR: [
        { mediaAsset: { fileName: { contains: "INQ-1" } } },
        { inquiry: { referenceCode: { contains: "INQ-1" } } },
      ],
    });
  });

  it("maps each row to its asset and its owning inquiry", async () => {
    mocks.db.inquiryAttachment.count.mockResolvedValue(1);
    mocks.db.inquiryAttachment.findMany.mockResolvedValue([
      {
        id: "att1",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        mediaAsset: { id: "m1", fileName: "spec.pdf", mimeType: "application/pdf", sizeBytes: 500 },
        inquiry: { id: "i1", referenceCode: "INQ-1", company: "Acme", status: "NEW" },
      },
    ]);

    const { rows } = await listPrivateAttachments({}, PAGE);

    expect(rows).toEqual([
      {
        id: "att1",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        asset: { id: "m1", fileName: "spec.pdf", mimeType: "application/pdf", sizeBytes: 500 },
        inquiry: { id: "i1", referenceCode: "INQ-1", company: "Acme", status: "NEW" },
      },
    ]);
  });
});

describe("getMediaAssetDetail", () => {
  it("returns null when the asset row is missing", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue(null);
    mocks.findMediaUsage.mockResolvedValue({
      productImages: [],
      productDocuments: [],
      newsCovers: [],
      seoOgImages: [],
      inquiryAttachments: [],
    });

    expect(await getMediaAssetDetail("m1")).toBeNull();
  });

  it("returns null when usage lookup finds no asset, even if the row race-resolved", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue({ id: "m1" });
    mocks.findMediaUsage.mockResolvedValue(null);

    expect(await getMediaAssetDetail("m1")).toBeNull();
  });

  it("combines the asset row with its usage", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue({
      id: "m1",
      kind: "DOCUMENT",
      visibility: "PUBLIC",
      fileName: "brochure.pdf",
      mimeType: "application/pdf",
      sizeBytes: 900,
      sha256: "b".repeat(64),
      width: null,
      height: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      uploadedBy: null,
      translations: [],
    });
    const usage = {
      productImages: [],
      productDocuments: [{ id: "p1", slug: "x", name: "X" }],
      newsCovers: [],
      seoOgImages: [],
      inquiryAttachments: [],
    };
    mocks.findMediaUsage.mockResolvedValue(usage);

    const detail = await getMediaAssetDetail("m1");

    expect(detail?.fileName).toBe("brochure.pdf");
    expect(detail?.usage).toEqual(usage);
  });
});
