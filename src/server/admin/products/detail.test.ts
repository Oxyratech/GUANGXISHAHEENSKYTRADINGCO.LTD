// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";

const mocks = vi.hoisted(() => {
  const db = { product: { findUnique: vi.fn() } };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { findProductBySlug, getProductForEdit } from "./detail";

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.product.findUnique.mockReset();
});

const ROW = {
  id: "p1",
  slug: "steel-wire-mesh",
  categorySlug: "hardware-products",
  status: "DRAFT",
  origin: "Guangxi",
  sortOrder: 0,
  featured: false,
  publishedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-06-01T00:00:00Z"),
  version: 3,
  translations: [
    {
      locale: "en",
      name: "Steel Wire Mesh",
      shortDescription: "Woven steel mesh.",
      description: null,
      applications: null,
      packagingInfo: null,
    },
  ],
  images: [
    {
      id: "img1",
      mediaAssetId: "m1",
      sortOrder: 0,
      isPrimary: true,
      mediaAsset: {
        fileName: "mesh.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1000,
        width: 800,
        height: 600,
        translations: [{ locale: "en", altText: "Steel mesh" }],
      },
    },
  ],
  documents: [
    {
      id: "doc1",
      mediaAssetId: "m2",
      kind: "CATALOGUE",
      sortOrder: 0,
      mediaAsset: { fileName: "catalogue.pdf", mimeType: "application/pdf", sizeBytes: 2000 },
      translations: [{ locale: "en", title: "Catalogue" }],
    },
  ],
  specifications: [
    {
      id: "spec1",
      sortOrder: 0,
      translations: [{ locale: "en", label: "Mesh size", value: "4mm" }],
    },
  ],
};

describe("getProductForEdit", () => {
  it("returns null when the product does not exist", async () => {
    mocks.db.product.findUnique.mockResolvedValue(null);
    expect(await getProductForEdit("nope")).toBeNull();
  });

  it("maps every relation, keeping every locale (not just one, unlike the public reader)", async () => {
    mocks.db.product.findUnique.mockResolvedValue(ROW);

    const detail = await getProductForEdit("p1");

    expect(detail).toMatchObject({
      id: "p1",
      slug: "steel-wire-mesh",
      status: "DRAFT",
      version: 3,
    });
    expect(detail?.translations).toEqual(ROW.translations);
    expect(detail?.images[0]).toMatchObject({
      id: "img1",
      mediaAssetId: "m1",
      fileName: "mesh.jpg",
      isPrimary: true,
      translations: [{ locale: "en", altText: "Steel mesh" }],
    });
    expect(detail?.documents[0]).toMatchObject({
      id: "doc1",
      kind: "CATALOGUE",
      fileName: "catalogue.pdf",
      translations: [{ locale: "en", title: "Catalogue" }],
    });
    expect(detail?.specifications[0]).toMatchObject({
      id: "spec1",
      translations: [{ locale: "en", label: "Mesh size", value: "4mm" }],
    });
  });

  it("normalises a connection failure", async () => {
    mocks.db.product.findUnique.mockRejectedValue(
      Object.assign(new Error("x"), { code: "P1002" }),
    );
    await expect(getProductForEdit("p1")).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});

describe("findProductBySlug", () => {
  it("returns the matching id and slug, or null", async () => {
    mocks.db.product.findUnique.mockResolvedValue({ id: "p1", slug: "steel-wire-mesh" });
    expect(await findProductBySlug("steel-wire-mesh")).toEqual({ id: "p1", slug: "steel-wire-mesh" });

    mocks.db.product.findUnique.mockResolvedValue(null);
    expect(await findProductBySlug("nope")).toBeNull();
  });
});
