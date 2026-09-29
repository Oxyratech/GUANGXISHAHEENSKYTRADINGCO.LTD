import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap, { revalidate } from "@/app/sitemap";
import { COMPANY } from "@/config/company";
import { SITE } from "@/config/site";
import { getDynamicSitemapEntries } from "./sitemap-dynamic";

vi.mock("./sitemap-dynamic", () => ({ getDynamicSitemapEntries: vi.fn() }));

const ORIGIN = "https://www.example.test";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
  vi.mocked(getDynamicSitemapEntries).mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("sitemap.ts", () => {
  it("combines the static pages with the database-backed entries", async () => {
    const dynamicEntry = {
      url: `${ORIGIN}/en/news/opening`,
      lastModified: new Date("2026-08-01T00:00:00.000Z"),
    };
    vi.mocked(getDynamicSitemapEntries).mockResolvedValue([dynamicEntry]);

    const entries = await sitemap();
    expect(entries).toContainEqual(dynamicEntry);
    expect(entries.map((e) => e.url)).toEqual(
      expect.arrayContaining([`${ORIGIN}/en`, `${ORIGIN}/ar/faq`, `${ORIGIN}/zh/about`]),
    );
  });

  it("still serves every static page when the database contributes nothing", async () => {
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.url.startsWith(ORIGIN))).toBe(true);
  });

  it("is regenerated periodically, so a build without a database heals itself", () => {
    expect(revalidate).toBe(3600);
  });
});

describe("robots.ts", () => {
  it("allows the public site, keeps admin, API and private files out, and points at the sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/files"] },
      sitemap: `${ORIGIN}/sitemap.xml`,
    });
  });

  it("disallows everything, and advertises no sitemap, while no domain is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});

describe("manifest.ts", () => {
  it("names the site and uses the brand colours", () => {
    expect(manifest()).toMatchObject({
      name: "Guangxi Shaheen Sky Trading Co., Ltd.",
      short_name: SITE.name,
      theme_color: SITE.themeColor,
      start_url: "/en",
      display: "browser",
    });
  });

  it("describes the company only with facts from the license", () => {
    const { description } = manifest();
    expect(description).toContain(COMPANY.location.cityEn);
    expect(description).toContain(COMPANY.location.regionEn);
    expect(description).not.toMatch(/leading|trusted|best|years|global network/i);
  });

  it("references icons that the app actually serves", () => {
    const sources = (manifest().icons ?? []).map((icon) => icon.src);
    expect(sources).toEqual(["/icon.svg", "/apple-icon"]);
    expect(existsSync(join(process.cwd(), "src/app/icon.svg"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/app/apple-icon.tsx"))).toBe(true);
  });
});
