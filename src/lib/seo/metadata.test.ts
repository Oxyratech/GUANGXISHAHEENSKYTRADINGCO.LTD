import type { Metadata } from "next";
import { COMPANY } from "@/config/company";
import { LOCALE_META, LOCALES, type Locale } from "@/i18n/locales";
import { COMPANY_DISPLAY_NAME, DEFAULT_OG_IMAGE_ALT } from "./constants";
import { buildMetadata, formatTitle } from "./metadata";
import { ogImageUrl } from "./og-image";

const ORIGIN = "https://www.example.test";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const base = { path: "/about", title: "About Us", description: "Who we are." };
const titleOf = (m: Metadata) => (m.title as { absolute: string }).absolute;

describe("buildMetadata: canonical and hreflang", () => {
  it.each(LOCALES)("has an absolute, locale-prefixed canonical for %s", (locale) => {
    expect(buildMetadata({ ...base, locale }).alternates?.canonical).toBe(
      `${ORIGIN}/${locale}/about`,
    );
  });

  it.each(LOCALES)("lists en, zh-CN, ar and x-default (default locale) from %s", (locale) => {
    expect(buildMetadata({ ...base, locale }).alternates?.languages).toEqual({
      en: `${ORIGIN}/en/about`,
      "zh-CN": `${ORIGIN}/zh/about`,
      ar: `${ORIGIN}/ar/about`,
      "x-default": `${ORIGIN}/en/about`,
    });
  });

  it("uses the bare locale root for the home page", () => {
    const metadata = buildMetadata({ ...base, locale: "zh", path: "/" });
    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/zh`);
    expect(metadata.alternates?.languages).toMatchObject({ "x-default": `${ORIGIN}/en` });
  });

  it("only advertises the locales an article exists in, each under its own slug", () => {
    const metadata = buildMetadata({
      locale: "zh",
      path: "/news/zh-slug",
      title: "T",
      description: "D",
      alternatePaths: { en: "/news/en-slug", zh: "/news/zh-slug" },
    });
    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/zh/news/zh-slug`);
    expect(metadata.alternates?.languages).toEqual({
      en: `${ORIGIN}/en/news/en-slug`,
      "zh-CN": `${ORIGIN}/zh/news/zh-slug`,
      "x-default": `${ORIGIN}/en/news/en-slug`,
    });
    expect(metadata.openGraph?.alternateLocale).toEqual([LOCALE_META.en.ogLocale]);
  });
});

describe("buildMetadata: Open Graph and Twitter", () => {
  it.each(LOCALES)("describes the page for %s", (locale) => {
    const og = buildMetadata({ ...base, locale }).openGraph;
    expect(og).toMatchObject({
      type: "website",
      title: "About Us | Shaheen Sky",
      description: "Who we are.",
      url: `${ORIGIN}/${locale}/about`,
      siteName: "Shaheen Sky",
      locale: LOCALE_META[locale].ogLocale,
    });
    const others = (LOCALES as readonly Locale[])
      .filter((other) => other !== locale)
      .map((other) => LOCALE_META[other].ogLocale);
    expect(og?.alternateLocale).toEqual(others);
  });

  it("uses the generated brand card, with dimensions and alt text, by default", () => {
    const og = buildMetadata({ ...base, locale: "ar" }).openGraph;
    expect(og?.images).toEqual([
      { url: ogImageUrl("ar"), alt: DEFAULT_OG_IMAGE_ALT, width: 1200, height: 630 },
    ]);
  });

  it("accepts a custom image; relative URLs become absolute", () => {
    const relative = buildMetadata({
      ...base,
      locale: "en",
      image: { url: "/media/abc", alt: "A product", width: 800, height: 600 },
    });
    expect(relative.openGraph?.images).toEqual([
      { url: `${ORIGIN}/media/abc`, alt: "A product", width: 800, height: 600 },
    ]);

    const absolute = buildMetadata({
      ...base,
      locale: "en",
      image: { url: "https://cdn.example.test/x.png", alt: "X" },
    });
    expect(absolute.openGraph?.images).toEqual([
      { url: "https://cdn.example.test/x.png", alt: "X" },
    ]);
  });

  it("emits a large-image Twitter card that mirrors the page", () => {
    const twitter = buildMetadata({ ...base, locale: "en" }).twitter;
    expect(twitter).toMatchObject({
      card: "summary_large_image",
      title: "About Us | Shaheen Sky",
      description: "Who we are.",
      images: [{ url: ogImageUrl("en"), alt: DEFAULT_OG_IMAGE_ALT }],
    });
  });

  it("adds article timestamps only for articles, as ISO strings", () => {
    const article = buildMetadata({
      ...base,
      locale: "en",
      type: "article",
      publishedTime: new Date("2026-07-01T08:00:00Z"),
      modifiedTime: "2026-07-02T09:30:00.000Z",
    }).openGraph;
    expect(article).toMatchObject({
      type: "article",
      publishedTime: "2026-07-01T08:00:00.000Z",
      modifiedTime: "2026-07-02T09:30:00.000Z",
    });

    const website = buildMetadata({
      ...base,
      locale: "en",
      publishedTime: "2026-07-01T08:00:00.000Z",
    }).openGraph;
    expect(website).not.toHaveProperty("publishedTime");
  });
});

describe("titles", () => {
  it("appends the site name to inner pages", () => {
    expect(titleOf(buildMetadata({ ...base, locale: "en" }))).toBe("About Us | Shaheen Sky");
  });

  it("does not repeat the site name when the title already has it", () => {
    expect(formatTitle("About Shaheen Sky", "/about", "en")).toBe("About Shaheen Sky");
  });

  it("collapses stray whitespace", () => {
    expect(formatTitle("  About \n  Us ", "/about", "en")).toBe("About Us | Shaheen Sky");
    const metadata = buildMetadata({ ...base, locale: "en", description: "  Who \n we   are. " });
    expect(metadata.description).toBe("Who we are.");
  });

  it("identifies the home page by the full company name, without the short suffix", () => {
    expect(COMPANY_DISPLAY_NAME).toBe("Guangxi Shaheen Sky Trading Co., Ltd.");
    expect(formatTitle("International trading and sourcing", "/", "en")).toBe(
      `${COMPANY_DISPLAY_NAME} | International trading and sourcing`,
    );
    expect(formatTitle("", "/", "ar")).toBe(COMPANY_DISPLAY_NAME);
    const home = buildMetadata({ ...base, locale: "en", path: "/", title: "Trade" });
    expect(titleOf(home)).not.toContain("| Shaheen Sky");
  });

  it("does not double the company name when the home title already carries it", () => {
    const already = `${COMPANY_DISPLAY_NAME} | Trading`;
    expect(formatTitle(already, "/", "en")).toBe(already);
    const chinese = `${COMPANY.legalNameZh} | 国际贸易`;
    expect(formatTitle(chinese, "/", "zh")).toBe(chinese);
  });

  it("names the company in Chinese on the Chinese home page", () => {
    expect(formatTitle("国际贸易", "/", "zh")).toBe(`${COMPANY.legalNameZh} | 国际贸易`);
  });
});

describe("robots", () => {
  it("leaves robots alone so the layout's noindex for an unconfigured domain still applies", () => {
    expect(buildMetadata({ ...base, locale: "en" })).not.toHaveProperty("robots");
  });

  it("marks noIndex pages as neither indexable nor followable", () => {
    expect(buildMetadata({ ...base, locale: "en", noIndex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
