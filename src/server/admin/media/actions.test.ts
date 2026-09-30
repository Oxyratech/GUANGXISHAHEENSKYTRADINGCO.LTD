// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  requirePermissionOrThrow: vi.fn(),
  writeAudit: vi.fn(),
  getRequestContext: vi.fn(),
  logError: vi.fn(),
  storeUpload: vi.fn(),
  getAssetMeta: vi.fn(),
  deleteAsset: vi.fn(),
  findMediaUsage: vi.fn(),
  isMediaUsed: vi.fn(),
  describeMediaUsage: vi.fn(),
  upsert: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  },
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
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/server/storage", () => ({
  storeUpload: mocks.storeUpload,
  getAssetMeta: mocks.getAssetMeta,
  deleteAsset: mocks.deleteAsset,
  // upload-policies.ts (real module, not mocked) builds ADMIN_UPLOAD_POLICIES from these.
  PRODUCT_IMAGE: { name: "PRODUCT_IMAGE" },
  NEWS_IMAGE: { name: "NEWS_IMAGE" },
  PUBLIC_DOCUMENT: { name: "PUBLIC_DOCUMENT" },
}));
vi.mock("./usage", () => ({
  findMediaUsage: mocks.findMediaUsage,
  isMediaUsed: mocks.isMediaUsed,
  describeMediaUsage: mocks.describeMediaUsage,
}));
vi.mock("@/server/db", () => ({
  getDb: () => ({ mediaAssetTranslation: { upsert: mocks.upsert } }),
}));

import { AuthenticationError } from "@/server/auth/authorize";
import { deleteMediaAsset, updateMediaTranslation, uploadMediaAsset } from "./actions";

const IP_HASH = "a".repeat(64);
const session: AuthSession = {
  sessionId: "s1",
  user: { id: "u1", email: "staff@example.com", name: "Staff" },
  roles: ["CONTENT_MANAGER"],
  permissions: new Set(["media:upload", "media:delete"]),
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
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.logError.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "203.0.113.9", ipHash: IP_HASH, userAgent: "UA", origin: null });
  mocks.storeUpload.mockReset();
  mocks.getAssetMeta.mockReset();
  mocks.deleteAsset.mockReset();
  mocks.findMediaUsage.mockReset();
  mocks.isMediaUsed.mockReset();
  mocks.describeMediaUsage.mockReset();
  mocks.upsert.mockReset().mockResolvedValue(undefined);
});

describe("uploadMediaAsset", () => {
  it("requires media:upload", async () => {
    await uploadMediaAsset(undefined, form({ policy: "PRODUCT_IMAGE", file: pngFile() }));
    expect(mocks.requirePermissionOrThrow).toHaveBeenCalledWith("media:upload");
  });

  it("answers unauthenticated without touching storage", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthenticationError());

    const state = await uploadMediaAsset(
      undefined,
      form({ policy: "PRODUCT_IMAGE", file: pngFile() }),
    );

    expect(state).toMatchObject({ status: "error", code: "unauthenticated" });
    expect(mocks.storeUpload).not.toHaveBeenCalled();
  });

  it("rejects an upload type outside the admin's allow-list", async () => {
    const state = await uploadMediaAsset(
      undefined,
      form({ policy: "INQUIRY_ATTACHMENT", file: pngFile() }),
    );

    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.storeUpload).not.toHaveBeenCalled();
  });

  const CASES: [string, string][] = [
    ["too_large", "This file is larger than the limit for this upload type."],
    ["empty", "This file is empty."],
    ["type_not_allowed", "This file type is not accepted for this upload type."],
    ["mismatch", "The file's declared type does not match its contents."],
    ["image_too_large_pixels", "This image's dimensions are too large."],
    ["read_failed", "The file could not be read. It may be corrupted."],
  ];

  it.each(CASES)("maps the %s upload error to a plain message", async (code, message) => {
    mocks.storeUpload.mockResolvedValue({ ok: false, code });

    const state = await uploadMediaAsset(
      undefined,
      form({ policy: "PRODUCT_IMAGE", file: pngFile() }),
    );

    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      message,
      fieldErrors: { file: [message] },
    });
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("uploads under the chosen policy, attributed to the signed-in user", async () => {
    mocks.storeUpload.mockResolvedValue({
      ok: true,
      asset: {
        id: "m1",
        kind: "IMAGE",
        visibility: "PUBLIC",
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1234,
        sha256: "a".repeat(64),
        width: 100,
        height: 80,
        uploadedById: "u1",
        createdAt: new Date("2026-09-30T00:00:00Z"),
        isInquiryAttachment: false,
      },
    });

    const state = await uploadMediaAsset(
      undefined,
      form({ policy: "PRODUCT_IMAGE", file: pngFile("photo.jpg") }),
    );

    expect(state).toMatchObject({ status: "success", data: { id: "m1", fileName: "photo.jpg" } });
    expect(state.status === "success" && state.data.createdAt).toBe("2026-09-30T00:00:00.000Z");
    expect(mocks.storeUpload.mock.calls[0][0]).toMatchObject({ uploadedById: "u1" });
    expect(mocks.storeUpload.mock.calls[0][0].policy.name).toBe("PRODUCT_IMAGE");

    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.uploaded",
        entityType: "MediaAsset",
        entityId: "m1",
        metadata: { name: "photo.jpg", size: 1234, mime: "image/jpeg", policy: "PRODUCT_IMAGE" },
      }),
    );
    // Never the bytes.
    const auditEntry = mocks.writeAudit.mock.calls[0][0];
    expect(auditEntry.metadata).not.toHaveProperty("bytes");
    expect(auditEntry.metadata).not.toHaveProperty("data");
  });
});

