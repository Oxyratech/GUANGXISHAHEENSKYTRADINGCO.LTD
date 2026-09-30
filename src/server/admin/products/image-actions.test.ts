// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    product: { findUnique: vi.fn() },
    productImage: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    mediaAsset: { findUnique: vi.fn(), deleteMany: vi.fn() },
    mediaAssetTranslation: { upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    db,
    getDb: vi.fn(() => db),
    requirePermissionOrThrow: vi.fn(),
    writeAudit: vi.fn(),
    getRequestContext: vi.fn(),
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    storeUpload: vi.fn(),
  };
});

class RedirectSignal extends Error {}

vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  },
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock("@/server/auth/authorize", () => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return {
    AuthenticationError,
    AuthorizationError,
    requirePermissionOrThrow: mocks.requirePermissionOrThrow,
  };
});
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/server/storage", () => ({
  storeUpload: mocks.storeUpload,
  PRODUCT_IMAGE: { name: "PRODUCT_IMAGE" },
}));

import { AuthorizationError } from "@/server/auth/authorize";
import {
  moveProductImage,
  removeProductImage,
  setPrimaryProductImage,
  updateProductImageTranslation,
  uploadProductImage,
} from "./image-actions";

const IP_HASH = "a".repeat(64);
const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";
const MEDIA_ID = "22222222-2222-2222-2222-222222222222";
const IMAGE_A = "33333333-3333-3333-3333-333333333333";
const IMAGE_B = "44444444-4444-4444-4444-444444444444";
const IMAGE_C = "55555555-5555-5555-5555-555555555555";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "staff-1", email: "staff@example.com", name: "Staff" },
  roles: ["CONTENT_MANAGER"],
  permissions: new Set(["product:write"]),
};

function form(entries: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

function pngFile(name = "a.png"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.product.findUnique
    .mockReset()
    .mockResolvedValue({ slug: "steel-wire-mesh", categorySlug: "hardware-products" });
  mocks.db.productImage.count.mockReset().mockResolvedValue(0);
  mocks.db.productImage.create.mockReset();
  mocks.db.productImage.findFirst.mockReset();
  mocks.db.productImage.findMany.mockReset().mockResolvedValue([]);
  mocks.db.productImage.update.mockReset();
  mocks.db.productImage.updateMany.mockReset();
  mocks.db.productImage.delete.mockReset();
  mocks.db.mediaAsset.findUnique.mockReset();
  mocks.db.mediaAsset.deleteMany.mockReset().mockResolvedValue({ count: 1 });
  mocks.db.mediaAssetTranslation.upsert.mockReset().mockResolvedValue({});
  mocks.db.$transaction.mockReset().mockImplementation((arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: typeof mocks.db) => unknown)(mocks.db);
  });
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.revalidateTag.mockReset();
  mocks.storeUpload.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "203.0.113.9", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("uploadProductImage", () => {
  it("requires product:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:write"));
    const state = await uploadProductImage(
      undefined,
      form({ productId: PRODUCT_ID, file: pngFile() }),
    );
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.storeUpload).not.toHaveBeenCalled();
  });

  it("refuses at the image limit without calling storeUpload", async () => {
    mocks.db.productImage.count.mockResolvedValue(12);
    const state = await uploadProductImage(
      undefined,
      form({ productId: PRODUCT_ID, file: pngFile() }),
    );
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.storeUpload).not.toHaveBeenCalled();
  });

  it("marks the first uploaded image primary, later ones not", async () => {
    mocks.storeUpload.mockResolvedValue({
      ok: true,
      asset: { id: MEDIA_ID, fileName: "a.jpg" },
    });
    mocks.db.productImage.create.mockResolvedValue({ id: IMAGE_A });
    mocks.db.productImage.count.mockResolvedValue(0);

    await uploadProductImage(undefined, form({ productId: PRODUCT_ID, file: pngFile() }));

    expect(mocks.db.productImage.create).toHaveBeenCalledWith({
      data: { productId: PRODUCT_ID, mediaAssetId: MEDIA_ID, sortOrder: 0, isPrimary: true },
      select: { id: true },
    });

    mocks.db.productImage.count.mockResolvedValue(1);
    await uploadProductImage(undefined, form({ productId: PRODUCT_ID, file: pngFile() }));
    expect(mocks.db.productImage.create).toHaveBeenLastCalledWith({
      data: { productId: PRODUCT_ID, mediaAssetId: MEDIA_ID, sortOrder: 1, isPrimary: false },
      select: { id: true },
    });
  });

  it("maps a rejected upload to a field error and never creates a ProductImage row", async () => {
    mocks.storeUpload.mockResolvedValue({ ok: false, code: "type_not_allowed" });
    const state = await uploadProductImage(
      undefined,
      form({ productId: PRODUCT_ID, file: pngFile() }),
    );
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.productImage.create).not.toHaveBeenCalled();
  });
});

