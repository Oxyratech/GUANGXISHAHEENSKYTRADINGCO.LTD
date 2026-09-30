// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    product: { findUnique: vi.fn() },
    productDocument: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mediaAsset: { findUnique: vi.fn(), deleteMany: vi.fn() },
    productDocumentTranslation: { upsert: vi.fn() },
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
  PUBLIC_DOCUMENT: { name: "PUBLIC_DOCUMENT" },
}));

import { AuthorizationError } from "@/server/auth/authorize";
import {
  removeProductDocument,
  setProductDocumentKind,
  updateProductDocumentTranslation,
  uploadProductDocument,
} from "./document-actions";

const IP_HASH = "a".repeat(64);
const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";
const MEDIA_ID = "22222222-2222-2222-2222-222222222222";
const DOCUMENT_ID = "33333333-3333-3333-3333-333333333333";

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

function pdfFile(name = "spec.pdf"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "application/pdf" });
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.product.findUnique
    .mockReset()
    .mockResolvedValue({ slug: "steel-wire-mesh", categorySlug: "hardware-products" });
  mocks.db.productDocument.count.mockReset().mockResolvedValue(0);
  mocks.db.productDocument.create.mockReset();
  mocks.db.productDocument.findFirst.mockReset();
  mocks.db.productDocument.findMany.mockReset().mockResolvedValue([]);
  mocks.db.productDocument.update.mockReset();
  mocks.db.productDocument.delete.mockReset();
  mocks.db.mediaAsset.findUnique.mockReset();
  mocks.db.mediaAsset.deleteMany.mockReset().mockResolvedValue({ count: 1 });
  mocks.db.productDocumentTranslation.upsert.mockReset().mockResolvedValue({});
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

describe("uploadProductDocument", () => {
  it("requires product:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:write"));
    const state = await uploadProductDocument(
      undefined,
      form({ productId: PRODUCT_ID, kind: "CATALOGUE", file: pdfFile() }),
    );
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.storeUpload).not.toHaveBeenCalled();
  });

  it("rejects an unknown document kind", async () => {
    const state = await uploadProductDocument(
      undefined,
      form({ productId: PRODUCT_ID, kind: "BOGUS", file: pdfFile() }),
    );
    expect(state).toMatchObject({ status: "error", code: "validation" });
  });

  it("refuses at the document limit", async () => {
    mocks.db.productDocument.count.mockResolvedValue(10);
    const state = await uploadProductDocument(
      undefined,
      form({ productId: PRODUCT_ID, kind: "CATALOGUE", file: pdfFile() }),
    );
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.storeUpload).not.toHaveBeenCalled();
  });

  it("accepts CERTIFICATE like any other kind — it is never generated, only chosen", async () => {
    mocks.storeUpload.mockResolvedValue({ ok: true, asset: { id: MEDIA_ID, fileName: "cert.pdf" } });
    mocks.db.productDocument.create.mockResolvedValue({ id: DOCUMENT_ID });

    const state = await uploadProductDocument(
      undefined,
      form({ productId: PRODUCT_ID, kind: "CERTIFICATE", file: pdfFile("cert.pdf") }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.productDocument.create).toHaveBeenCalledWith({
      data: { productId: PRODUCT_ID, mediaAssetId: MEDIA_ID, kind: "CERTIFICATE", sortOrder: 0 },
      select: { id: true },
    });
  });

  it("maps a rejected upload to a field error", async () => {
    mocks.storeUpload.mockResolvedValue({ ok: false, code: "type_not_allowed" });
    const state = await uploadProductDocument(
      undefined,
      form({ productId: PRODUCT_ID, kind: "CATALOGUE", file: pdfFile() }),
    );
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.productDocument.create).not.toHaveBeenCalled();
  });
});

describe("setProductDocumentKind", () => {
  it("refuses a document that does not belong to the product", async () => {
    mocks.db.productDocument.findFirst.mockResolvedValue(null);
    const state = await setProductDocumentKind({
      productId: PRODUCT_ID,
      documentId: DOCUMENT_ID,
      kind: "CATALOGUE",
    });
    expect(state).toMatchObject({ status: "error" });
    expect(mocks.db.productDocument.update).not.toHaveBeenCalled();
  });

  it("updates the kind", async () => {
    mocks.db.productDocument.findFirst.mockResolvedValue({ id: DOCUMENT_ID });
    const state = await setProductDocumentKind({
      productId: PRODUCT_ID,
      documentId: DOCUMENT_ID,
      kind: "SPECIFICATION_SHEET",
    });
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.productDocument.update).toHaveBeenCalledWith({
      where: { id: DOCUMENT_ID },
      data: { kind: "SPECIFICATION_SHEET" },
    });
  });
});

describe("removeProductDocument", () => {
  it("deletes the row and the underlying asset only when unused elsewhere", async () => {
    mocks.db.productDocument.findFirst.mockResolvedValue({
      id: DOCUMENT_ID,
      mediaAssetId: MEDIA_ID,
    });
    mocks.db.mediaAsset.findUnique.mockResolvedValue({
      _count: { productImages: 0, productDocs: 0, attachments: 0, newsCovers: 0, seoOgImages: 0 },
    });

    const state = await removeProductDocument({ productId: PRODUCT_ID, documentId: DOCUMENT_ID });

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.productDocument.delete).toHaveBeenCalledWith({ where: { id: DOCUMENT_ID } });
    expect(mocks.db.mediaAsset.deleteMany).toHaveBeenCalledWith({ where: { id: MEDIA_ID } });
  });

  it("keeps the asset when something else still uses it", async () => {
    mocks.db.productDocument.findFirst.mockResolvedValue({
      id: DOCUMENT_ID,
      mediaAssetId: MEDIA_ID,
    });
    mocks.db.mediaAsset.findUnique.mockResolvedValue({
      _count: { productImages: 0, productDocs: 1, attachments: 0, newsCovers: 0, seoOgImages: 0 },
    });

    await removeProductDocument({ productId: PRODUCT_ID, documentId: DOCUMENT_ID });

    expect(mocks.db.mediaAsset.deleteMany).not.toHaveBeenCalled();
  });
});

describe("updateProductDocumentTranslation", () => {
  it("requires a title (ProductDocumentTranslation.title is NOT NULL)", async () => {
    mocks.db.productDocument.findFirst.mockResolvedValue({ id: DOCUMENT_ID });

    const state = await updateProductDocumentTranslation({
      productId: PRODUCT_ID,
      documentId: DOCUMENT_ID,
      locale: "en",
      title: "",
    });

    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.db.productDocumentTranslation.upsert).not.toHaveBeenCalled();
  });

  it("upserts the title for the locale", async () => {
    mocks.db.productDocument.findFirst.mockResolvedValue({ id: DOCUMENT_ID });

    const state = await updateProductDocumentTranslation({
      productId: PRODUCT_ID,
      documentId: DOCUMENT_ID,
      locale: "en",
      title: "Catalogue",
    });

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.productDocumentTranslation.upsert).toHaveBeenCalledWith({
      where: { documentId_locale: { documentId: DOCUMENT_ID, locale: "en" } },
      create: { documentId: DOCUMENT_ID, locale: "en", title: "Catalogue" },
      update: { title: "Catalogue" },
    });
  });
});
