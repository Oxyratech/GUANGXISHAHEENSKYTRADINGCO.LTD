// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    newsCategory: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    newsCategoryTranslation: { upsert: vi.fn() },
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

vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
  unstable_cache: <T>(fn: T) => fn,
}));
vi.mock("@/server/auth/authorize", () => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return { AuthenticationError, AuthorizationError, requirePermissionOrThrow: mocks.requirePermissionOrThrow };
});
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/server/db", async () => ({ ...(await import("@/server/db/errors")), getDb: mocks.getDb }));

import { AuthorizationError } from "@/server/auth/authorize";
import { createNewsCategory, updateNewsCategory } from "./actions";

const IP_HASH = "a".repeat(64);
const CATEGORY_ID = "11111111-1111-1111-1111-111111111111";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "staff-1", email: "staff@example.com", name: "Staff" },
  roles: ["CONTENT_MANAGER"],
  permissions: new Set(["news:write"]),
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const fields = { slug: "company-news", sortOrder: "1", name_en: "Company news", name_zh: "公司新闻", name_ar: "أخبار الشركة" };

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.newsCategory.findUnique.mockReset();
  mocks.db.newsCategory.findFirst.mockReset().mockResolvedValue(null);
  mocks.db.newsCategory.create.mockReset().mockResolvedValue({ id: CATEGORY_ID });
  mocks.db.newsCategory.update.mockReset().mockResolvedValue({});
  mocks.db.newsCategoryTranslation.upsert.mockReset().mockResolvedValue({});
  mocks.db.$transaction.mockReset().mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.revalidateTag.mockReset();
  mocks.getRequestContext.mockReset().mockResolvedValue({ ip: "1.2.3.4", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("createNewsCategory", () => {
  it("requires news:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("news:write"));
    const state = await createNewsCategory(undefined, form(fields));
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.newsCategory.create).not.toHaveBeenCalled();
  });

  it("rejects a slug already in use", async () => {
    mocks.db.newsCategory.findUnique.mockResolvedValue({ id: "existing" });
    const state = await createNewsCategory(undefined, form(fields));
    expect(state).toMatchObject({ status: "error", code: "rejected", fieldErrors: { slug: expect.any(Array) } });
  });

  it("creates the category with a name in every locale", async () => {
    mocks.db.newsCategory.findUnique.mockResolvedValue(null);
    const state = await createNewsCategory(undefined, form(fields));
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.newsCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "company-news",
          sortOrder: 1,
          translations: {
            create: [
              { locale: "en", name: "Company news" },
              { locale: "zh", name: "公司新闻" },
              { locale: "ar", name: "أخبار الشركة" },
            ],
          },
        }),
      }),
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith("news", { expire: 0 });
  });
});

describe("updateNewsCategory", () => {
  it("rejects a slug used by a different category", async () => {
    mocks.db.newsCategory.findFirst.mockResolvedValue({ id: "other" });
    const state = await updateNewsCategory(undefined, form({ ...fields, id: CATEGORY_ID }));
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.newsCategory.update).not.toHaveBeenCalled();
  });

  it("refuses when the category no longer exists", async () => {
    mocks.db.newsCategory.findUnique.mockResolvedValue(null);
    const state = await updateNewsCategory(undefined, form({ ...fields, id: CATEGORY_ID }));
    expect(state).toMatchObject({ status: "error", code: "rejected" });
  });

  it("updates the slug, order and every locale's name", async () => {
    mocks.db.newsCategory.findUnique.mockResolvedValue({ id: CATEGORY_ID });
    const state = await updateNewsCategory(undefined, form({ ...fields, id: CATEGORY_ID }));
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.newsCategoryTranslation.upsert).toHaveBeenCalledTimes(3);
  });
});
