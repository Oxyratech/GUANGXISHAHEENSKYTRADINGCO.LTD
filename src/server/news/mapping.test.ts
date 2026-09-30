// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ImageRow, SeoRow, SummaryRow } from "./select";
import { localizedName, toAlternates, toImage, toSeo, toSummary } from "./mapping";

const ID = "3F2504E0-4F89-41D3-9A0C-0305E82C3301";

function image(overrides: Partial<ImageRow> = {}): ImageRow {
  return {
    id: ID,
    kind: "IMAGE",
    visibility: "PUBLIC",
    width: 1600,
    height: 900,
    translations: [],
    ...overrides,
  };
}

function row(overrides: Partial<SummaryRow> = {}): SummaryRow {
  return {
    id: "row-1",
    slug: "first-article",
    title: "First article",
    summary: "Summary text",
    publishedAt: new Date("2026-09-01T08:00:00.000Z"),
    createdAt: new Date("2026-08-30T08:00:00.000Z"),
    authorName: "Editorial team",
    category: null,
    tags: [],
    cover: null,
    ...overrides,
  };
}

describe("localizedName", () => {
  const entity = {
    slug: "company-updates",
    translations: [
      { locale: "zh", name: "公司动态" },
      { locale: "en", name: "Company updates" },
    ],
  };

  it("uses the reader's language when it exists", () => {
    expect(localizedName(entity, "zh")).toEqual({ slug: "company-updates", name: "公司动态" });
  });

  it("falls back to English", () => {
    expect(localizedName(entity, "ar").name).toBe("Company updates");
  });

  it("falls back to the first language alphabetically when English is missing", () => {
    const named = {
      slug: "x",
      translations: [
        { locale: "zh", name: "中文" },
        { locale: "ar", name: "عربي" },
      ],
    };
    expect(localizedName(named, "en").name).toBe("عربي");
  });

  it("falls back to the slug rather than showing an empty label", () => {
    expect(localizedName({ slug: "misc", translations: [] }, "en").name).toBe("misc");
    expect(
      localizedName({ slug: "misc", translations: [{ locale: "en", name: "  " }] }, "en").name,
    ).toBe("misc");
  });
});

describe("toImage", () => {
  it("exposes a public image at its /media address, lower-cased", () => {
    expect(toImage(image(), "en")).toEqual({
      src: `/media/${ID.toLowerCase()}`,
      width: 1600,
      height: 900,
      alt: null,
    });
  });

  it("never exposes a private asset or a document", () => {
    expect(toImage(image({ visibility: "PRIVATE" }), "en")).toBeNull();
    expect(toImage(image({ kind: "DOCUMENT" }), "en")).toBeNull();
    expect(toImage(null, "en")).toBeNull();
  });

  it("uses the alt text of the reader's language, then English", () => {
    const translations = [
      { locale: "en", altText: "Container ship" },
      { locale: "zh", altText: "集装箱船" },
    ];
    expect(toImage(image({ translations }), "zh")?.alt).toBe("集装箱船");
    expect(toImage(image({ translations }), "ar")?.alt).toBe("Container ship");
  });

  it("treats a blank alt text as none", () => {
    expect(
      toImage(image({ translations: [{ locale: "en", altText: "   " }] }), "en")?.alt,
    ).toBeNull();
  });
});

describe("toSummary", () => {
  it("maps public columns, with the date as an ISO string", () => {
    expect(toSummary(row(), "en")).toEqual({
      slug: "first-article",
      title: "First article",
      summary: "Summary text",
      publishedAt: "2026-09-01T08:00:00.000Z",
      authorName: "Editorial team",
      category: null,
      tags: [],
      cover: null,
    });
  });

  it("dates a published row without a publication date by its creation date", () => {
    expect(toSummary(row({ publishedAt: null }), "en").publishedAt).toBe(
      "2026-08-30T08:00:00.000Z",
    );
  });

  it("has no byline when the editor left it blank; it never reaches for the user account", () => {
    expect(toSummary(row({ authorName: "  " }), "en").authorName).toBeNull();
    expect(toSummary(row({ authorName: null }), "en").authorName).toBeNull();
  });

  it("localises the category and sorts the tags by their localised names", () => {
    const named = (slug: string, en: string, zh?: string) => ({
      slug,
      translations: [{ locale: "en", name: en }, ...(zh ? [{ locale: "zh", name: zh }] : [])],
    });
    const result = toSummary(
      row({
        category: named("updates", "Updates", "动态"),
        tags: [{ tag: named("b", "Beta") }, { tag: named("a", "Alpha") }],
      }),
      "zh",
    );
    expect(result.category).toEqual({ slug: "updates", name: "动态" });
    expect(result.tags.map((tag) => tag.name)).toEqual(["Alpha", "Beta"]);
  });

  it("carries a public cover only", () => {
    expect(toSummary(row({ cover: image() }), "en").cover?.src).toBe(`/media/${ID.toLowerCase()}`);
    expect(toSummary(row({ cover: image({ visibility: "PRIVATE" }) }), "en").cover).toBeNull();
  });
});

describe("toSeo", () => {
  const seo = (overrides: Partial<SeoRow> = {}): SeoRow => ({
    title: null,
    description: null,
    noIndex: false,
    ogMedia: null,
    ...overrides,
  });

  it("is null without an override, or when the override changes nothing", () => {
    expect(toSeo(null, "en")).toBeNull();
    expect(toSeo(seo({ title: "  ", description: "" }), "en")).toBeNull();
  });

  it("keeps the fields the editor set", () => {
    expect(toSeo(seo({ title: "SEO title", noIndex: true, ogMedia: image() }), "en")).toMatchObject(
      {
        title: "SEO title",
        description: null,
        noIndex: true,
        image: { src: `/media/${ID.toLowerCase()}` },
      },
    );
  });

  it("ignores a private share image", () => {
    expect(
      toSeo(seo({ title: "T", ogMedia: image({ visibility: "PRIVATE" }) }), "en")?.image,
    ).toBeNull();
  });
});

describe("toAlternates", () => {
  it("maps each served language to its slug", () => {
    expect(
      toAlternates([
        { locale: "en", slug: "hello" },
        { locale: "zh", slug: "ni-hao" },
      ]),
    ).toEqual({ en: "hello", zh: "ni-hao" });
  });

  it("ignores languages the site does not serve, and keeps the first of a duplicate", () => {
    expect(
      toAlternates([
        { locale: "fr", slug: "bonjour" },
        { locale: "en", slug: "first" },
        { locale: "en", slug: "second" },
      ]),
    ).toEqual({ en: "first" });
  });
});
