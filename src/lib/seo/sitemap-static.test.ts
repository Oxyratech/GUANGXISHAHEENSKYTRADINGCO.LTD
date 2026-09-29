import { STATIC_PUBLIC_PATHS } from "@/config/routes";
import { CATEGORY_SLUGS } from "@/content/categories";
import { LOCALES } from "@/i18n/locales";
import { buildStaticSitemapEntries } from "./sitemap-static";

const ORIGIN = "https://www.example.test";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildStaticSitemapEntries", () => {
  const entries = () => buildStaticSitemapEntries();
  const urls = () => entries().map((entry) => entry.url);

  it("lists every static public path in every locale", () => {
    for (const path of STATIC_PUBLIC_PATHS) {
      for (const locale of LOCALES) {
        const expected = path === "/" ? `${ORIGIN}/${locale}` : `${ORIGIN}/${locale}${path}`;
        expect(urls()).toContain(expected);
      }
    }
  });

  it("lists every category page in every locale", () => {
    for (const slug of CATEGORY_SLUGS) {
      for (const locale of LOCALES) {
        expect(urls()).toContain(`${ORIGIN}/${locale}/products/${slug}`);
      }
    }
  });

  it("has exactly those pages, once each", () => {
    expect(entries()).toHaveLength(
      (STATIC_PUBLIC_PATHS.length + CATEGORY_SLUGS.length) * LOCALES.length,
    );
    expect(new Set(urls()).size).toBe(entries().length);
  });

  it("never lists admin, API or file routes", () => {
    for (const url of urls()) expect(url).not.toMatch(/\/(?:admin|api|files)(?:\/|$)/);
  });

  it("gives every entry the full hreflang set, x-default included", () => {
    for (const entry of entries()) {
      expect(Object.keys(entry.alternates?.languages ?? {}).sort()).toEqual(
        ["ar", "en", "x-default", "zh-CN"].sort(),
      );
    }
    const about = entries().find((entry) => entry.url === `${ORIGIN}/zh/about`);
    expect(about?.alternates?.languages).toEqual({
      en: `${ORIGIN}/en/about`,
      "zh-CN": `${ORIGIN}/zh/about`,
      ar: `${ORIGIN}/ar/about`,
      "x-default": `${ORIGIN}/en/about`,
    });
  });

  it("carries no lastModified: pages from code have no real modification date", () => {
    for (const entry of entries()) expect(entry).not.toHaveProperty("lastModified");
  });
});
