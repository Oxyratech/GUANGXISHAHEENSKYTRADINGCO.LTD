import {
  absoluteUrl,
  alternatesFor,
  alternatesForPaths,
  isHomePath,
  localizedPath,
  localizedUrl,
} from "./urls";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("localizedPath", () => {
  it("prefixes every locale, and the home page has no trailing slash", () => {
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("zh", "/")).toBe("/zh");
    expect(localizedPath("ar", "/about")).toBe("/ar/about");
    expect(localizedPath("en", "/products/consumer-goods")).toBe("/en/products/consumer-goods");
  });

  it("normalises slashes, queries and fragments so canonicals are stable", () => {
    expect(localizedPath("en", "about")).toBe("/en/about");
    expect(localizedPath("en", "/about/")).toBe("/en/about");
    expect(localizedPath("en", "//about//team/")).toBe("/en/about/team");
    expect(localizedPath("en", "/about?utm_source=x#top")).toBe("/en/about");
    expect(localizedPath("en", "")).toBe("/en");
  });
});

describe("isHomePath", () => {
  it("recognises the home page however it is spelled", () => {
    expect(isHomePath("/")).toBe(true);
    expect(isHomePath("")).toBe(true);
    expect(isHomePath("/?ref=x")).toBe(true);
    expect(isHomePath("/about")).toBe(false);
  });
});

describe("absoluteUrl / localizedUrl", () => {
  it("builds absolute URLs on the configured origin", () => {
    expect(localizedUrl("en", "/about")).toBe("https://www.example.test/en/about");
    expect(localizedUrl("zh", "/")).toBe("https://www.example.test/zh");
    expect(absoluteUrl("/sitemap.xml")).toBe("https://www.example.test/sitemap.xml");
    expect(absoluteUrl("/")).toBe("https://www.example.test/");
  });

  it("keeps a base path from the site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.test/portal/");
    expect(localizedUrl("ar", "/faq")).toBe("https://www.example.test/portal/ar/faq");
    expect(absoluteUrl("/sitemap.xml")).toBe("https://www.example.test/portal/sitemap.xml");
  });

  it("falls back to localhost while no domain is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(localizedUrl("en", "/about")).toBe("http://localhost:3000/en/about");
  });
});

describe("alternatesFor", () => {
  it("lists every locale with its hreflang code, plus x-default for the default locale", () => {
    expect(alternatesFor("/about")).toEqual({
      en: "https://www.example.test/en/about",
      "zh-CN": "https://www.example.test/zh/about",
      ar: "https://www.example.test/ar/about",
      "x-default": "https://www.example.test/en/about",
    });
  });

  it("handles the home page", () => {
    expect(alternatesFor("/")).toEqual({
      en: "https://www.example.test/en",
      "zh-CN": "https://www.example.test/zh",
      ar: "https://www.example.test/ar",
      "x-default": "https://www.example.test/en",
    });
  });
});

describe("alternatesForPaths", () => {
  it("supports a different pathname per locale", () => {
    expect(
      alternatesForPaths({ en: "/news/new-year-greeting", zh: "/news/xin-nian-wen-hou" }),
    ).toEqual({
      en: "https://www.example.test/en/news/new-year-greeting",
      "zh-CN": "https://www.example.test/zh/news/xin-nian-wen-hou",
      "x-default": "https://www.example.test/en/news/new-year-greeting",
    });
  });

  it("points x-default at the first available locale when the default locale has no version", () => {
    expect(alternatesForPaths({ ar: "/news/a", zh: "/news/z" })).toEqual({
      "zh-CN": "https://www.example.test/zh/news/z",
      ar: "https://www.example.test/ar/news/a",
      "x-default": "https://www.example.test/zh/news/z",
    });
  });

  it("is empty when no locale has a version", () => {
    expect(alternatesForPaths({})).toEqual({});
  });
});
