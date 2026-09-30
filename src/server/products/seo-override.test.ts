// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getDb: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/logger", () => ({ logger: { warn: mocks.warn, error: mocks.error } }));
vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

import { getSeoOverride } from "./seo-override";

const MEDIA = "0a1b2c3d-0000-4000-8000-00000000000a";
const INPUT = { scope: "PRODUCT", refKey: "steel-bolt", locale: "en" } as const;

beforeEach(() => {
  mocks.findUnique.mockReset().mockResolvedValue(null);
  mocks.warn.mockReset();
  mocks.error.mockReset();
  mocks.getDb.mockReset().mockReturnValue({ seoMetadata: { findUnique: mocks.findUnique } });
  mocks.isDatabaseConfigured.mockReset().mockReturnValue(true);
});

describe("getSeoOverride", () => {
  it("is null when the database is not configured, without connecting", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    expect(await getSeoOverride(INPUT)).toBeNull();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("is null when there is no override row", async () => {
    expect(await getSeoOverride(INPUT)).toBeNull();
    expect(mocks.findUnique.mock.calls[0]?.[0].where).toEqual({
      scope_refKey_locale: { scope: "PRODUCT", refKey: "steel-bolt", locale: "en" },
    });
  });

  it("maps an override and links a public image as the social card", async () => {
    mocks.findUnique.mockResolvedValue({
      title: "  Steel bolt  ",
      description: "",
      noIndex: true,
      ogMedia: { id: MEDIA, kind: "IMAGE", visibility: "PUBLIC", width: 1200, height: 630 },
    });
    expect(await getSeoOverride(INPUT)).toEqual({
      title: "Steel bolt",
      description: null,
      noIndex: true,
      ogImage: { url: `/media/${MEDIA}`, width: 1200, height: 630 },
    });
  });

  it("never uses a private file or a document as the social card", async () => {
    for (const media of [
      { id: MEDIA, kind: "IMAGE", visibility: "PRIVATE", width: 1, height: 1 },
      { id: MEDIA, kind: "DOCUMENT", visibility: "PUBLIC", width: null, height: null },
    ]) {
      mocks.findUnique.mockResolvedValue({
        title: "T",
        description: null,
        noIndex: false,
        ogMedia: media,
      });
      expect((await getSeoOverride(INPUT))?.ogImage).toBeNull();
    }
  });

  it("tolerates an unreachable database: the generated metadata is the fallback", async () => {
    mocks.findUnique.mockRejectedValue(Object.assign(new Error("down"), { code: "ECONNREFUSED" }));
    expect(await getSeoOverride(INPUT)).toBeNull();
    expect(mocks.warn).toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("logs a bug as an error but still does not break the page", async () => {
    mocks.findUnique.mockRejectedValue(new TypeError("boom"));
    expect(await getSeoOverride(INPUT)).toBeNull();
    expect(mocks.error).toHaveBeenCalled();
  });
});
