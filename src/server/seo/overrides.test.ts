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

import { applySeoOverride, getSeoOverride, pageKeyFromPath } from "./overrides";

const MEDIA = "0a1b2c3d-0000-4000-8000-00000000000a";
const INPUT = { scope: "PAGE", refKey: "about", locale: "en" } as const;

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
      scope_refKey_locale: { scope: "PAGE", refKey: "about", locale: "en" },
    });
  });

  it("maps an override and links a public image as the social card", async () => {
    mocks.findUnique.mockResolvedValue({
      title: "  About us  ",
      description: "",
      noIndex: true,
      ogMedia: { id: MEDIA, kind: "IMAGE", visibility: "PUBLIC", width: 1200, height: 630 },
    });
    expect(await getSeoOverride(INPUT)).toEqual({
      title: "About us",
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

describe("pageKeyFromPath", () => {
  it("maps the home path to 'home'", () => {
    expect(pageKeyFromPath("/")).toBe("home");
  });

  it("strips the leading slash for every other path", () => {
    expect(pageKeyFromPath("/about")).toBe("about");
    expect(pageKeyFromPath("/business/international-trading")).toBe(
      "business/international-trading",
    );
  });
});

describe("applySeoOverride", () => {
  const base = {
    title: { absolute: "About | Shaheen Sky" },
    description: "Default description.",
    openGraph: { title: "About | Shaheen Sky", description: "Default description.", images: [] },
    twitter: { title: "About | Shaheen Sky", description: "Default description.", images: [] },
  };

  it("returns the metadata unchanged when there is no override", () => {
    expect(applySeoOverride(base, null)).toBe(base);
  });

  it("replaces the title outright, without re-suffixing the site name", () => {
    const result = applySeoOverride(base, {
      title: "Custom title",
      description: null,
      noIndex: false,
      ogImage: null,
    });
    expect(result.title).toEqual({ absolute: "Custom title" });
    expect(result.title).not.toEqual(
      expect.objectContaining({ absolute: expect.stringContaining("|") }),
    );
  });

  it("merges description, noIndex and the Open Graph image", () => {
    const result = applySeoOverride(base, {
      title: null,
      description: "Override description.",
      noIndex: true,
      ogImage: { url: `/media/${MEDIA}`, width: 1200, height: 630 },
    });
    expect(result.description).toBe("Override description.");
    expect(result.robots).toEqual({ index: false, follow: false });
    expect((result.openGraph as { images: { url: string }[] }).images[0]?.url).toContain(
      `/media/${MEDIA}`,
    );
    expect((result.twitter as { images: { url: string }[] }).images[0]?.url).toContain(
      `/media/${MEDIA}`,
    );
    // The untouched title stays as the page's own default.
    expect(result.title).toEqual(base.title);
  });

  it("clears robots when the override does not ask for noindex", () => {
    const withRobots = { ...base, robots: { index: false, follow: false } };
    const result = applySeoOverride(withRobots, {
      title: null,
      description: null,
      noIndex: false,
      ogImage: null,
    });
    expect(result.robots).toBeUndefined();
  });
});
