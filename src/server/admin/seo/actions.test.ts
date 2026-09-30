// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    seoMetadata: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    mediaAsset: { findUnique: vi.fn() },
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

vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
  unstable_cache: <T>(fn: T) => fn,
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
import { deleteSeoOverride, saveSeoOverride } from "./actions";

const IP_HASH = "a".repeat(64);
const MEDIA_ID = "11111111-1111-1111-1111-111111111111";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "staff-1", email: "staff@example.com", name: "Staff" },
  roles: ["CONTENT_MANAGER"],
  permissions: new Set(["seo:write"]),
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.seoMetadata.upsert.mockReset().mockResolvedValue({ id: "seo-1" });
  mocks.db.seoMetadata.findUnique.mockReset();
  mocks.db.seoMetadata.delete.mockReset().mockResolvedValue({});
  mocks.db.mediaAsset.findUnique.mockReset();
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.revalidateTag.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "203.0.113.9", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("saveSeoOverride", () => {
  it("requires seo:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("seo:write"));

    const state = await saveSeoOverride(
      undefined,
      form({ scope: "PAGE", refKey: "about", locale: "en", title: "About" }),
    );

    expect(state).toMatchObject({ status: "error", code: "forbidden" });
    expect(mocks.db.seoMetadata.upsert).not.toHaveBeenCalled();
  });

  it("rejects an unknown scope", async () => {
    const state = await saveSeoOverride(
      undefined,
      form({ scope: "BOGUS", refKey: "about", locale: "en" }),
    );
    expect(state).toMatchObject({ status: "error", code: "validation" });
  });

  it("rejects a title longer than the database column allows", async () => {
    const state = await saveSeoOverride(
      undefined,
      form({ scope: "PAGE", refKey: "about", locale: "en", title: "x".repeat(121) }),
    );
    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.db.seoMetadata.upsert).not.toHaveBeenCalled();
  });

  it("upserts by scope, refKey and locale and expires the seo cache tag", async () => {
    const state = await saveSeoOverride(
      undefined,
      form({
        scope: "PAGE",
        refKey: "about",
        locale: "en",
        title: "Custom title",
        description: "Custom description.",
        noIndex: "on",
      }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.seoMetadata.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scope_refKey_locale: { scope: "PAGE", refKey: "about", locale: "en" } },
        create: expect.objectContaining({
          scope: "PAGE",
          refKey: "about",
          locale: "en",
          title: "Custom title",
          description: "Custom description.",
          noIndex: true,
          ogMediaId: null,
          updatedById: session.user.id,
        }),
      }),
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith("seo", { expire: 0 });
    expect(mocks.revalidateTag).not.toHaveBeenCalledWith("products", expect.anything());
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "seo.override_saved", entityId: "seo-1" }),
    );
  });

  it("refuses an og image that is not a public image", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue({ kind: "DOCUMENT", visibility: "PUBLIC" });

    const state = await saveSeoOverride(
      undefined,
      form({ scope: "PAGE", refKey: "about", locale: "en", ogMediaId: MEDIA_ID }),
    );

    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      fieldErrors: { ogMediaId: ["Choose a public image from the media library."] },
    });
    expect(mocks.db.seoMetadata.upsert).not.toHaveBeenCalled();
  });

  it("accepts a public image as the og image", async () => {
    mocks.db.mediaAsset.findUnique.mockResolvedValue({ kind: "IMAGE", visibility: "PUBLIC" });

    const state = await saveSeoOverride(
      undefined,
      form({ scope: "CATEGORY", refKey: "consumer-goods", locale: "zh", ogMediaId: MEDIA_ID }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.seoMetadata.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ ogMediaId: MEDIA_ID }) }),
    );
    // CATEGORY is read by the product catalogue's own cache, so that tag must also be expired.
    expect(mocks.revalidateTag).toHaveBeenCalledWith("products", { expire: 0 });
  });
});

describe("deleteSeoOverride", () => {
  it("requires seo:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("seo:write"));

    const state = await deleteSeoOverride(
      undefined,
      form({ scope: "PAGE", refKey: "about", locale: "en" }),
    );

    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.seoMetadata.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete an override that no longer exists", async () => {
    mocks.db.seoMetadata.findUnique.mockResolvedValue(null);

    const state = await deleteSeoOverride(
      undefined,
      form({ scope: "PAGE", refKey: "about", locale: "en" }),
    );

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.seoMetadata.delete).not.toHaveBeenCalled();
  });

  it("deletes the override and expires the seo cache tag", async () => {
    mocks.db.seoMetadata.findUnique.mockResolvedValue({ id: "seo-1" });

    const state = await deleteSeoOverride(
      undefined,
      form({ scope: "PAGE", refKey: "about", locale: "en" }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.seoMetadata.delete).toHaveBeenCalledWith({ where: { id: "seo-1" } });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("seo", { expire: 0 });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "seo.override_deleted", entityId: "seo-1" }),
    );
  });
});
