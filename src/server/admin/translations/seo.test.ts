// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: { seoMetadata: { findMany: vi.fn() } } }));
vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: () => mocks.db,
}));

import { computeSeoOverrideCoverage } from "./seo";

beforeEach(() => {
  mocks.db.seoMetadata.findMany.mockReset();
});

describe("computeSeoOverrideCoverage", () => {
  it("groups rows by scope and refKey, and lists which locales are missing", async () => {
    mocks.db.seoMetadata.findMany.mockResolvedValue([
      { scope: "PAGE", refKey: "about", locale: "en" },
      { scope: "PAGE", refKey: "about", locale: "zh" },
    ]);

    const result = await computeSeoOverrideCoverage();
    expect(result).toEqual([
      { scope: "PAGE", refKey: "about", locales: ["en", "zh"], missingLocales: ["ar"] },
    ]);
  });

  it("is an honest empty list with no overrides", async () => {
    mocks.db.seoMetadata.findMany.mockResolvedValue([]);
    expect(await computeSeoOverrideCoverage()).toEqual([]);
  });
});
