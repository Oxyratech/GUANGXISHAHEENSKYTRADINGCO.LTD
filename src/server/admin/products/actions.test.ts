// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    productTranslation: { upsert: vi.fn() },
    mediaAsset: { findUnique: vi.fn(), deleteMany: vi.fn() },
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

import { AuthorizationError } from "@/server/auth/authorize";
import {
  changeProductStatus,
  createProduct,
  deleteProduct,
  updateProductCore,
  upsertProductTranslation,
} from "./actions";

const IP_HASH = "a".repeat(64);
const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "staff-1", email: "staff@example.com", name: "Staff" },
  roles: ["CONTENT_MANAGER"],
  permissions: new Set(["product:write", "product:publish", "product:delete"]),
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.product.findUnique.mockReset();
  mocks.db.product.create.mockReset();
  mocks.db.product.updateMany.mockReset().mockResolvedValue({ count: 1 });
  mocks.db.product.deleteMany.mockReset().mockResolvedValue({ count: 1 });
  mocks.db.productTranslation.upsert.mockReset().mockResolvedValue({});
  mocks.db.mediaAsset.findUnique.mockReset();
  mocks.db.mediaAsset.deleteMany.mockReset().mockResolvedValue({ count: 1 });
  mocks.db.$transaction.mockReset().mockImplementation((arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: typeof mocks.db) => unknown)(mocks.db);
  });
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.revalidateTag.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "203.0.113.9", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("createProduct", () => {
  const valid = {
    name: "Steel Wire Mesh",
    slug: "steel-wire-mesh",
    categorySlug: "hardware-products",
    origin: "Guangxi",
    sortOrder: "0",
    featured: "",
  };

  it("requires product:write and never touches the database without it", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:write"));

    const state = await createProduct(undefined, form(valid));

    expect(state).toMatchObject({ status: "error", code: "forbidden" });
    expect(mocks.db.product.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown category", async () => {
    const state = await createProduct(undefined, form({ ...valid, categorySlug: "bogus" }));
    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.db.product.create).not.toHaveBeenCalled();
  });

  it("refuses a slug already used by another product", async () => {
    mocks.db.product.findUnique.mockResolvedValue({ id: OTHER_ID });

    const state = await createProduct(undefined, form(valid));

    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      fieldErrors: { slug: expect.any(Array) },
    });
    expect(mocks.db.product.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT with the English translation, audits it and revalidates", async () => {
    mocks.db.product.findUnique.mockResolvedValue(null);
    mocks.db.product.create.mockResolvedValue({ id: PRODUCT_ID, version: 0 });

    const state = await createProduct(undefined, form(valid));

    expect(state).toMatchObject({ status: "success", data: { id: PRODUCT_ID, version: 0 } });
    expect(mocks.db.product.create).toHaveBeenCalledWith({
      data: {
        slug: "steel-wire-mesh",
        categorySlug: "hardware-products",
        origin: "Guangxi",
        sortOrder: 0,
        featured: false,
        createdById: "staff-1",
        translations: { create: [{ locale: "en", name: "Steel Wire Mesh" }] },
      },
      select: { id: true, version: true },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.created", entityId: PRODUCT_ID }),
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith("products", { expire: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/products/${PRODUCT_ID}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/products/hardware-products");
  });
});

describe("updateProductCore", () => {
  const valid = {
    id: PRODUCT_ID,
    version: "2",
    slug: "steel-wire-mesh",
    categorySlug: "hardware-products",
    origin: "",
    sortOrder: "1",
    featured: "on",
  };

  it("requires product:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:write"));
    const state = await updateProductCore(undefined, form(valid));
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.product.updateMany).not.toHaveBeenCalled();
  });

  it("refuses when the product no longer exists", async () => {
    mocks.db.product.findUnique.mockResolvedValue(null);
    const state = await updateProductCore(undefined, form(valid));
    expect(state).toMatchObject({ status: "error", code: "rejected" });
  });

  it("allows keeping the same slug without a uniqueness check against itself", async () => {
    mocks.db.product.findUnique.mockResolvedValue({
      slug: "steel-wire-mesh",
      categorySlug: "hardware-products",
    });

    const state = await updateProductCore(undefined, form(valid));

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.product.updateMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, version: 2 },
      data: {
        slug: "steel-wire-mesh",
        categorySlug: "hardware-products",
        origin: null,
        sortOrder: 1,
        featured: true,
        version: { increment: 1 },
      },
    });
  });

  it("refuses a new slug already used by another product", async () => {
    mocks.db.product.findUnique
      .mockResolvedValueOnce({ slug: "old-slug", categorySlug: "hardware-products" })
      .mockResolvedValueOnce({ id: OTHER_ID });

    const state = await updateProductCore(undefined, form(valid));

    expect(state).toMatchObject({ code: "rejected", fieldErrors: { slug: expect.any(Array) } });
    expect(mocks.db.product.updateMany).not.toHaveBeenCalled();
  });

  it("reports a concurrency conflict", async () => {
    mocks.db.product.findUnique.mockResolvedValue({
      slug: "steel-wire-mesh",
      categorySlug: "hardware-products",
    });
    mocks.db.product.updateMany.mockResolvedValue({ count: 0 });

    const state = await updateProductCore(undefined, form(valid));

    expect(state).toMatchObject({
      code: "conflict",
      message: "This record was changed by someone else. Reload and try again.",
    });
  });

  it("revalidates both the old and the new category page when the category changes", async () => {
    mocks.db.product.findUnique.mockResolvedValue({
      slug: "steel-wire-mesh",
      categorySlug: "metal-products",
    });

    await updateProductCore(undefined, form(valid));

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/products/metal-products");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/products/hardware-products");
  });
});

