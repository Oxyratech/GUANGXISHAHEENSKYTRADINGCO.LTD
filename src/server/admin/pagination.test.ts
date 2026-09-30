import { describe, expect, it } from "vitest";
import { buildPageHref, buildPageMeta, parsePageParams } from "./pagination";

describe("parsePageParams", () => {
  it("defaults to the first page of 20", () => {
    expect(parsePageParams({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it("reads page and pageSize", () => {
    expect(parsePageParams({ page: "3", pageSize: "50" })).toEqual({
      page: 3,
      pageSize: 50,
      skip: 100,
      take: 50,
    });
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parsePageParams({ page: ["2", "9"] }).page).toBe(2);
  });

  it("falls back for junk: zero, negative, fractional, text, signs", () => {
    for (const page of ["0", "-1", "1.5", "abc", "", "+2", "1e3", "  "]) {
      expect(parsePageParams({ page }).page).toBe(1);
    }
    expect(parsePageParams({ pageSize: "abc" }).pageSize).toBe(20);
    expect(parsePageParams({ pageSize: "0" }).pageSize).toBe(20);
  });

  it("caps the page size so one request cannot ask for the whole table", () => {
    expect(parsePageParams({ pageSize: "5000" }).pageSize).toBe(100);
    expect(parsePageParams({ pageSize: "500" }, { maxPageSize: 50 }).pageSize).toBe(50);
  });

  it("honours a custom default, limited by the maximum", () => {
    expect(parsePageParams({}, { defaultPageSize: 10 }).pageSize).toBe(10);
    expect(parsePageParams({}, { defaultPageSize: 200, maxPageSize: 50 }).pageSize).toBe(50);
  });

  it("bounds the page number so skip cannot overflow", () => {
    const { page, skip } = parsePageParams({ page: "999999999" });
    expect(page).toBe(100_000);
    expect(skip).toBe(99_999 * 20);
  });
});

describe("buildPageMeta", () => {
  it("describes a middle page", () => {
    expect(buildPageMeta(95, 2, 20)).toEqual({
      total: 95,
      page: 2,
      pageSize: 20,
      pageCount: 5,
      from: 21,
      to: 40,
      hasPrevious: true,
      hasNext: true,
    });
  });

  it("describes the last, partial page", () => {
    const meta = buildPageMeta(95, 5, 20);
    expect(meta).toMatchObject({ from: 81, to: 95, hasNext: false, hasPrevious: true });
  });

  it("has one page and no rows for an empty result", () => {
    expect(buildPageMeta(0, 1, 20)).toMatchObject({
      total: 0,
      pageCount: 1,
      from: 0,
      to: 0,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it("clamps a page beyond the end back to the last page", () => {
    expect(buildPageMeta(30, 99, 20).page).toBe(2);
  });

  it("survives nonsense input", () => {
    expect(buildPageMeta(-5, 0, 0)).toMatchObject({ total: 0, page: 1, pageSize: 1, pageCount: 1 });
  });
});

describe("buildPageHref", () => {
  it("keeps every other parameter and drops page for page 1", () => {
    expect(buildPageHref("/admin/inquiries", { status: "NEW", page: "4" }, 1)).toBe(
      "/admin/inquiries?status=NEW",
    );
  });

  it("sets page for later pages", () => {
    expect(buildPageHref("/admin/inquiries", { status: "NEW" }, 3)).toBe(
      "/admin/inquiries?status=NEW&page=3",
    );
  });

  it("preserves repeated parameters and skips undefined ones", () => {
    expect(buildPageHref("/admin/x", { tag: ["a", "b"], q: undefined }, 2)).toBe(
      "/admin/x?tag=a&tag=b&page=2",
    );
  });

  it("is just the path when nothing is set", () => {
    expect(buildPageHref("/admin/x", {}, 1)).toBe("/admin/x");
  });

  it("encodes values", () => {
    expect(buildPageHref("/admin/x", { q: "a&b c" }, 2)).toBe("/admin/x?q=a%26b+c&page=2");
  });
});
