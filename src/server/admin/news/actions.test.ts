// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Authorize from "@/server/auth/authorize";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    newsArticle: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    newsArticleTag: { deleteMany: vi.fn(), createMany: vi.fn() },
    newsTag: { findMany: vi.fn(), create: vi.fn() },
    mediaAsset: { findUnique: vi.fn() },
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
vi.mock("@/server/auth/authorize", async (importOriginal) => {
  const actual = await importOriginal<typeof Authorize>();
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return {
    ...actual,
    AuthenticationError,
    AuthorizationError,
    requirePermissionOrThrow: mocks.requirePermissionOrThrow,
  };
});
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));

import { AuthorizationError } from "@/server/auth/authorize";
import {
  createNewsArticle,
  createNewsTranslation,
  deleteNewsArticle,
  setNewsStatus,
  updateNewsArticle,
} from "./actions";

const IP_HASH = "a".repeat(64);
const ARTICLE_ID = "11111111-1111-1111-1111-111111111111";

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

function sessionWith(...permissions: string[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "staff-1", email: "staff@example.com", name: "Staff Writer" },
    roles: ["CONTENT_MANAGER"],
    permissions: new Set(permissions) as never,
  };
}

const WRITER = sessionWith("news:write");
const PUBLISHER = sessionWith("news:write", "news:publish");

const baseArticleFields = {
  locale: "en",
  slug: "expo-2026",
  title: "Expo 2026",
  summary: "We are attending.",
  content: "Full story.",
  authorName: "",
  categoryId: "",
  coverMediaId: "",
  status: "DRAFT",
  publishedAt: "",
  tagNames: [] as string[],
};

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.newsArticle.findUnique.mockReset();
  mocks.db.newsArticle.findFirst.mockReset().mockResolvedValue(null);
  mocks.db.newsArticle.create.mockReset().mockResolvedValue({ id: ARTICLE_ID });
  mocks.db.newsArticle.updateMany.mockReset().mockResolvedValue({ count: 1 });
  mocks.db.newsArticle.delete.mockReset().mockResolvedValue({});
  mocks.db.newsArticleTag.deleteMany.mockReset().mockResolvedValue({});
  mocks.db.newsArticleTag.createMany.mockReset().mockResolvedValue({});
  mocks.db.newsTag.findMany.mockReset().mockResolvedValue([]);
  mocks.db.newsTag.create.mockReset().mockResolvedValue({ id: "tag-1" });
  mocks.db.mediaAsset.findUnique.mockReset();
  mocks.db.$transaction.mockReset().mockImplementation((callback: (tx: typeof mocks.db) => unknown) =>
    callback(mocks.db),
  );
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(WRITER);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.revalidateTag.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "203.0.113.9", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("createNewsArticle — permission matrix", () => {
  it("requires news:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("news:write"));
    const state = await createNewsArticle(undefined, form(baseArticleFields));
    expect(state).toMatchObject({ status: "error", code: "forbidden" });
    expect(mocks.db.newsArticle.create).not.toHaveBeenCalled();
  });

  it("refuses to publish without news:publish, even though the caller holds news:write", async () => {
    const state = await createNewsArticle(
      undefined,
      form({ ...baseArticleFields, status: "PUBLISHED" }),
    );
    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      fieldErrors: { status: expect.any(Array) },
    });
    expect(mocks.db.newsArticle.create).not.toHaveBeenCalled();
  });

  it("allows publishing when the caller holds news:publish", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(PUBLISHER);
    const state = await createNewsArticle(
      undefined,
      form({ ...baseArticleFields, status: "PUBLISHED" }),
    );
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.newsArticle.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PUBLISHED" }) }),
    );
  });
});

describe("createNewsArticle — slug uniqueness per locale", () => {
  it("rejects a slug already used in the same locale", async () => {
    mocks.db.newsArticle.findFirst.mockResolvedValue({ id: "other" });
    const state = await createNewsArticle(undefined, form(baseArticleFields));
    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      fieldErrors: { slug: expect.any(Array) },
    });
    expect(mocks.db.newsArticle.create).not.toHaveBeenCalled();
  });

  it("checks uniqueness scoped to the article's own locale", async () => {
    await createNewsArticle(undefined, form({ ...baseArticleFields, locale: "zh" }));
    expect(mocks.db.newsArticle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ locale: "zh", slug: "expo-2026" }) }),
    );
  });
});

describe("createNewsArticle — scheduling", () => {
  it("defaults a published article's date to now when none is given", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(PUBLISHER);
    await createNewsArticle(undefined, form({ ...baseArticleFields, status: "PUBLISHED" }));
    const data = mocks.db.newsArticle.create.mock.calls[0]?.[0].data;
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it("accepts a future date as a schedule", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(PUBLISHER);
    const future = "2099-01-01T00:00:00.000Z";
    await createNewsArticle(
      undefined,
      form({ ...baseArticleFields, status: "PUBLISHED", publishedAt: future }),
    );
    const data = mocks.db.newsArticle.create.mock.calls[0]?.[0].data;
    expect(data.publishedAt.toISOString()).toBe(future);
  });

  it("never sets a publish date for a draft", async () => {
    await createNewsArticle(undefined, form({ ...baseArticleFields, publishedAt: "2020-01-01" }));
    const data = mocks.db.newsArticle.create.mock.calls[0]?.[0].data;
    expect(data.publishedAt).toBeNull();
  });
});

