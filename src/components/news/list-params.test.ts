import { newsArticlePath, newsListHref } from "./hrefs";
import { parseArticleSlug, parseNewsListParams } from "./list-params";

describe("parseNewsListParams", () => {
  it("defaults to the first page with no filters", () => {
    expect(parseNewsListParams({})).toEqual({ page: 1 });
  });

  it("reads page, category and tag", () => {
    expect(parseNewsListParams({ page: "3", category: "company-news", tag: "logistics" })).toEqual({
      page: 3,
      category: "company-news",
      tag: "logistics",
    });
  });

  it("takes the first of a repeated parameter", () => {
    expect(parseNewsListParams({ page: ["2", "9"], category: ["a", "b"] })).toEqual({
      page: 2,
      category: "a",
    });
  });

  it.each(["0", "-1", "abc", "1.5", "2e3", "", " ", "99999999999"])(
    "treats page=%j as the first page",
    (page) => {
      expect(parseNewsListParams({ page }).page).toBe(1);
    },
  );

  it("accepts leading zeros and caps an absurd page number", () => {
    expect(parseNewsListParams({ page: "007" }).page).toBe(7);
    expect(parseNewsListParams({ page: "99999" }).page).toBe(10_000);
  });

  it.each([
    "a b",
    "a/b",
    "../etc",
    "a;b",
    "<script>",
    "'; DROP TABLE x;--",
    "-leading",
    "x".repeat(81),
  ])("drops the invalid slug %j", (value) => {
    expect(parseNewsListParams({ category: value, tag: value })).toEqual({ page: 1 });
  });

  it("accepts slugs in Chinese and Arabic", () => {
    expect(parseNewsListParams({ category: "公司动态", tag: "الشحن" })).toEqual({
      page: 1,
      category: "公司动态",
      tag: "الشحن",
    });
  });
});

describe("parseArticleSlug", () => {
  it("accepts ordinary slugs", () => {
    expect(parseArticleSlug("new-year-notice-2027")).toBe("new-year-notice-2027");
  });

  it("decodes a percent-encoded Chinese or Arabic slug", () => {
    expect(parseArticleSlug(encodeURIComponent("公司动态-2026"))).toBe("公司动态-2026");
    expect(parseArticleSlug(encodeURIComponent("أخبار-الشركة"))).toBe("أخبار-الشركة");
  });

  it.each(["%E0%A4%A", "a b", "a/b", "..", "%2e%2e%2f", "<b>", "-x", "", "x".repeat(161)])(
    "rejects %j",
    (segment) => {
      expect(parseArticleSlug(segment)).toBeUndefined();
    },
  );

  it("accepts the longest slug the schema allows", () => {
    expect(parseArticleSlug("x".repeat(160))).toBe("x".repeat(160));
  });
});

describe("newsListHref", () => {
  it("has one address for the unfiltered first page", () => {
    expect(newsListHref()).toBe("/news");
    expect(newsListHref({ page: 1 })).toBe("/news");
  });

  it("carries filters and the page", () => {
    expect(newsListHref({ category: "updates", tag: "logistics", page: 2 })).toBe(
      "/news?category=updates&tag=logistics&page=2",
    );
  });

  it("encodes values", () => {
    expect(newsListHref({ tag: "公司" })).toBe(`/news?tag=${encodeURIComponent("公司")}`);
  });
});

describe("newsArticlePath", () => {
  it("encodes non-ASCII slugs", () => {
    expect(newsArticlePath("hello-world")).toBe("/news/hello-world");
    expect(newsArticlePath("公司动态")).toBe(`/news/${encodeURIComponent("公司动态")}`);
  });
});