describe("upsertProductTranslation", () => {
  const valid = {
    id: PRODUCT_ID,
    version: "1",
    locale: "zh",
    name: "钢丝网",
    shortDescription: "",
    description: "",
    applications: "",
    packagingInfo: "",
  };

  it("requires product:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:write"));
    const state = await upsertProductTranslation(undefined, form(valid));
    expect(state).toMatchObject({ code: "forbidden" });
  });

  it("rejects a blank name for any locale (ProductTranslation.name is NOT NULL)", async () => {
    const state = await upsertProductTranslation(undefined, form({ ...valid, name: "" }));
    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.db.productTranslation.upsert).not.toHaveBeenCalled();
  });

  it("refuses when the product no longer exists", async () => {
    mocks.db.product.findUnique.mockResolvedValue(null);
    const state = await upsertProductTranslation(undefined, form(valid));
    expect(state).toMatchObject({ status: "error", code: "rejected" });
  });

  it("bumps the product's version and upserts the translation in one transaction", async () => {
    mocks.db.product.findUnique.mockResolvedValue({
      slug: "steel-wire-mesh",
      categorySlug: "hardware-products",
    });

    const state = await upsertProductTranslation(undefined, form(valid));

    expect(state).toMatchObject({ status: "success", data: { locale: "zh" } });
    expect(mocks.db.product.updateMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, version: 1 },
      data: { version: { increment: 1 } },
    });
    expect(mocks.db.productTranslation.upsert).toHaveBeenCalledWith({
      where: { productId_locale: { productId: PRODUCT_ID, locale: "zh" } },
      create: {
        productId: PRODUCT_ID,
        locale: "zh",
        name: "钢丝网",
        shortDescription: null,
        description: null,
        applications: null,
        packagingInfo: null,
      },
      update: {
        name: "钢丝网",
        shortDescription: null,
        description: null,
        applications: null,
        packagingInfo: null,
      },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.translation_updated", entityId: PRODUCT_ID }),
    );
  });

  it("reports a concurrency conflict and never upserts the translation", async () => {
    mocks.db.product.findUnique.mockResolvedValue({
      slug: "steel-wire-mesh",
      categorySlug: "hardware-products",
    });
    mocks.db.product.updateMany.mockResolvedValue({ count: 0 });

    const state = await upsertProductTranslation(undefined, form(valid));

    expect(state).toMatchObject({ code: "conflict" });
    expect(mocks.db.productTranslation.upsert).not.toHaveBeenCalled();
  });
});