describe("createNewsArticle — tags", () => {
  it("splits the comma-separated tag field and links the resolved tags", async () => {
    mocks.db.newsTag.findMany.mockResolvedValue([{ id: "tag-existing", slug: "trade-fairs" }]);
    await createNewsArticle(
      undefined,
      form({ ...baseArticleFields, tagNames: "Trade Fairs, Canton Fair" }),
    );
    expect(mocks.db.newsTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { in: ["trade-fairs", "canton-fair"] } } }),
    );
    const data = mocks.db.newsArticle.create.mock.calls[0]?.[0].data;
    expect(data.tags.create).toEqual(
      expect.arrayContaining([{ tagId: "tag-existing" }, { tagId: "tag-1" }]),
    );
  });
});

describe("createNewsArticle — audit and revalidation", () => {
  it("audits the creation and revalidates the news tag and public pages", async () => {
    const state = await createNewsArticle(undefined, form(baseArticleFields));
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "news.created", entityId: ARTICLE_ID }),
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith("news", { expire: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/news/expo-2026");
  });
});

describe("updateNewsArticle", () => {
  const existing = { locale: "en", slug: "expo-2026" };

  it("refuses an update for an article that no longer exists", async () => {
    mocks.db.newsArticle.findUnique.mockResolvedValue(null);
    const state = await updateNewsArticle(
      undefined,
      form({ ...baseArticleFields, id: ARTICLE_ID, version: "0" }),
    );
    expect(state).toMatchObject({ status: "error", code: "rejected" });
  });

  it("reports a concurrency conflict without touching tags", async () => {
    mocks.db.newsArticle.findUnique.mockResolvedValue(existing);
    mocks.db.newsArticle.updateMany.mockResolvedValue({ count: 0 });
    const state = await updateNewsArticle(
      undefined,
      form({ ...baseArticleFields, id: ARTICLE_ID, version: "0" }),
    );
    expect(state).toMatchObject({ status: "error", code: "conflict" });
    expect(mocks.db.newsArticleTag.deleteMany).not.toHaveBeenCalled();
  });

  it("saves the new fields and revalidates the old and new slug when the slug changed", async () => {
    mocks.db.newsArticle.findUnique.mockResolvedValue(existing);
    const state = await updateNewsArticle(
      undefined,
      form({ ...baseArticleFields, id: ARTICLE_ID, version: "3", slug: "expo-2026-updated" }),
    );
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/news/expo-2026");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/news/expo-2026-updated");
  });
});

describe("setNewsStatus", () => {
  it("requires news:publish", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("news:publish"));
    const state = await setNewsStatus(
      undefined,
      form({ id: ARTICLE_ID, version: "0", status: "PUBLISHED" }),
    );
    expect(state).toMatchObject({ code: "forbidden" });
  });

  it("refuses a no-op status change", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(PUBLISHER);
    mocks.db.newsArticle.findUnique.mockResolvedValue({
      locale: "en",
      slug: "x",
      status: "DRAFT",
      publishedAt: null,
    });
    const state = await setNewsStatus(
      undefined,
      form({ id: ARTICLE_ID, version: "0", status: "DRAFT" }),
    );
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.newsArticle.updateMany).not.toHaveBeenCalled();
  });

  it("publishes and sets a publish date when there was none", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(PUBLISHER);
    mocks.db.newsArticle.findUnique.mockResolvedValue({
      locale: "en",
      slug: "x",
      status: "DRAFT",
      publishedAt: null,
    });
    const state = await setNewsStatus(
      undefined,
      form({ id: ARTICLE_ID, version: "1", status: "PUBLISHED" }),
    );
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.newsArticle.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PUBLISHED", publishedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("deleteNewsArticle", () => {
  it("requires news:delete", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("news:delete"));
    const state = await deleteNewsArticle(undefined, form({ id: ARTICLE_ID }));
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.newsArticle.delete).not.toHaveBeenCalled();
  });

  it("deletes and audits", async () => {
    mocks.requirePermissionOrThrow.mockResolvedValue(sessionWith("news:delete"));
    mocks.db.newsArticle.findUnique.mockResolvedValue({
      title: "Expo 2026",
      locale: "en",
      slug: "expo-2026",
    });
    const state = await deleteNewsArticle(undefined, form({ id: ARTICLE_ID }));
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.newsArticle.delete).toHaveBeenCalledWith({ where: { id: ARTICLE_ID } });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "news.deleted", entityId: ARTICLE_ID }),
    );
  });
});

describe("createNewsTranslation", () => {
  const source = {
    translationGroupId: "group-1",
    title: "Expo 2026",
    summary: "Summary",
    content: "Content",
    coverMediaId: null,
    categoryId: null,
    authorName: "Staff Writer",
    tags: [],
  };

  it("shares the source article's translationGroupId", async () => {
    mocks.db.newsArticle.findUnique.mockResolvedValue(source);
    const state = await createNewsTranslation(
      undefined,
      form({ sourceId: ARTICLE_ID, targetLocale: "zh" }),
    );
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.newsArticle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translationGroupId: "group-1",
          locale: "zh",
          status: "DRAFT",
        }),
      }),
    );
  });

  it("refuses when the target locale already has a version in this group", async () => {
    mocks.db.newsArticle.findUnique.mockResolvedValue(source);
    mocks.db.newsArticle.findFirst.mockResolvedValueOnce({ id: "already-exists" });
    const state = await createNewsTranslation(
      undefined,
      form({ sourceId: ARTICLE_ID, targetLocale: "zh" }),
    );
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.newsArticle.create).not.toHaveBeenCalled();
  });
});