describe("updateMediaTranslation", () => {
  it("requires media:upload", async () => {
    mocks.getAssetMeta.mockResolvedValue({ fileName: "a.jpg" });
    await updateMediaTranslation(
      undefined,
      form({ id: "00000000-0000-0000-0000-000000000001", locale: "en", altText: "", caption: "" }),
    );
    expect(mocks.requirePermissionOrThrow).toHaveBeenCalledWith("media:upload");
  });

  it("refuses when the asset no longer exists", async () => {
    mocks.getAssetMeta.mockResolvedValue(null);

    const state = await updateMediaTranslation(
      undefined,
      form({ id: "00000000-0000-0000-0000-000000000001", locale: "en", altText: "x", caption: "" }),
    );

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("upserts alt text and caption for the given locale, blank text becoming null", async () => {
    mocks.getAssetMeta.mockResolvedValue({ fileName: "logo.png" });

    const state = await updateMediaTranslation(
      undefined,
      form({
        id: "00000000-0000-0000-0000-000000000001",
        locale: "zh",
        altText: "  公司标志  ",
        caption: "",
      }),
    );

    expect(state).toMatchObject({
      status: "success",
      data: { locale: "zh", altText: "公司标志", caption: null },
    });
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: {
        mediaAssetId_locale: { mediaAssetId: "00000000-0000-0000-0000-000000000001", locale: "zh" },
      },
      create: {
        mediaAssetId: "00000000-0000-0000-0000-000000000001",
        locale: "zh",
        altText: "公司标志",
        caption: null,
      },
      update: { altText: "公司标志", caption: null },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.translation_updated",
        entityId: "00000000-0000-0000-0000-000000000001",
      }),
    );
  });

  it("rejects a locale outside en/zh/ar", async () => {
    const state = await updateMediaTranslation(
      undefined,
      form({ id: "00000000-0000-0000-0000-000000000001", locale: "fr", altText: "", caption: "" }),
    );

    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});

describe("deleteMediaAsset", () => {
  const ID = "00000000-0000-0000-0000-000000000009";

  it("requires media:delete", async () => {
    mocks.getAssetMeta.mockResolvedValue({
      fileName: "a.jpg",
      sizeBytes: 1,
      mimeType: "image/jpeg",
    });
    mocks.findMediaUsage.mockResolvedValue(null);
    mocks.deleteAsset.mockResolvedValue("deleted");
    await deleteMediaAsset(undefined, form({ id: ID }));
    expect(mocks.requirePermissionOrThrow).toHaveBeenCalledWith("media:delete");
  });

  it("refuses when the asset no longer exists, without checking usage", async () => {
    mocks.getAssetMeta.mockResolvedValue(null);

    const state = await deleteMediaAsset(undefined, form({ id: ID }));

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.findMediaUsage).not.toHaveBeenCalled();
    expect(mocks.deleteAsset).not.toHaveBeenCalled();
  });

  it("is blocked, with an explanation, while the asset is still in use", async () => {
    mocks.getAssetMeta.mockResolvedValue({
      fileName: "hero.jpg",
      sizeBytes: 1,
      mimeType: "image/jpeg",
    });
    const usage = { productImages: [{ id: "p1", slug: "x", name: "X" }] };
    mocks.findMediaUsage.mockResolvedValue(usage);
    mocks.isMediaUsed.mockReturnValue(true);
    mocks.describeMediaUsage.mockReturnValue(["2 product images", "1 news cover"]);

    const state = await deleteMediaAsset(undefined, form({ id: ID }));

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(state.status === "error" && state.message).toContain("2 product images, 1 news cover");
    expect(mocks.deleteAsset).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("deletes and audits (name, size, mime — never bytes) when nothing uses it", async () => {
    mocks.getAssetMeta.mockResolvedValue({
      fileName: "hero.jpg",
      sizeBytes: 2048,
      mimeType: "image/jpeg",
    });
    mocks.findMediaUsage.mockResolvedValue({
      productImages: [],
      productDocuments: [],
      newsCovers: [],
      seoOgImages: [],
      inquiryAttachments: [],
    });
    mocks.isMediaUsed.mockReturnValue(false);
    mocks.deleteAsset.mockResolvedValue("deleted");

    const state = await deleteMediaAsset(undefined, form({ id: ID }));

    expect(state).toMatchObject({ status: "success", data: { id: ID } });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.deleted",
        entityId: ID,
        metadata: { name: "hero.jpg", size: 2048, mime: "image/jpeg" },
      }),
    );
    expect(JSON.stringify(mocks.writeAudit.mock.calls[0][0])).not.toMatch(/blob|bytes/i);
  });

  it("reports a race (used elsewhere the instant it was deleted) without pretending nothing happened", async () => {
    mocks.getAssetMeta.mockResolvedValue({
      fileName: "hero.jpg",
      sizeBytes: 1,
      mimeType: "image/jpeg",
    });
    mocks.findMediaUsage.mockResolvedValue({
      productImages: [],
      productDocuments: [],
      newsCovers: [],
      seoOgImages: [],
      inquiryAttachments: [],
    });
    mocks.isMediaUsed.mockReturnValue(false);
    mocks.deleteAsset.mockResolvedValue("in_use");

    const state = await deleteMediaAsset(undefined, form({ id: ID }));

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });
});