describe("changeProductStatus", () => {
  function withEnglish(
    overrides: Partial<{
      status: string;
      publishedAt: Date | null;
      shortDescription: string | null;
    }> = {},
  ) {
    const shortDescription =
      "shortDescription" in overrides ? overrides.shortDescription : "Woven steel mesh.";
    mocks.db.product.findUnique.mockResolvedValue({
      status: overrides.status ?? "DRAFT",
      slug: "steel-wire-mesh",
      categorySlug: "hardware-products",
      publishedAt: overrides.publishedAt ?? null,
      translations: [{ shortDescription }],
    });
  }

  it("requires product:publish", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:publish"));
    const state = await changeProductStatus(
      undefined,
      form({ id: PRODUCT_ID, version: "0", status: "PUBLISHED" }),
    );
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.product.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a no-op transition", async () => {
    withEnglish({ status: "DRAFT" });
    const state = await changeProductStatus(
      undefined,
      form({ id: PRODUCT_ID, version: "0", status: "DRAFT" }),
    );
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.product.updateMany).not.toHaveBeenCalled();
  });

  it("refuses to publish without an English translation", async () => {
    mocks.db.product.findUnique.mockResolvedValue({
      status: "DRAFT",
      slug: "steel-wire-mesh",
      categorySlug: "hardware-products",
      publishedAt: null,
      translations: [],
    });

    const state = await changeProductStatus(
      undefined,
      form({ id: PRODUCT_ID, version: "0", status: "PUBLISHED" }),
    );

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.product.updateMany).not.toHaveBeenCalled();
  });

  it("refuses to publish without an English short description", async () => {
    withEnglish({ shortDescription: null });

    const state = await changeProductStatus(
      undefined,
      form({ id: PRODUCT_ID, version: "0", status: "PUBLISHED" }),
    );

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.product.updateMany).not.toHaveBeenCalled();
  });

  it("publishes and sets publishedAt the first time", async () => {
    withEnglish({ status: "DRAFT", publishedAt: null });

    const state = await changeProductStatus(
      undefined,
      form({ id: PRODUCT_ID, version: "0", status: "PUBLISHED" }),
    );

    expect(state).toMatchObject({ status: "success", data: { status: "PUBLISHED" } });
    const data = mocks.db.product.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("PUBLISHED");
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it("does not reset publishedAt when publishing again after an unpublish", async () => {
    const firstPublishedAt = new Date("2026-01-01T00:00:00Z");
    withEnglish({ status: "DRAFT", publishedAt: firstPublishedAt });

    await changeProductStatus(
      undefined,
      form({ id: PRODUCT_ID, version: "0", status: "PUBLISHED" }),
    );

    const data = mocks.db.product.updateMany.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("publishedAt");
  });

  it("unpublishing needs no English-content precondition", async () => {
    withEnglish({ status: "PUBLISHED", shortDescription: null });

    const state = await changeProductStatus(
      undefined,
      form({ id: PRODUCT_ID, version: "0", status: "DRAFT" }),
    );

    expect(state).toMatchObject({ status: "success" });
  });

  it("reports a concurrency conflict", async () => {
    withEnglish({ status: "DRAFT" });
    mocks.db.product.updateMany.mockResolvedValue({ count: 0 });

    const state = await changeProductStatus(
      undefined,
      form({ id: PRODUCT_ID, version: "0", status: "PUBLISHED" }),
    );

    expect(state).toMatchObject({ code: "conflict" });
  });
});

describe("deleteProduct", () => {
  function withMedia() {
    mocks.db.product.findUnique.mockResolvedValue({
      slug: "steel-wire-mesh",
      categorySlug: "hardware-products",
      images: [{ mediaAssetId: "shared-1" }, { mediaAssetId: "exclusive-1" }],
      documents: [{ mediaAssetId: "exclusive-1" }],
    });
  }

  it("requires product:delete", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:delete"));
    const state = await deleteProduct(undefined, form({ id: PRODUCT_ID, version: "0" }));
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.product.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses when the product no longer exists", async () => {
    mocks.db.product.findUnique.mockResolvedValue(null);
    const state = await deleteProduct(undefined, form({ id: PRODUCT_ID, version: "0" }));
    expect(state).toMatchObject({ status: "error", code: "rejected" });
  });

  it("reports a concurrency conflict without touching media", async () => {
    withMedia();
    mocks.db.product.deleteMany.mockResolvedValue({ count: 0 });

    const state = await deleteProduct(undefined, form({ id: PRODUCT_ID, version: "0" }));

    expect(state).toMatchObject({ code: "conflict" });
    expect(mocks.db.mediaAsset.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the product and only the media assets nothing else uses", async () => {
    withMedia();
    mocks.db.mediaAsset.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "shared-1") {
        return Promise.resolve({
          _count: {
            productImages: 1,
            productDocs: 0,
            attachments: 0,
            newsCovers: 0,
            seoOgImages: 0,
          },
        });
      }
      return Promise.resolve({
        _count: { productImages: 0, productDocs: 0, attachments: 0, newsCovers: 0, seoOgImages: 0 },
      });
    });

    const state = await deleteProduct(undefined, form({ id: PRODUCT_ID, version: "5" }));

    expect(state).toMatchObject({ status: "success", data: { id: PRODUCT_ID } });
    expect(mocks.db.product.deleteMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, version: 5 },
    });
    expect(mocks.db.mediaAsset.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.db.mediaAsset.deleteMany).toHaveBeenCalledWith({ where: { id: "exclusive-1" } });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.deleted", entityId: PRODUCT_ID }),
    );
  });
});
