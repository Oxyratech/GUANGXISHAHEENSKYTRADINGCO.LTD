// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  pickTranslation,
  textOrNull,
  toProductDetail,
  toProductSummaries,
  toProductSummary,
  translatedLocalesOf,
  translationLocales,
  type ProductDetailRow,
  type ProductListRow,
} from "./mappers";

const IMAGE_A = "0a1b2c3d-0000-4000-8000-00000000000a";
const IMAGE_B = "0a1b2c3d-0000-4000-8000-00000000000b";
const DOC = "0a1b2c3d-0000-4000-8000-0000000000d1";

function image(id: string, alts: { locale: string; altText: string | null }[] = []) {
  return { mediaAssetId: id, mediaAsset: { width: 800, height: 600, translations: alts } };
}

function listRow(overrides: Partial<ProductListRow> = {}): ProductListRow {
  return {
    slug: "steel-bolt",
    categorySlug: "hardware-products",
    translations: [
      { locale: "en", name: "Steel bolt", shortDescription: "A bolt." },
      { locale: "zh", name: "钢制螺栓", shortDescription: "螺栓。" },
    ],
    images: [],
    ...overrides,
  };
}

function detailRow(overrides: Partial<ProductDetailRow> = {}): ProductDetailRow {
  return {
    slug: "steel-bolt",
    categorySlug: "hardware-products",
    origin: null,
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-02T00:00:00.000Z"),
    translations: [
      {
        locale: "en",
        name: "Steel bolt",
        shortDescription: "A bolt.",
        description: "Long text.",
        applications: "Fastening.",
        packagingInfo: "Boxed.",
      },
    ],
    images: [],
    specifications: [],
    documents: [],
    ...overrides,
  };
}

describe("locale fallback", () => {
  it("prefers the requested locale, then English", () => {
    expect(translationLocales("ar")).toEqual(["ar", "en"]);
    expect(translationLocales("en")).toEqual(["en"]);
    const rows = [{ locale: "en" }, { locale: "zh" }];
    expect(pickTranslation(rows, "zh")).toEqual({ row: rows[1], locale: "zh" });
    expect(pickTranslation(rows, "ar")).toEqual({ row: rows[0], locale: "en" });
    expect(pickTranslation([{ locale: "zh" }], "ar")).toBeUndefined();
  });

  it("reports which locales have their own translation, in site order", () => {
    expect(translatedLocalesOf([{ locale: "ar" }, { locale: "en" }, { locale: "xx" }])).toEqual([
      "en",
      "ar",
    ]);
  });

  it("shows the requested language and says so", () => {
    const summary = toProductSummary(listRow(), "zh");
    expect(summary).toMatchObject({ name: "钢制螺栓", contentLocale: "zh" });
  });

  it("falls back to English and reports the language of the text", () => {
    const summary = toProductSummary(listRow(), "ar");
    expect(summary).toMatchObject({ name: "Steel bolt", contentLocale: "en" });
  });

  it("omits a product that has neither the locale nor English", () => {
    const zhOnly = listRow({
      translations: [{ locale: "zh", name: "钢制螺栓", shortDescription: null }],
    });
    expect(toProductSummary(zhOnly, "ar")).toBeNull();
    expect(toProductSummary(zhOnly, "en")).toBeNull();
    expect(toProductSummaries([zhOnly, listRow()], "ar")).toHaveLength(1);
  });

  it("omits a product whose category is not one of the registered categories", () => {
    expect(toProductSummary(listRow({ categorySlug: "made-up" }), "en")).toBeNull();
  });
});

describe("summary", () => {
  it("exposes only public fields", () => {
    const summary = toProductSummary(listRow({ images: [image(IMAGE_A)] }), "en");
    expect(Object.keys(summary ?? {}).sort()).toEqual([
      "categorySlug",
      "contentLocale",
      "image",
      "name",
      "shortDescription",
      "slug",
    ]);
  });

  it("uses the first image (the query sorts the primary one first) and links the public media route", () => {
    const summary = toProductSummary(listRow({ images: [image(IMAGE_B), image(IMAGE_A)] }), "en");
    expect(summary?.image?.src).toBe(`/media/${IMAGE_B}`);
  });

  it("has no image when there is none", () => {
    expect(toProductSummary(listRow(), "en")?.image).toBeNull();
  });

  it("takes alt text from the image's translation, falling back to English and then to the name", () => {
    const alts = [
      { locale: "en", altText: "Bolt on a bench" },
      { locale: "zh", altText: "工作台上的螺栓" },
    ];
    const withAlts = (locale: "zh" | "ar" | "en") =>
      toProductSummary(listRow({ images: [image(IMAGE_A, alts)] }), locale)?.image?.alt;
    expect(withAlts("zh")).toBe("工作台上的螺栓");
    expect(withAlts("ar")).toBe("Bolt on a bench");
    expect(
      toProductSummary(
        listRow({ images: [image(IMAGE_A, [{ locale: "en", altText: "  " }])] }),
        "en",
      )?.image?.alt,
    ).toBe("Steel bolt");
    expect(toProductSummary(listRow({ images: [image(IMAGE_A)] }), "zh")?.image?.alt).toBe(
      "钢制螺栓",
    );
  });

  it("turns blank descriptions into null", () => {
    const row = listRow({
      translations: [{ locale: "en", name: "Bolt", shortDescription: "   " }],
    });
    expect(toProductSummary(row, "en")?.shortDescription).toBeNull();
    expect(textOrNull("  x  ")).toBe("x");
    expect(textOrNull(undefined)).toBeNull();
  });
});

