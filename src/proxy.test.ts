import { config } from "./proxy";

// The real middleware needs the Next runtime; only the exported matcher is under test.
vi.mock("next-intl/middleware", () => ({ default: () => () => undefined }));

// Next compiles each matcher entry into an anchored regular expression; the entry is a regex body.
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher", () => {
  it.each(["/", "/en", "/zh/about", "/ar/products/consumer-goods", "/about", "/contact/"])(
    "runs locale negotiation for the page path %s",
    (path) => {
      expect(matcher.test(path)).toBe(true);
    },
  );

  it.each([
    "/api/health",
    "/admin/login",
    "/media/abc",
    "/files/abc",
    "/apple-icon",
    "/_next/static/chunk.js",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/documents/business-license.png",
  ])("leaves %s alone", (path) => {
    expect(matcher.test(path)).toBe(false);
  });
});
