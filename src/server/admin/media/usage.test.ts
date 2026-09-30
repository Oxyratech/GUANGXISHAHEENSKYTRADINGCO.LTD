// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";

const mocks = vi.hoisted(() => {
  const db = { mediaAsset: { findUnique: vi.fn() } };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({
  getDb: mocks.getDb,
  // Real behaviour is enough for these tests: pass a DatabaseUnavailableError through unchanged.
  toDatabaseError: (error: unknown) => error,
}));

import { describeMediaUsage, findMediaUsage, isMediaUsed } from "./usage";

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.mediaAsset.findUnique.mockReset();
});

describe("findMediaUsage", () => {
  it("returns null when the asset does not exist", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue(null);

    expect(await findMediaUsage("missing")).toBeNull();
  });

  it("reports every relation, with product names falling back when English is missing", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue({
      productImages: [
        {
          product: {
            id: "p1",
            slug: "widget",
            translations: [{ locale: "zh", name: "小部件" }],
          },
        },
      ],
      productDocs: [
        {
          product: { id: "p2", slug: "gadget", translations: [{ locale: "en", name: "Gadget" }] },
        },
      ],
      newsCovers: [{ id: "n1", locale: "en", slug: "launch", title: "Launch" }],
      seoOgImages: [{ id: "s1", scope: "PAGE", refKey: "home", locale: "en" }],
      attachments: [{ id: "a1", inquiryId: "i1", inquiry: { referenceCode: "INQ-1" } }],
    });

    const usage = await findMediaUsage("m1");

    expect(usage).toEqual({
      productImages: [{ id: "p1", slug: "widget", name: "小部件" }],
      productDocuments: [{ id: "p2", slug: "gadget", name: "Gadget" }],
      newsCovers: [{ id: "n1", locale: "en", slug: "launch", title: "Launch" }],
      seoOgImages: [{ id: "s1", scope: "PAGE", refKey: "home", locale: "en" }],
      inquiryAttachments: [{ id: "a1", inquiryId: "i1", referenceCode: "INQ-1" }],
    });
    expect(isMediaUsed(usage!)).toBe(true);
  });

  it("reports an unused asset as not used and describes it as an empty list", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue({
      productImages: [],
      productDocs: [],
      newsCovers: [],
      seoOgImages: [],
      attachments: [],
    });

    const usage = await findMediaUsage("m1");

    expect(isMediaUsed(usage!)).toBe(false);
    expect(describeMediaUsage(usage!)).toEqual([]);
  });

  it("describes usage in plain, pluralised English", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue({
      productImages: [
        { product: { id: "p1", slug: "a", translations: [] } },
        { product: { id: "p2", slug: "b", translations: [] } },
      ],
      productDocs: [],
      newsCovers: [{ id: "n1", locale: "en", slug: "x", title: "X" }],
      seoOgImages: [],
      attachments: [],
    });

    const usage = await findMediaUsage("m1");

    expect(describeMediaUsage(usage!)).toEqual(["2 product images", "1 news cover"]);
  });

  it("lets a database outage through", async () => {
    mocks.db.mediaAsset.findUnique.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await expect(findMediaUsage("m1")).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});
