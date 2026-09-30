// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { newsTag: { findMany: vi.fn(), create: vi.fn() } },
}));
vi.mock("@/server/db", () => ({ getDb: () => mocks.db }));

import { resolveTagIdsByNames } from "./resolve";

beforeEach(() => {
  mocks.db.newsTag.findMany.mockReset().mockResolvedValue([]);
  mocks.db.newsTag.create.mockReset().mockImplementation(({ data }: { data: { slug: string } }) =>
    Promise.resolve({ id: `id-${data.slug}` }),
  );
});

describe("resolveTagIdsByNames", () => {
  it("is empty for no names", async () => {
    expect(await resolveTagIdsByNames([])).toEqual([]);
    expect(mocks.db.newsTag.findMany).not.toHaveBeenCalled();
  });

  it("reuses an existing tag matched by slug instead of creating a duplicate", async () => {
    mocks.db.newsTag.findMany.mockResolvedValue([{ id: "existing-1", slug: "trade-fairs" }]);
    const ids = await resolveTagIdsByNames(["Trade Fairs"]);
    expect(ids).toEqual(["existing-1"]);
    expect(mocks.db.newsTag.create).not.toHaveBeenCalled();
  });

  it("creates a new tag, in every locale, for a name with no match", async () => {
    const ids = await resolveTagIdsByNames(["Canton Fair"]);
    expect(ids).toEqual(["id-canton-fair"]);
    expect(mocks.db.newsTag.create).toHaveBeenCalledWith({
      data: {
        slug: "canton-fair",
        translations: {
          create: [
            { locale: "en", name: "Canton Fair" },
            { locale: "zh", name: "Canton Fair" },
            { locale: "ar", name: "Canton Fair" },
          ],
        },
      },
      select: { id: true },
    });
  });

  it("de-duplicates names that slugify to the same tag", async () => {
    const ids = await resolveTagIdsByNames(["Trade Fair", "trade fair", "  Trade Fair  "]);
    expect(ids).toHaveLength(1);
    expect(mocks.db.newsTag.create).toHaveBeenCalledTimes(1);
  });

  it("ignores blank entries", async () => {
    expect(await resolveTagIdsByNames(["", "   "])).toEqual([]);
  });
});