describe("detail", () => {
  it("maps text, dates and the locales that have their own translation", () => {
    const detail = toProductDetail(
      detailRow({
        origin: " Guangxi ",
        translations: [
          ...detailRow().translations,
          {
            locale: "ar",
            name: "مسمار فولاذي",
            shortDescription: null,
            description: null,
            applications: null,
            packagingInfo: null,
          },
        ],
      }),
      [],
      "en",
    );
    expect(detail).toMatchObject({
      origin: "Guangxi",
      description: "Long text.",
      applications: "Fastening.",
      packagingInfo: "Boxed.",
      translatedLocales: ["en", "ar"],
      publishedAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-02T00:00:00.000Z",
    });
  });

  it("is plain JSON: it survives the cache's serialisation unchanged", () => {
    const detail = toProductDetail(
      detailRow({ images: [image(IMAGE_A)], publishedAt: null }),
      [],
      "en",
    );
    expect(JSON.parse(JSON.stringify(detail))).toEqual(detail);
  });

  it("keeps the images in the order the query gave them, primary first", () => {
    const detail = toProductDetail(
      detailRow({ images: [image(IMAGE_B), image(IMAGE_A)] }),
      [],
      "en",
    );
    expect(detail?.images.map((entry) => entry.src)).toEqual([
      `/media/${IMAGE_B}`,
      `/media/${IMAGE_A}`,
    ]);
    expect(detail?.image?.src).toBe(`/media/${IMAGE_B}`);
  });

  it("orders specifications as given, falls back per row and skips rows without a usable text", () => {
    const detail = toProductDetail(
      detailRow({
        specifications: [
          { translations: [{ locale: "en", label: "Length", value: "40 mm" }] },
          { translations: [{ locale: "zh", label: "材质", value: "碳钢" }] },
          { translations: [{ locale: "en", label: "Thread", value: " " }] },
          { translations: [{ locale: "ar", label: "اللون", value: "فضي" }] },
        ],
      }),
      [],
      "zh",
    );
    expect(detail?.specifications).toEqual([
      { label: "Length", value: "40 mm", contentLocale: "en" },
      { label: "材质", value: "碳钢", contentLocale: "zh" },
    ]);
  });

  it("maps documents to public media links with a translated title and a known kind", () => {
    const detail = toProductDetail(
      detailRow({
        documents: [
          {
            kind: "SPECIFICATION_SHEET",
            mediaAssetId: DOC,
            mediaAsset: { fileName: "bolt-spec.pdf", mimeType: "application/pdf", sizeBytes: 2048 },
            translations: [{ locale: "en", title: "Bolt specification" }],
          },
          {
            kind: "SOMETHING_NEW",
            mediaAssetId: IMAGE_A,
            mediaAsset: { fileName: "sheet.pdf", mimeType: "application/pdf", sizeBytes: 10 },
            translations: [],
          },
        ],
      }),
      [],
      "ar",
    );
    expect(detail?.documents).toEqual([
      {
        kind: "SPECIFICATION_SHEET",
        title: "Bolt specification",
        contentLocale: "en",
        href: `/media/${DOC}`,
        fileName: "bolt-spec.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
      },
      {
        kind: "OTHER",
        title: "sheet.pdf",
        contentLocale: "ar",
        href: `/media/${IMAGE_A}`,
        fileName: "sheet.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
      },
    ]);
  });

  it("is null when the product has no translation this locale can show", () => {
    const row = detailRow({
      translations: [
        {
          locale: "zh",
          name: "钢制螺栓",
          shortDescription: null,
          description: null,
          applications: null,
          packagingInfo: null,
        },
      ],
    });
    expect(toProductDetail(row, [], "ar")).toBeNull();
  });

  it("passes related products through", () => {
    const related = toProductSummaries([listRow({ slug: "washer" })], "en");
    expect(toProductDetail(detailRow(), related, "en")?.related.map((r) => r.slug)).toEqual([
      "washer",
    ]);
  });
});
