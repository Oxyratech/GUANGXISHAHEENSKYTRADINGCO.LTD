// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    newsTag: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    newsTagTranslation: { upsert: vi.fn() },
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
  return {
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
import { createNewsTag, updateNewsTag } from "./actions";

const IP_HASH = "a".repeat(64);
const TAG_ID = "11111111-1111-1111-1111-111111111111";

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

const fields = {
  slug: "trade-fairs",
  name_en: "Trade fairs",
  name_zh: "贸易展会",
  name_ar: "معارض تجارية",
};

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.newsTag.findUnique.mockReset();
  mocks.db.newsTag.findFirst.mockReset().mockResolvedValue(null);
  mocks.db.newsTag.create.mockReset().mockResolvedValue({ id: TAG_ID });
  mocks.db.newsTag.update.mockReset().mockResolvedValue({});
  mocks.db.newsTagTranslation.upsert.mockReset().mockResolvedValue({});
  mocks.db.$transaction
    .mockReset()
    .mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.revalidateTag.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "1.2.3.4", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("createNewsTag", () => {
  it("requires news:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("news:write"));
    const state = await createNewsTag(undefined, form(fields));
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.newsTag.create).not.toHaveBeenCalled();
  });

  it("rejects a slug already in use", async () => {
    mocks.db.newsTag.findUnique.mockResolvedValue({ id: "existing" });
    const state = await createNewsTag(undefined, form(fields));
    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      fieldErrors: { slug: expect.any(Array) },
    });
  });

  it("creates the tag with a name in every locale and revalidates", async () => {
    const state = await createNewsTag(undefined, form(fields));
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.newsTag.create).toHaveBeenCalledWith({
      data: {
        slug: "trade-fairs",
        translations: {
          create: [
            { locale: "en", name: "Trade fairs" },
            { locale: "zh", name: "贸易展会" },
            { locale: "ar", name: "معارض تجارية" },
          ],
        },
      },
      select: { id: true },
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("news", { expire: 0 });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "news.tag_created", entityId: TAG_ID }),
    );
  });
});

describe("updateNewsTag", () => {
  it("rejects a slug used by a different tag", async () => {
    mocks.db.newsTag.findFirst.mockResolvedValue({ id: "other" });
    const state = await updateNewsTag(undefined, form({ ...fields, id: TAG_ID }));
    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.newsTag.update).not.toHaveBeenCalled();
  });

  it("refuses when the tag no longer exists", async () => {
    mocks.db.newsTag.findUnique.mockResolvedValue(null);
    const state = await updateNewsTag(undefined, form({ ...fields, id: TAG_ID }));
    expect(state).toMatchObject({ status: "error", code: "rejected" });
  });

  it("updates the slug and every locale's name", async () => {
    mocks.db.newsTag.findUnique.mockResolvedValue({ id: TAG_ID });
    const state = await updateNewsTag(undefined, form({ ...fields, id: TAG_ID }));
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.newsTagTranslation.upsert).toHaveBeenCalledTimes(3);
  });
});