describe("setPrimaryProductImage", () => {
  it("refuses an image that does not belong to the product", async () => {
    mocks.db.productImage.findFirst.mockResolvedValue(null);
    const state = await setPrimaryProductImage({ productId: PRODUCT_ID, imageId: IMAGE_A });
    expect(state).toMatchObject({ status: "error" });
    expect(mocks.db.productImage.updateMany).not.toHaveBeenCalled();
  });

  it("clears every image's primary flag before setting the chosen one", async () => {
    mocks.db.productImage.findFirst.mockResolvedValue({ id: IMAGE_B });

    const state = await setPrimaryProductImage({ productId: PRODUCT_ID, imageId: IMAGE_B });

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.productImage.updateMany).toHaveBeenCalledWith({
      where: { productId: PRODUCT_ID },
      data: { isPrimary: false },
    });
    expect(mocks.db.productImage.update).toHaveBeenCalledWith({
      where: { id: IMAGE_B },
      data: { isPrimary: true },
    });
  });
});

describe("moveProductImage", () => {
  const rows = [
    { id: IMAGE_A, sortOrder: 0 },
    { id: IMAGE_B, sortOrder: 1 },
    { id: IMAGE_C, sortOrder: 2 },
  ];

  it("swaps sortOrder with the previous row when moving up", async () => {
    mocks.db.productImage.findMany.mockResolvedValue(rows);
    await moveProductImage({ productId: PRODUCT_ID, imageId: IMAGE_B, direction: "up" });
    expect(mocks.db.productImage.update).toHaveBeenCalledWith({
      where: { id: IMAGE_B },
      data: { sortOrder: 0 },
    });
    expect(mocks.db.productImage.update).toHaveBeenCalledWith({
      where: { id: IMAGE_A },
      data: { sortOrder: 1 },
    });
  });

  it("swaps sortOrder with the next row when moving down", async () => {
    mocks.db.productImage.findMany.mockResolvedValue(rows);
    await moveProductImage({ productId: PRODUCT_ID, imageId: IMAGE_B, direction: "down" });
    expect(mocks.db.productImage.update).toHaveBeenCalledWith({
      where: { id: IMAGE_B },
      data: { sortOrder: 2 },
    });
    expect(mocks.db.productImage.update).toHaveBeenCalledWith({
      where: { id: IMAGE_C },
      data: { sortOrder: 1 },
    });
  });

  it("is a no-op at either end of the list", async () => {
    mocks.db.productImage.findMany.mockResolvedValue(rows);

    const atTop = await moveProductImage({
      productId: PRODUCT_ID,
      imageId: IMAGE_A,
      direction: "up",
    });
    expect(atTop).toMatchObject({ status: "success", message: "Already at that end." });
    expect(mocks.db.productImage.update).not.toHaveBeenCalled();

    const atBottom = await moveProductImage({
      productId: PRODUCT_ID,
      imageId: IMAGE_C,
      direction: "down",
    });
    expect(atBottom).toMatchObject({ status: "success", message: "Already at that end." });
    expect(mocks.db.productImage.update).not.toHaveBeenCalled();
  });
});

describe("removeProductImage", () => {
  it("promotes the next image to primary when the removed one was primary", async () => {
    mocks.db.productImage.findFirst
      .mockResolvedValueOnce({ id: IMAGE_A, mediaAssetId: MEDIA_ID, isPrimary: true })
      .mockResolvedValueOnce({ id: IMAGE_B });
    mocks.db.mediaAsset.findUnique.mockResolvedValue({
      _count: { productImages: 0, productDocs: 0, attachments: 0, newsCovers: 0, seoOgImages: 0 },
    });

    const state = await removeProductImage({ productId: PRODUCT_ID, imageId: IMAGE_A });

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.productImage.delete).toHaveBeenCalledWith({ where: { id: IMAGE_A } });
    expect(mocks.db.productImage.update).toHaveBeenCalledWith({
      where: { id: IMAGE_B },
      data: { isPrimary: true },
    });
  });

  it("deletes the underlying MediaAsset only when nothing else uses it", async () => {
    mocks.db.productImage.findFirst.mockResolvedValue({
      id: IMAGE_A,
      mediaAssetId: MEDIA_ID,
      isPrimary: false,
    });
    mocks.db.mediaAsset.findUnique.mockResolvedValue({
      _count: { productImages: 1, productDocs: 0, attachments: 0, newsCovers: 0, seoOgImages: 0 },
    });

    await removeProductImage({ productId: PRODUCT_ID, imageId: IMAGE_A });

    expect(mocks.db.mediaAsset.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses an image that does not belong to the product", async () => {
    mocks.db.productImage.findFirst.mockResolvedValue(null);
    const state = await removeProductImage({ productId: PRODUCT_ID, imageId: IMAGE_A });
    expect(state).toMatchObject({ status: "error" });
    expect(mocks.db.productImage.delete).not.toHaveBeenCalled();
  });
});

describe("updateProductImageTranslation", () => {
  it("upserts alt text, blank becoming null", async () => {
    mocks.db.productImage.findFirst.mockResolvedValue({ id: IMAGE_A });

    const state = await updateProductImageTranslation({
      productId: PRODUCT_ID,
      mediaAssetId: MEDIA_ID,
      locale: "zh",
      altText: "钢丝网",
    });

    expect(state).toMatchObject({ status: "success", data: { locale: "zh", altText: "钢丝网" } });
    expect(mocks.db.mediaAssetTranslation.upsert).toHaveBeenCalledWith({
      where: { mediaAssetId_locale: { mediaAssetId: MEDIA_ID, locale: "zh" } },
      create: { mediaAssetId: MEDIA_ID, locale: "zh", altText: "钢丝网" },
      update: { altText: "钢丝网" },
    });
  });
});
